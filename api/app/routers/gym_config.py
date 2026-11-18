"""
Gym configuration and class management endpoints for coaches.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from app.database import get_db
from app.models import Entrenador, Alumno, AsistenciaQR, Usuario
from app.utils.auth import get_current_user
from datetime import date, datetime, timedelta
import math

router = APIRouter(prefix="/api/v1/coaches/gym", tags=["Gym Config"])


class GymConfigInput(BaseModel):
    tipo_cuenta: str  # 'estandar' | 'gimnasio'
    gym_tipo_cobro: Optional[str] = None
    gym_frecuencia_tipo: Optional[str] = None
    gym_frecuencia_valor: Optional[int] = None
    gym_monto_pase_libre: Optional[float] = None
    gym_monto_clases: Optional[float] = None
    gym_paquetes_clases: Optional[List[dict]] = None


class RecargaClasesInput(BaseModel):
    cantidad: int
    alumno_id: str


@router.get("/config")
def get_gym_config(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    coach = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not coach:
        raise HTTPException(status_code=403, detail="No es entrenador")

    return {
        "tipo_cuenta": coach.tipo_cuenta or "estandar",
        "gym_tipo_cobro": coach.gym_tipo_cobro,
        "gym_frecuencia_tipo": coach.gym_frecuencia_tipo,
        "gym_frecuencia_valor": coach.gym_frecuencia_valor,
        "gym_monto_pase_libre": float(coach.gym_monto_pase_libre) if coach.gym_monto_pase_libre else None,
        "gym_monto_clases": float(coach.gym_monto_clases) if coach.gym_monto_clases else None,
        "gym_paquetes_clases": coach.gym_paquetes_clases or [],
        "qr_url": f"/qr/{str(current_user.id_usuario)}",
    }


@router.patch("/config")
def update_gym_config(
    body: GymConfigInput,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    coach = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not coach:
        raise HTTPException(status_code=403, detail="No es entrenador")

    coach.tipo_cuenta          = body.tipo_cuenta
    coach.gym_tipo_cobro       = body.gym_tipo_cobro
    coach.gym_frecuencia_tipo  = body.gym_frecuencia_tipo
    coach.gym_frecuencia_valor = body.gym_frecuencia_valor
    coach.gym_monto_pase_libre = body.gym_monto_pase_libre
    coach.gym_monto_clases     = body.gym_monto_clases
    if body.gym_paquetes_clases is not None:
        coach.gym_paquetes_clases = body.gym_paquetes_clases
    db.commit()
    return {"ok": True}


@router.post("/recargar_clases")
def recargar_clases(
    body: RecargaClasesInput,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    coach = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not coach:
        raise HTTPException(status_code=403, detail="No es entrenador")


    alumno = db.query(Alumno).filter(
        Alumno.id_usuario == body.alumno_id,
        Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    alumno.clases_compradas = (alumno.clases_compradas or 0) + body.cantidad
    alumno.clases_restantes = (alumno.clases_restantes or 0) + body.cantidad

    # Recalcular vencimiento si ya tiene fecha inicio
    if alumno.fecha_inicio_paquete and coach.gym_frecuencia_valor:
        freq_tipo = coach.gym_frecuencia_tipo or "por_semana"
        freq_val  = coach.gym_frecuencia_valor or 3
        clases    = alumno.clases_restantes or 0
        if freq_tipo == "por_semana":
            semanas = math.ceil(clases / freq_val)
            alumno.vencimiento_estimado_clases = date.today() + timedelta(weeks=semanas)
        else:
            dias_por_clase = 30 / freq_val
            alumno.vencimiento_estimado_clases = date.today() + timedelta(days=math.ceil(clases * dias_por_clase))

    db.commit()
    db.refresh(alumno)
    return {
        "ok": True,
        "clases_restantes": alumno.clases_restantes,
        "vencimiento_estimado": str(alumno.vencimiento_estimado_clases) if alumno.vencimiento_estimado_clases else None,
    }


@router.get("/asistencias")
def get_asistencias(
    fecha: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    coach = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not coach:
        raise HTTPException(status_code=403, detail="No es entrenador")


    target_date = date.fromisoformat(fecha) if fecha else date.today()

    rows = (
        db.query(AsistenciaQR, Alumno, Usuario)
        .join(Alumno, AsistenciaQR.id_alumno == Alumno.id_usuario)
        .join(Usuario, Alumno.id_usuario == Usuario.id_usuario)
        .filter(
            AsistenciaQR.id_entrenador == current_user.id_usuario,
            AsistenciaQR.fecha == target_date
        )
        .all()
    )

    return {
        "fecha": str(target_date),
        "total": len(rows),
        "asistencias": [
            {
                "id": str(a.id_asistencia),
                "hora": a.hora,
                "alumno_email": u.email,
                "tipo_membresia": al.tipo_membresia,
                "clases_restantes": al.clases_restantes,
            }
            for a, al, u in rows
        ]
    }
