from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import ConsentimientoMenor, Alumno, Usuario

router = APIRouter(
    prefix="/api/v1/legal",
    tags=["Aspectos Legales y Privacidad"]
)

class ConsentimientoResponse(BaseModel):
    id: str
    nombre_alumno: str
    nombre_entrenador: Optional[str] = None
    email_tutor: str
    nombre_tutor: Optional[str] = None
    vinculo_tutor: Optional[str] = None
    estado: str
    fecha_solicitud: datetime
    fecha_confirmacion: Optional[datetime] = None
    fecha_expiracion: Optional[datetime] = None

class AutorizarConsentimientoPayload(BaseModel):
    nombre_firmante: Optional[str] = None
    dni_tutor: Optional[str] = None
    acepta_terminos: bool

@router.get("/consentimiento/{token}", response_model=ConsentimientoResponse)
def obtener_consentimiento(token: str, db: Session = Depends(get_db)):
    """
    Obtiene los datos de la solicitud de autorización parental para que el tutor pueda revisarla.
    """
    consentimiento = db.query(ConsentimientoMenor).filter(ConsentimientoMenor.token_autorizacion == token).first()
    if not consentimiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud de autorización no encontrada o enlace inválido."
        )

    alumno = db.query(Alumno).filter(Alumno.id_usuario == consentimiento.id_alumno).first()
    nombre_alumno = "Alumno"
    nombre_entrenador = None
    if alumno and alumno.usuario:
        nombre_alumno = f"{alumno.usuario.nombre} {alumno.usuario.apellido}".strip()
    if alumno and alumno.entrenador and alumno.entrenador.usuario:
        nombre_entrenador = f"{alumno.entrenador.usuario.nombre} {alumno.entrenador.usuario.apellido}".strip()

    return ConsentimientoResponse(
        id=str(consentimiento.id),
        nombre_alumno=nombre_alumno,
        nombre_entrenador=nombre_entrenador,
        email_tutor=consentimiento.email_tutor,
        nombre_tutor=consentimiento.nombre_tutor,
        vinculo_tutor=consentimiento.vinculo_tutor,
        estado=consentimiento.estado,
        fecha_solicitud=consentimiento.fecha_solicitud,
        fecha_confirmacion=consentimiento.fecha_confirmacion,
        fecha_expiracion=consentimiento.fecha_expiracion
    )

@router.post("/consentimiento/{token}/autorizar")
def autorizar_consentimiento(
    token: str,
    payload: AutorizarConsentimientoPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registra el consentimiento expreso del padre/madre o tutor legal.
    """
    if not payload.acepta_terminos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe aceptar expresamente la autorización para continuar."
        )

    consentimiento = db.query(ConsentimientoMenor).filter(ConsentimientoMenor.token_autorizacion == token).first()
    if not consentimiento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud de autorización no encontrada o enlace inválido."
        )

    if consentimiento.estado in ["aprobado", "autorizado"]:
        return {"message": "Esta autorización ya ha sido confirmada previamente.", "estado": "autorizado"}

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    consentimiento.estado = "autorizado"
    consentimiento.fecha_autorizacion = datetime.utcnow()
    consentimiento.ip_autorizacion = client_ip
    consentimiento.user_agent_autorizacion = user_agent[:255] if user_agent else None
    if payload.nombre_firmante:
        consentimiento.nombre_tutor = payload.nombre_firmante

    alumno = db.query(Alumno).filter(Alumno.id_usuario == consentimiento.id_alumno).first()
    if alumno:
        alumno.autorizacion_tutor_completada = True
        alumno.estado_activo = True

    db.commit()

    return {
        "message": "Autorización parental confirmada con éxito. El menor ahora cuenta con acceso a sus entrenamientos.",
        "estado": "autorizado",
        "fecha_confirmacion": consentimiento.fecha_autorizacion
    }

@router.get("/politicas")
def obtener_politicas_info():
    """
    Metadatos informativos de políticas legales y privacidad.
    """
    return {
        "version": "1.0-2026-10",
        "edad_minima_sin_tutor": 18,
        "contacto_soporte_legal": "soporte@syncro.app",
        "resumen_privacidad": {
            "email_visible_entrenador": True,
            "telefono_visible_entrenador": True,
            "password_visible_entrenador": False,
            "finalidad_telefono": "Notificaciones de rutinas y recordatorios de pago",
            "derechos_arco": "El usuario puede solicitar acceso, rectificación o eliminación de sus datos en cualquier momento."
        }
    }
