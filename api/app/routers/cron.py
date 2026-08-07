from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Entrenador, Alumno, Usuario
from app.services.email_service import send_payment_reminder_email
import asyncio

router = APIRouter(prefix="/cron", tags=["cron"])

@router.post("/check-payments")
async def check_payments_cron(db: Session = Depends(get_db)):
    """
    Este endpoint será llamado diariamente por un cron job (ej: cron-job.org) a las 00:01 AM.
    Realiza las siguientes tareas:
    1. Envía correos a los alumnos que vencen en 2 días.
    2. Envía correos a los alumnos que vencen hoy.
    3. Bloquea a los alumnos morosos según la configuración de su entrenador.
    """
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    alumnos = db.query(Alumno).all()
    emails_sent = 0
    blocked_count = 0
    
    for alumno in alumnos:
        if not alumno.fecha_vencimiento_pago or not alumno.estado_activo:
            continue
            
        coach = db.query(Entrenador).filter(Entrenador.id_usuario == alumno.id_entrenador).first()
        user_alumno = db.query(Usuario).filter(Usuario.id_usuario == alumno.id_usuario).first()
        user_coach = db.query(Usuario).filter(Usuario.id_usuario == coach.id_usuario).first()
        
        if not coach or not user_alumno or not user_coach:
            continue

        vencimiento_dia = alumno.fecha_vencimiento_pago.replace(hour=0, minute=0, second=0, microsecond=0)
        days_diff = (vencimiento_dia - today).days

        # 1. Recordatorio 2 días antes
        if days_diff == 2 and not alumno.recordatorio_enviado_2_dias:
            asyncio.create_task(
                send_payment_reminder_email(
                    alumno_email=user_alumno.email,
                    alumno_nombre=user_alumno.email.split("@")[0], # O si hay nombre en perfil
                    entrenador_nombre=coach.nombre or "tu entrenador",
                    is_due_today=False
                )
            )
            alumno.recordatorio_enviado_2_dias = True
            emails_sent += 1

        # 2. Recordatorio HOY
        if days_diff == 0 and not alumno.recordatorio_enviado_hoy:
            asyncio.create_task(
                send_payment_reminder_email(
                    alumno_email=user_alumno.email,
                    alumno_nombre=user_alumno.email.split("@")[0],
                    entrenador_nombre=coach.nombre or "tu entrenador",
                    is_due_today=True
                )
            )
            alumno.recordatorio_enviado_hoy = True
            emails_sent += 1

        # 3. Lógica de Bloqueo
        # Solo bloquear si ya pasó el vencimiento (days_diff < 0)
        if days_diff < 0 and not alumno.bloqueado_por_pago:
            dias_vencido = abs(days_diff)
            
            if coach.config_bloqueo_morosos == "inmediato":
                alumno.bloqueado_por_pago = True
                blocked_count += 1
            elif coach.config_bloqueo_morosos == "dias_despues":
                if dias_vencido >= coach.config_bloqueo_dias:
                    alumno.bloqueado_por_pago = True
                    blocked_count += 1
                    
    db.commit()
    
    return {
        "status": "success",
        "message": "Cron job completed",
        "emails_dispatched": emails_sent,
        "students_blocked": blocked_count
    }
