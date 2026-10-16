import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ConsentimientoMenor, Alumno, Usuario, Entrenador
from app.schemas import (
    ConsentimientoInfoResponse,
    AutorizarConsentimientoRequest,
    ReenviarSolicitudRequest,
)
from app.utils.auth import get_current_user
from app.services.email_service import (
    send_parental_consent_request_email,
    send_parental_consent_confirmation_email,
)

router = APIRouter(
    prefix="/api/v1/tutores",
    tags=["Portal de Tutores y Consentimiento Parental"]
)

@router.get("/info-autorizacion", response_model=ConsentimientoInfoResponse)
def obtener_info_autorizacion(
    token: str = Query(..., description="Token único de autorización parental"),
    db: Session = Depends(get_db)
):
    """
    Valida token y vigencia. Retorna nombre del menor, entrenador/box y versión de política.
    """
    consentimiento = db.query(ConsentimientoMenor).filter(
        ConsentimientoMenor.token_autorizacion == token
    ).first()

    if not consentimiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud de autorización no encontrada o enlace inválido."
        )

    is_expired = consentimiento.fecha_expiracion < datetime.utcnow()

    alumno = db.query(Alumno).filter(Alumno.id_usuario == consentimiento.id_alumno).first()
    nombre_alumno = "Alumno"
    nombre_entrenador = "Entrenador Syncro"

    if alumno and alumno.usuario:
        u = alumno.usuario
        nombre_alumno = f"{getattr(u, 'nombre', '') or ''} {getattr(u, 'apellido', '') or ''}".strip()
        if not nombre_alumno:
            nombre_alumno = u.email.split("@")[0]

    if alumno and alumno.entrenador and alumno.entrenador.usuario:
        cu = alumno.entrenador.usuario
        nombre_entrenador = f"{getattr(cu, 'nombre', '') or ''} {getattr(cu, 'apellido', '') or ''}".strip()
        if not nombre_entrenador:
            nombre_entrenador = cu.email.split("@")[0]

    return ConsentimientoInfoResponse(
        token=token,
        nombre_alumno=nombre_alumno,
        nombre_entrenador=nombre_entrenador,
        email_tutor=consentimiento.email_tutor,
        nombre_tutor=consentimiento.nombre_tutor,
        vinculo_tutor=consentimiento.vinculo_tutor,
        version_politica=consentimiento.version_politica,
        estado=consentimiento.estado,
        expirado=is_expired
    )


@router.post("/autorizar")
def autorizar_consentimiento(
    payload: AutorizarConsentimientoRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Captura IP pública y User-Agent. Cambia estado a 'autorizado', activa al alumno y emite correos.
    """
    if not payload.checks_jurados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe aceptar bajo fe de juramento la patria potestad y la política de privacidad de menores."
        )

    consentimiento = db.query(ConsentimientoMenor).filter(
        ConsentimientoMenor.token_autorizacion == payload.token
    ).first()

    if not consentimiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud de autorización no encontrada o enlace inválido."
        )

    if consentimiento.estado == "autorizado":
        return {
            "message": "Esta autorización ya ha sido confirmada previamente.",
            "estado": "autorizado"
        }

    if consentimiento.fecha_expiracion < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de autorización ha expirado (vigencia máxima de 30 días). Solicite un nuevo enlace."
        )

    # Captura de IP pública y User-Agent para evidencia inmutable
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    user_agent = request.headers.get("user-agent", "unknown")

    consentimiento.estado = "autorizado"
    consentimiento.fecha_autorizacion = datetime.utcnow()
    consentimiento.ip_autorizacion = client_ip
    consentimiento.user_agent_autorizacion = user_agent[:255] if user_agent else None
    consentimiento.nombre_tutor = payload.nombre.strip()
    consentimiento.vinculo_tutor = payload.vinculo.strip()

    alumno = db.query(Alumno).filter(Alumno.id_usuario == consentimiento.id_alumno).first()
    alumno_email = ""
    alumno_nombre = "Alumno"

    if alumno:
        alumno.autorizacion_tutor_completada = True
        alumno.estado_activo = True
        if alumno.usuario:
            alumno_email = alumno.usuario.email
            u = alumno.usuario
            nom = f"{getattr(u, 'nombre', '') or ''} {getattr(u, 'apellido', '') or ''}".strip()
            alumno_nombre = nom or alumno_email.split("@")[0]

    db.commit()

    # Emisión de correos bidireccionales en segundo plano
    if alumno_email:
        background_tasks.add_task(
            send_parental_consent_confirmation_email,
            consentimiento.email_tutor,
            alumno_email,
            alumno_nombre
        )

    return {
        "message": "Autorización parental registrada con éxito. La cuenta del menor ha sido habilitada.",
        "estado": "autorizado",
        "fecha_autorizacion": consentimiento.fecha_autorizacion
    }


@router.post("/reenviar-solicitud")
def reenviar_solicitud(
    background_tasks: BackgroundTasks,
    payload: Optional[ReenviarSolicitudRequest] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Auth JWT Alumno (bloqueado). Permite reenviar el enlace al tutor o rectificar la dirección en caso de error tipográfico.
    """
    if current_user.rol != "alumno":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para alumnos."
        )

    alumno = db.query(Alumno).filter(Alumno.id_usuario == current_user.id_usuario).first()
    if not alumno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de alumno no encontrado."
        )

    if not alumno.requiere_autorizacion_tutor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta no requiere autorización parental."
        )

    if alumno.autorizacion_tutor_completada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La autorización parental ya ha sido completada previamente."
        )

    # Si se facilita un nuevo email para rectificar error tipográfico
    if payload and payload.email_tutor:
        alumno.email_tutor = str(payload.email_tutor).lower().strip()

    if not alumno.email_tutor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay correo electrónico de tutor configurado para esta cuenta."
        )

    new_token = secrets.token_urlsafe(32)

    # Buscar solicitud pendiente previa o crear una nueva
    consentimiento = db.query(ConsentimientoMenor).filter(
        ConsentimientoMenor.id_alumno == alumno.id_usuario,
        ConsentimientoMenor.estado == "pendiente"
    ).order_by(ConsentimientoMenor.fecha_solicitud.desc()).first()

    if consentimiento:
        consentimiento.email_tutor = alumno.email_tutor
        consentimiento.token_autorizacion = new_token
        consentimiento.fecha_solicitud = datetime.utcnow()
        consentimiento.fecha_expiracion = datetime.utcnow() + timedelta(days=30)
    else:
        consentimiento = ConsentimientoMenor(
            id_alumno=alumno.id_usuario,
            email_tutor=alumno.email_tutor,
            token_autorizacion=new_token,
            fecha_solicitud=datetime.utcnow(),
            fecha_expiracion=datetime.utcnow() + timedelta(days=30),
            version_politica="v1.0-2026-10",
            estado="pendiente"
        )
        db.add(consentimiento)

    db.commit()

    # Nombres para la plantilla
    alumno_nombre = f"{getattr(current_user, 'nombre', '') or ''} {getattr(current_user, 'apellido', '') or ''}".strip()
    if not alumno_nombre:
        alumno_nombre = current_user.email.split("@")[0]

    entrenador_nombre = "Entrenador Syncro"
    if alumno.entrenador and alumno.entrenador.usuario:
        cu = alumno.entrenador.usuario
        entrenador_nombre = f"{getattr(cu, 'nombre', '') or ''} {getattr(cu, 'apellido', '') or ''}".strip()
        if not entrenador_nombre:
            entrenador_nombre = cu.email.split("@")[0]

    background_tasks.add_task(
        send_parental_consent_request_email,
        alumno.email_tutor,
        alumno_nombre,
        entrenador_nombre,
        new_token
    )

    frontend_url = os.getenv("FRONTEND_URL", "https://syncro-clone.vercel.app").rstrip("/")
    auth_url = f"{frontend_url}/consentimiento-tutor?token={new_token}"

    return {
        "message": f"Solicitud de autorización despachada a {alumno.email_tutor}",
        "email_tutor": alumno.email_tutor,
        "token": new_token,
        "enlace_autorizacion": auth_url
    }


@router.get("/mi-enlace")
def obtener_mi_enlace(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al alumno menor autenticado obtener su enlace de autorización vigente
    para que pueda copiarlo y enviárselo a su tutor legal directamente (por WhatsApp o similar).
    """
    if current_user.rol != "alumno":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para alumnos."
        )

    alumno = db.query(Alumno).filter(Alumno.id_usuario == current_user.id_usuario).first()
    if not alumno or not alumno.requiere_autorizacion_tutor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta no requiere autorización parental."
        )

    consentimiento = db.query(ConsentimientoMenor).filter(
        ConsentimientoMenor.id_alumno == alumno.id_usuario,
        ConsentimientoMenor.estado == "pendiente"
    ).order_by(ConsentimientoMenor.fecha_solicitud.desc()).first()

    if not consentimiento:
        new_token = secrets.token_urlsafe(32)
        consentimiento = ConsentimientoMenor(
            id_alumno=alumno.id_usuario,
            email_tutor=alumno.email_tutor or "tutor@syncro.app",
            token_autorizacion=new_token,
            fecha_solicitud=datetime.utcnow(),
            fecha_expiracion=datetime.utcnow() + timedelta(days=30),
            version_politica="v1.0-2026-10",
            estado="pendiente"
        )
        db.add(consentimiento)
        db.commit()
        db.refresh(consentimiento)

    frontend_url = os.getenv("FRONTEND_URL", "https://syncro-clone.vercel.app").rstrip("/")
    auth_url = f"{frontend_url}/consentimiento-tutor?token={consentimiento.token_autorizacion}"

    return {
        "email_tutor": consentimiento.email_tutor,
        "token": consentimiento.token_autorizacion,
        "enlace_autorizacion": auth_url,
        "fecha_expiracion": consentimiento.fecha_expiracion,
        "autorizado": alumno.autorizacion_tutor_completada
    }
