"""
QR check-in router.
Public endpoint: GET /api/v1/qr/{coach_id}   -> gym info
Public endpoint: POST /api/v1/qr/{coach_id}/checkin -> register attendance (requires auth)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.database import get_db
from app.models import Entrenador, Alumno, AsistenciaQR
from app.utils.auth import get_current_user
from app.models import Usuario
import uuid
from datetime import date, datetime, timedelta
import math

router = APIRouter(prefix="/api/v1/qr", tags=["QR"])


def _calcular_vencimiento(fecha_inicio: date, clases_restantes: int,
                           frecuencia_tipo: str, frecuencia_valor: int) -> date:
    """Calcula la fecha estimada de vencimiento."""
    if not frecuencia_valor or frecuencia_valor <= 0:
        return fecha_inicio + timedelta(days=30)
    if frecuencia_tipo == "por_semana":
        semanas = math.ceil(clases_restantes / frecuencia_valor)
        return fecha_inicio + timedelta(weeks=semanas)
    else:  # por_mes -> aproximar a días
        dias_por_clase = 30 / frecuencia_valor
        return fecha_inicio + timedelta(days=math.ceil(clases_restantes * dias_por_clase))


@router.get("/{coach_id}")
def get_gym_info(coach_id: str, db: Session = Depends(get_db)):
    """Devuelve info pública del gimnasio para mostrar en la pantalla del QR."""
    from app.models import Usuario, Invitacion
    # coach_id puede ser UUID o email
    coach = None
    if "@" in coach_id:
        u = db.query(Usuario).filter(Usuario.email == coach_id.lower(), Usuario.rol == 'entrenador').first()
        if u:
            coach = db.query(Entrenador).filter(Entrenador.id_usuario == u.id_usuario).first()
    else:
        try:
            import uuid
            uuid_val = uuid.UUID(coach_id)
            inv = db.query(Invitacion).filter(Invitacion.codigo_unico == str(uuid_val)).first()
            if inv:
                coach = db.query(Entrenador).filter(Entrenador.id_usuario == inv.id_entrenador).first()
            else:
                coach = db.query(Entrenador).filter(Entrenador.id_usuario == uuid_val).first()
        except ValueError:
            pass
    if not coach or coach.tipo_cuenta != "gimnasio":
        raise HTTPException(status_code=404, detail="Gimnasio no encontrado")
    return {
        "id_entrenador": str(coach.id_usuario),
        "nombre": coach.nombre,
        "tipo_cobro": coach.gym_tipo_cobro,
        "gym_monto_pase_libre": float(coach.gym_monto_pase_libre) if coach.gym_monto_pase_libre else None,
        "gym_monto_clases": float(coach.gym_monto_clases) if coach.gym_monto_clases else None,
        "gym_paquetes_clases": coach.gym_paquetes_clases or [],
    }


@router.post("/{coach_id}/checkin")
def qr_checkin(
    coach_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Registra asistencia del alumno. Máximo 1 por día."""
    # Validaciones
    from app.models import Usuario, Invitacion
    # coach_id puede ser UUID o email
    coach = None
    if "@" in coach_id:
        u = db.query(Usuario).filter(Usuario.email == coach_id.lower(), Usuario.rol == 'entrenador').first()
        if u:
            coach = db.query(Entrenador).filter(Entrenador.id_usuario == u.id_usuario).first()
    else:
        try:
            import uuid
            uuid_val = uuid.UUID(coach_id)
            inv = db.query(Invitacion).filter(Invitacion.codigo_unico == str(uuid_val)).first()
            if inv:
                coach = db.query(Entrenador).filter(Entrenador.id_usuario == inv.id_entrenador).first()
            else:
                coach = db.query(Entrenador).filter(Entrenador.id_usuario == uuid_val).first()
        except ValueError:
            pass
    if not coach or coach.tipo_cuenta != "gimnasio":
        raise HTTPException(status_code=404, detail="Gimnasio no encontrado")

    alumno = db.query(Alumno).filter(
        Alumno.id_usuario == current_user.id_usuario,
        Alumno.id_entrenador == coach.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=403, detail="No pertenecés a este gimnasio")

    if not alumno.tipo_membresia:
        return {
            "status": "sin_membresia",
            "mensaje": "Debes configurar tu tipo de membresía antes de registrar asistencias",
            "clases_restantes": 0,
            "tipo_membresia": None,
        }

    today = date.today()
    hora_actual = datetime.now().strftime("%H:%M")

    # Check 1 asistencia por día
    existing = db.query(AsistenciaQR).filter(
        AsistenciaQR.id_alumno == alumno.id_usuario,
        AsistenciaQR.fecha == today
    ).first()
    if existing:
        return {
            "status": "ya_registrado",
            "mensaje": "Ya registraste tu entrada hoy",
            "clases_restantes": alumno.clases_restantes,
            "tipo_membresia": alumno.tipo_membresia,
        }

    # Registrar asistencia
    asistencia = AsistenciaQR(
        id_asistencia=uuid.uuid4(),
        id_alumno=alumno.id_usuario,
        id_entrenador=coach.id_usuario,
        fecha=today,
        hora=hora_actual,
        creado_en=datetime.utcnow()
    )
    db.add(asistencia)

    # Procesar según tipo de membresía
    sin_clases = False
    if alumno.tipo_membresia == "por_clases":
        if (alumno.clases_restantes or 0) <= 0:
            db.rollback()
            return {
                "status": "sin_clases",
                "mensaje": "Te quedaste sin clases. ¡Renovar membresía!",
                "clases_restantes": 0,
                "tipo_membresia": alumno.tipo_membresia,
            }

        # Primera vez → setear fecha inicio y calcular vencimiento
        if not alumno.fecha_inicio_paquete:
            alumno.fecha_inicio_paquete = today
            venc = _calcular_vencimiento(
                today,
                alumno.clases_restantes,
                coach.gym_frecuencia_tipo or "por_semana",
                coach.gym_frecuencia_valor or 3
            )
            alumno.vencimiento_estimado_clases = venc

        alumno.clases_usadas_total = (alumno.clases_usadas_total or 0) + 1
        alumno.clases_restantes = (alumno.clases_restantes or 0) - 1

        if alumno.clases_restantes <= 0:
            sin_clases = True
            # Crear alerta en auditoría si existe ese mecanismo
            # (lo hacemos directo en la respuesta para que el entrenador vea)

    db.commit()
    db.refresh(alumno)

    return {
        "status": "ok",
        "mensaje": f"¡Bienvenido/a! Entrada registrada.",
        "clases_restantes": alumno.clases_restantes,
        "tipo_membresia": alumno.tipo_membresia,
        "vencimiento_estimado": str(alumno.vencimiento_estimado_clases) if alumno.vencimiento_estimado_clases else None,
        "sin_clases_warning": sin_clases,
    }
