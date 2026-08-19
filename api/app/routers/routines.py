from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List
from uuid import uuid4

from app import models, schemas
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/routines",
    tags=["Routines"]
)

@router.post("", response_model=schemas.RutinaOut, status_code=status.HTTP_201_CREATED)
def create_routine(
    routine_data: schemas.RutinaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden crear rutinas")

    try:
        # 1. Crear Rutina Principal
        new_rutina_id = uuid4()
        new_rutina = models.Rutina(
            id_rutina=new_rutina_id,
            id_entrenador=current_user.id_usuario,
            nombre_rutina=routine_data.nombre_rutina,
            frecuencia_semanal=routine_data.frecuencia_semanal,
            version_id=1,
            is_active=True
        )
        db.add(new_rutina)

        dias_out = []
        # 2. Iterar sobre Días
        for dia_data in routine_data.dias:
            new_dia_id = uuid4()
            new_dia = models.RutinaDia(
                id_dia=new_dia_id,
                id_rutina=new_rutina_id,
                nombre_dia=dia_data.nombre_dia,
                orden=dia_data.orden
            )
            db.add(new_dia)

            ejercicios_out = []
            # 3. Iterar sobre Ejercicios de cada Día
            for ej_data in dia_data.ejercicios:
                new_ej_id = uuid4()
                new_ej = models.RutinaEjercicio(
                    id_rutina_ejercicio=new_ej_id,
                    id_dia=new_dia_id,
                    id_ejercicio=ej_data.id_ejercicio,
                    series_esperadas=ej_data.series_esperadas,
                    reps_esperadas=ej_data.reps_esperadas,
                    descanso_segundos=ej_data.descanso_segundos,
                    orden=ej_data.orden,
                    nota_entrenador=ej_data.nota_entrenador
                )
                db.add(new_ej)
                
        # Commit de toda la jerarquía de forma transaccional
        db.commit()
        db.refresh(new_rutina)
        return new_rutina

    except SQLAlchemyError as e:
        db.rollback()
        print(f"ERROR INTERNO (Crear Rutina): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

from uuid import UUID

@router.put("/{id_rutina}", response_model=schemas.RutinaOut)
def update_routine(
    id_rutina: UUID,
    routine_data: schemas.RutinaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden editar rutinas")

    # 1. Buscar rutina original activa
    old_rutina = db.query(models.Rutina).filter(
        models.Rutina.id_rutina == id_rutina,
        models.Rutina.id_entrenador == current_user.id_usuario,
        models.Rutina.is_active == True
    ).first()

    if not old_rutina:
        raise HTTPException(status_code=404, detail="Rutina activa no encontrada")

    try:
        # 2. Desactivar la rutina original
        old_rutina.is_active = False

        # 3. Crear nueva Rutina (Clonando con version_id incrementado)
        new_rutina_id = uuid4()
        new_rutina = models.Rutina(
            id_rutina=new_rutina_id,
            id_entrenador=current_user.id_usuario,
            nombre_rutina=routine_data.nombre_rutina,
            frecuencia_semanal=routine_data.frecuencia_semanal,
            version_id=old_rutina.version_id + 1,
            is_active=True
        )
        db.add(new_rutina)

        # 4. Insertar la jerarquía profunda clonada/modificada
        for dia_data in routine_data.dias:
            new_dia_id = uuid4()
            new_dia = models.RutinaDia(
                id_dia=new_dia_id,
                id_rutina=new_rutina_id,
                nombre_dia=dia_data.nombre_dia,
                orden=dia_data.orden
            )
            db.add(new_dia)

            for ej_data in dia_data.ejercicios:
                new_ej_id = uuid4()
                new_ej = models.RutinaEjercicio(
                    id_rutina_ejercicio=new_ej_id,
                    id_dia=new_dia_id,
                    id_ejercicio=ej_data.id_ejercicio,
                    series_esperadas=ej_data.series_esperadas,
                    reps_esperadas=ej_data.reps_esperadas,
                    descanso_segundos=ej_data.descanso_segundos,
                    orden=ej_data.orden,
                    nota_entrenador=ej_data.nota_entrenador
                )
                db.add(new_ej)
        
        # Forzar la inserción de la nueva rutina antes de reasignar a los alumnos
        db.flush()

        # 5. Reasignar automáticamente a los alumnos afectados
        alumnos_afectados = db.query(models.Alumno).filter(
            models.Alumno.id_rutina_activa == old_rutina.id_rutina
        ).all()
        for alumno in alumnos_afectados:
            alumno.id_rutina_activa = new_rutina_id

        db.commit()
        db.refresh(new_rutina)
        return new_rutina

    except SQLAlchemyError as e:
        db.rollback()
        print(f"ERROR INTERNO (Actualizar Rutina): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

@router.post("/{id_rutina}/duplicate", response_model=schemas.RutinaOut)
def duplicate_routine(
    id_rutina: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden duplicar rutinas")

    # 1. Buscar rutina original
    old_rutina = db.query(models.Rutina).filter(
        models.Rutina.id_rutina == id_rutina,
        models.Rutina.id_entrenador == current_user.id_usuario,
        models.Rutina.is_active == True
    ).first()

    if not old_rutina:
        raise HTTPException(status_code=404, detail="Rutina activa no encontrada")

    try:
        # 2. Crear nueva Rutina (Copia)
        new_rutina_id = uuid4()
        new_rutina = models.Rutina(
            id_rutina=new_rutina_id,
            id_entrenador=current_user.id_usuario,
            nombre_rutina=old_rutina.nombre_rutina + " (Copia)",
            version_id=1,
            is_active=True,
            frecuencia_semanal=old_rutina.frecuencia_semanal
        )
        db.add(new_rutina)

        # 3. Insertar la jerarquía profunda clonada
        for old_dia in old_rutina.dias:
            new_dia_id = uuid4()
            new_dia = models.RutinaDia(
                id_dia=new_dia_id,
                id_rutina=new_rutina_id,
                nombre_dia=old_dia.nombre_dia,
                orden=old_dia.orden
            )
            db.add(new_dia)

            for old_ej in old_dia.ejercicios:
                new_ej_id = uuid4()
                new_ej = models.RutinaEjercicio(
                    id_rutina_ejercicio=new_ej_id,
                    id_dia=new_dia_id,
                    id_ejercicio=old_ej.id_ejercicio,
                    series_esperadas=old_ej.series_esperadas,
                    reps_esperadas=old_ej.reps_esperadas,
                    descanso_segundos=old_ej.descanso_segundos,
                    orden=old_ej.orden,
                    nota_entrenador=old_ej.nota_entrenador
                )
                db.add(new_ej)

        db.commit()
        db.refresh(new_rutina)
        return new_rutina

    except SQLAlchemyError as e:
        db.rollback()
        print(f"ERROR INTERNO (Duplicar Rutina): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

@router.post("/{id_rutina}/assign")
def assign_routine(
    id_rutina: UUID,
    asignacion: schemas.AsignacionCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden asignar rutinas")

    # Validar que la rutina pertenezca al coach y esté activa
    rutina = db.query(models.Rutina).filter(
        models.Rutina.id_rutina == id_rutina,
        models.Rutina.id_entrenador == current_user.id_usuario,
        models.Rutina.is_active == True
    ).first()
    
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina activa no encontrada")

    # Validar que el alumno pertenezca al coach
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == asignacion.id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no vinculado")

    try:
        # Asignar la rutina activa
        alumno.id_rutina_activa = id_rutina
        db.commit()
        return {"status": "success", "message": "Rutina asignada exitosamente al alumno."}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"ERROR INTERNO (Asignar Rutina): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

@router.post("/{id_rutina}/assign-bulk")
def assign_routine_bulk(
    id_rutina: UUID,
    asignacion: schemas.AsignacionBulkCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden asignar rutinas")

    # Validar que la rutina pertenezca al coach y esté activa
    rutina = db.query(models.Rutina).filter(
        models.Rutina.id_rutina == id_rutina,
        models.Rutina.id_entrenador == current_user.id_usuario,
        models.Rutina.is_active == True
    ).first()
    
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina activa no encontrada")

    try:
        # Filtrar alumnos válidos que pertenezcan al coach
        alumnos = db.query(models.Alumno).filter(
            models.Alumno.id_usuario.in_(asignacion.id_alumnos),
            models.Alumno.id_entrenador == current_user.id_usuario
        ).all()

        for alumno in alumnos:
            alumno.id_rutina_activa = id_rutina

        db.commit()
        return {"status": "success", "message": f"Rutina asignada exitosamente a {len(alumnos)} alumnos."}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"ERROR INTERNO (Asignar Rutina Masiva): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

@router.get("", response_model=List[schemas.RutinaOut])
def get_routines(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo los entrenadores pueden ver sus rutinas")

    # Obtener todas las rutinas activas del entrenador con sus jerarquías
    rutinas = db.query(models.Rutina).filter(
        models.Rutina.id_entrenador == current_user.id_usuario,
        models.Rutina.is_active == True
    ).all()
    
    # Cargar manualmente relaciones si fuera necesario, aunque SQLAlchemy cargará lazy si configuramos las relaciones (esperemos no de error de detached session)
    return rutinas
