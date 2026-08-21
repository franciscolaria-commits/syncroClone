from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["superadmin"]
)

def get_superadmin(current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de super administrador."
        )
    return current_user

from datetime import datetime
import uuid

@router.get("/coaches", response_model=List[schemas.CoachAdminOut])
def get_all_coaches(
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_superadmin)
):
    """
    Lista todos los entrenadores con su estado financiero y cantidad de alumnos.
    """
    # Excluir entrenadores eliminados (soft delete)
    entrenadores = db.query(models.Entrenador).filter(models.Entrenador.estado_activo == True).all()
    result = []
    
    current_anio_mes = datetime.utcnow().strftime("%Y-%m")
    
    for e in entrenadores:
        usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == e.id_usuario).first()
        total_alumnos = db.query(func.count(models.Alumno.id_usuario)).filter(
            models.Alumno.id_entrenador == e.id_usuario,
            models.Alumno.estado_activo == True
        ).scalar()
        
        # Calcular deuda estimada
        deuda = 0.0
        if e.modelo_pago == "fijo":
            deuda = e.monto_fijo or 0.0
        else:
            if total_alumnos <= 9:
                deuda = total_alumnos * 1500
            elif total_alumnos <= 49:
                deuda = total_alumnos * 1200
            else:
                deuda = total_alumnos * 1000
                
        # Verificar si hay pago registrado este mes
        pago_mes = db.query(models.PagoEntrenador).filter(
            models.PagoEntrenador.id_entrenador == e.id_usuario,
            models.PagoEntrenador.anio_mes == current_anio_mes
        ).first()
        
        result.append({
            "id_usuario": e.id_usuario,
            "nombre": e.nombre,
            "email": usuario.email if usuario else "Desconocido",
            "limite_alumnos": e.limite_alumnos,
            "estado_financiero": e.estado_financiero,
            "estado_activo": e.estado_activo,
            "modelo_pago": e.modelo_pago,
            "monto_fijo": e.monto_fijo,
            "fecha_vencimiento": e.fecha_vencimiento,
            "en_periodo_prueba": e.en_periodo_prueba,
            "fecha_fin_prueba": e.fecha_fin_prueba,
            "total_alumnos": total_alumnos,
            "deuda_estimada_mes": deuda,
            "pago_mes_registrado": pago_mes is not None
        })
    return result

@router.put("/coaches/{coach_id}", response_model=schemas.CoachAdminOut)
def update_coach_financial(
    coach_id: str,
    update_data: schemas.CoachAdminUpdate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_superadmin)
):
    """
    Actualiza los lÃ­mites y estados financieros de un entrenador especÃ­fico.
    """
    entrenador = db.query(models.Entrenador).filter(models.Entrenador.id_usuario == coach_id).first()
    if not entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
        
    if update_data.limite_alumnos is not None:
        entrenador.limite_alumnos = update_data.limite_alumnos
    if update_data.estado_financiero is not None:
        entrenador.estado_financiero = update_data.estado_financiero
    if update_data.fecha_vencimiento is not None:
        entrenador.fecha_vencimiento = update_data.fecha_vencimiento
    if update_data.modelo_pago is not None:
        entrenador.modelo_pago = update_data.modelo_pago
    if update_data.monto_fijo is not None:
        entrenador.monto_fijo = update_data.monto_fijo
    if update_data.estado_activo is not None:
        entrenador.estado_activo = update_data.estado_activo
    if update_data.en_periodo_prueba is not None:
        entrenador.en_periodo_prueba = update_data.en_periodo_prueba
    if update_data.fecha_fin_prueba is not None:
        entrenador.fecha_fin_prueba = update_data.fecha_fin_prueba
        
    db.commit()
    db.refresh(entrenador)
    
    # Calcular y devolver estado actualizado
    current_anio_mes = datetime.utcnow().strftime("%Y-%m")
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == entrenador.id_usuario).first()
    total_alumnos = db.query(func.count(models.Alumno.id_usuario)).filter(
        models.Alumno.id_entrenador == entrenador.id_usuario,
        models.Alumno.estado_activo == True
    ).scalar()
    
    deuda = 0.0
    if entrenador.modelo_pago == "fijo":
        deuda = entrenador.monto_fijo or 0.0
    else:
        if total_alumnos <= 9:
            deuda = total_alumnos * 1500
        elif total_alumnos <= 49:
            deuda = total_alumnos * 1200
        else:
            deuda = total_alumnos * 1000
            
    pago_mes = db.query(models.PagoEntrenador).filter(
        models.PagoEntrenador.id_entrenador == entrenador.id_usuario,
        models.PagoEntrenador.anio_mes == current_anio_mes
    ).first()
    
    return {
        "id_usuario": entrenador.id_usuario,
        "nombre": entrenador.nombre,
        "email": usuario.email if usuario else "Desconocido",
        "limite_alumnos": entrenador.limite_alumnos,
        "estado_financiero": entrenador.estado_financiero,
        "estado_activo": entrenador.estado_activo,
        "modelo_pago": entrenador.modelo_pago,
        "monto_fijo": entrenador.monto_fijo,
        "fecha_vencimiento": entrenador.fecha_vencimiento,
        "en_periodo_prueba": entrenador.en_periodo_prueba,
        "fecha_fin_prueba": entrenador.fecha_fin_prueba,
        "total_alumnos": total_alumnos,
        "deuda_estimada_mes": deuda,
        "pago_mes_registrado": pago_mes is not None
    }

@router.delete("/coaches/{coach_id}")
def delete_coach(
    coach_id: str,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_superadmin)
):
    """
    Soft delete de un entrenador.
    """
    entrenador = db.query(models.Entrenador).filter(models.Entrenador.id_usuario == coach_id).first()
    if not entrenador:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
        
    entrenador.estado_activo = False
    entrenador.estado_financiero = "suspendido" # Por las dudas para bloquear accesos
    db.commit()
    return {"message": "Entrenador borrado exitosamente (soft delete)"}

@router.post("/coaches/{coach_id}/pagos", response_model=schemas.PagoEntrenadorOut)
def register_coach_payment(
    coach_id: str,
    pago_data: schemas.PagoEntrenadorCreate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_superadmin)
):
    current_anio_mes = datetime.utcnow().strftime("%Y-%m")
    
    # Check if already paid this month
    existente = db.query(models.PagoEntrenador).filter(
        models.PagoEntrenador.id_entrenador == coach_id,
        models.PagoEntrenador.anio_mes == current_anio_mes
    ).first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un pago registrado para este entrenador en el mes actual.")
        
    nuevo_pago = models.PagoEntrenador(
        id_entrenador=coach_id,
        anio_mes=current_anio_mes,
        monto=pago_data.monto,
        metodo_pago=pago_data.metodo_pago,
        notas=pago_data.notas
    )
    db.add(nuevo_pago)
    
    # Optional: ensure coach is active financially
    entrenador = db.query(models.Entrenador).filter(models.Entrenador.id_usuario == coach_id).first()
    if entrenador and entrenador.estado_financiero != "activo":
        entrenador.estado_financiero = "activo"
        
    db.commit()
    db.refresh(nuevo_pago)
    return nuevo_pago

@router.get("/finances")
def get_finances(
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_superadmin)
):
    current_anio_mes = datetime.utcnow().strftime("%Y-%m")
    
    entrenadores = db.query(models.Entrenador).filter(models.Entrenador.estado_activo == True).all()
    total_entrenadores = len(entrenadores)
    total_alumnos_plataforma = db.query(func.count(models.Alumno.id_usuario)).filter(models.Alumno.estado_activo == True).scalar()
    
    ingreso_esperado = 0.0
    for e in entrenadores:
        total_alumnos = db.query(func.count(models.Alumno.id_usuario)).filter(
            models.Alumno.id_entrenador == e.id_usuario,
            models.Alumno.estado_activo == True
        ).scalar()
        if e.modelo_pago == "fijo":
            ingreso_esperado += (e.monto_fijo or 0.0)
        else:
            if total_alumnos <= 9:
                ingreso_esperado += total_alumnos * 1500
            elif total_alumnos <= 49:
                ingreso_esperado += total_alumnos * 1200
            else:
                ingreso_esperado += total_alumnos * 1000
                
    ingreso_real = db.query(func.sum(models.PagoEntrenador.monto)).filter(models.PagoEntrenador.anio_mes == current_anio_mes).scalar() or 0.0
    deuda_pendiente = ingreso_esperado - ingreso_real
    
    # Historial de Ãºltimos 6 meses para grÃ¡fico
    historial = []
    meses_anteriores = db.query(models.PagoEntrenador.anio_mes, func.sum(models.PagoEntrenador.monto).label('total'))\
        .group_by(models.PagoEntrenador.anio_mes)\
        .order_by(models.PagoEntrenador.anio_mes.desc())\
        .limit(6).all()
        
    for anio_mes, total in reversed(meses_anteriores):
        historial.append({
            "mes": anio_mes,
            "ingresos": total
        })
        
    return {
        "kpis": {
            "total_entrenadores": total_entrenadores,
            "total_alumnos_plataforma": total_alumnos_plataforma,
            "ingreso_esperado_mes": ingreso_esperado,
            "ingreso_real_mes": ingreso_real,
            "deuda_pendiente": deuda_pendiente if deuda_pendiente > 0 else 0
        },
        "chart_data": historial
    }

