from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import EvaluacionFisica, ComposicionCorporal, ProgresoVisual, Alumno
from app.schemas import (
    EvaluacionFisicaCreate, EvaluacionFisicaOut,
    ComposicionCorporalCreate, ComposicionCorporalOut,
    ProgresoVisualCreate, ProgresoVisualOut,
    ConfiguracionEvaluacionUpdate
)
from app.utils.auth import get_current_user
from app.models import Usuario

router = APIRouter(prefix="/api/v1", tags=["Evaluations"])

# ----------------- Evaluacion Fisica -----------------
@router.post("/students/{student_id}/evaluations/physical", response_model=EvaluacionFisicaOut)
def create_physical_eval(
    student_id: UUID,
    eval_in: EvaluacionFisicaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id_usuario == student_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    # Puede cargarlo el coach asignado o el propio alumno
    if current_user.rol == "entrenador" and alumno.id_entrenador != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.rol == "alumno" and alumno.id_usuario != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No autorizado")

    new_eval = EvaluacionFisica(**eval_in.dict(exclude_unset=True))
    new_eval.id_alumno = student_id
    if not new_eval.fecha:
        new_eval.fecha = datetime.utcnow()
        
    db.add(new_eval)
    
    # Actualizar fecha de ultima evaluacion
    alumno.ultima_evaluacion_fecha = new_eval.fecha
    
    db.commit()
    db.refresh(new_eval)
    return new_eval

@router.get("/students/{student_id}/evaluations/physical", response_model=List[EvaluacionFisicaOut])
def get_physical_evals(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verificaciones omitidas por brevedad (asume autorización)
    return db.query(EvaluacionFisica).filter(EvaluacionFisica.id_alumno == student_id).order_by(desc(EvaluacionFisica.fecha)).all()

@router.delete("/evaluations/physical/{eval_id}")
def delete_physical_eval(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    ev = db.query(EvaluacionFisica).filter(EvaluacionFisica.id_evaluacion == eval_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    db.delete(ev)
    db.commit()
    return {"message": "Borrado"}

# ----------------- Composicion Corporal -----------------
@router.post("/students/{student_id}/evaluations/body", response_model=ComposicionCorporalOut)
def create_body_comp(
    student_id: UUID,
    comp_in: ComposicionCorporalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id_usuario == student_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    new_comp = ComposicionCorporal(**comp_in.dict(exclude_unset=True))
    new_comp.id_alumno = student_id
    if not new_comp.fecha:
        new_comp.fecha = datetime.utcnow()
        
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)
    return new_comp

@router.get("/students/{student_id}/evaluations/body", response_model=List[ComposicionCorporalOut])
def get_body_comps(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(ComposicionCorporal).filter(ComposicionCorporal.id_alumno == student_id).order_by(desc(ComposicionCorporal.fecha)).all()

@router.delete("/evaluations/body/{comp_id}")
def delete_body_comp(
    comp_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    c = db.query(ComposicionCorporal).filter(ComposicionCorporal.id_composicion == comp_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(c)
    db.commit()
    return {"message": "Borrado"}

# ----------------- Progreso Visual -----------------
@router.post("/students/{student_id}/evaluations/visual", response_model=ProgresoVisualOut)
def create_visual_progress(
    student_id: UUID,
    vis_in: ProgresoVisualCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id_usuario == student_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    new_vis = ProgresoVisual(**vis_in.dict(exclude_unset=True))
    new_vis.id_alumno = student_id
    if not new_vis.fecha:
        new_vis.fecha = datetime.utcnow()
        
    db.add(new_vis)
    db.commit()
    db.refresh(new_vis)
    return new_vis

@router.get("/students/{student_id}/evaluations/visual", response_model=List[ProgresoVisualOut])
def get_visual_progress(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(ProgresoVisual).filter(ProgresoVisual.id_alumno == student_id).order_by(desc(ProgresoVisual.fecha))
    
    if current_user.rol == "entrenador":
        query = query.filter(ProgresoVisual.visible_para_entrenador == True)
        
    return query.all()

@router.delete("/evaluations/visual/{vis_id}")
def delete_visual_progress(
    vis_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    v = db.query(ProgresoVisual).filter(ProgresoVisual.id_progreso == vis_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(v)
    db.commit()
    return {"message": "Borrado"}

# ----------------- Configuracion Alumno -----------------
@router.put("/students/{student_id}/evaluations/config")
def update_eval_config(
    student_id: UUID,
    config: ConfiguracionEvaluacionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id_usuario == student_id).first()
    if not alumno:
        raise HTTPException(status_code=404)
        
    if config.frecuencia_evaluacion_dias is not None:
        alumno.frecuencia_evaluacion_dias = config.frecuencia_evaluacion_dias
        
    db.commit()
    return {"message": "Configuración actualizada"}
from datetime import timedelta

@router.get("/coaches/me/evaluations/pending")
def get_pending_evals(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403)
        
    alumnos = db.query(Alumno).filter(Alumno.id_entrenador == current_user.id_usuario, Alumno.estado_activo == True).all()
    pending = []
    
    now = datetime.utcnow()
    for al in alumnos:
        if al.frecuencia_evaluacion_dias:
            if not al.ultima_evaluacion_fecha:
                pending.append({"id_usuario": al.id_usuario, "nombre": al.usuario.email, "estado": "vencido", "dias_restantes": -1})
            else:
                next_date = al.ultima_evaluacion_fecha + timedelta(days=al.frecuencia_evaluacion_dias)
                diff = (next_date - now).days
                if diff <= 7:
                    estado = "vencido" if diff < 0 else "proximo"
                    pending.append({
                        "id_usuario": al.id_usuario, 
                        "nombre": al.usuario.email, # En produccion seria mejor traer el nombre desde otra tabla, pero en este DB es email
                        "estado": estado, 
                        "dias_restantes": diff
                    })
    
    return pending
