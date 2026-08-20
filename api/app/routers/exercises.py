from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import Usuario, Ejercicio, EjercicioMediaCoach
from app.schemas import EjercicioOut, EjercicioCreate, EjercicioUpdate
from pydantic import BaseModel
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/exercises",
    tags=["catálogo de ejercicios"]
)

@router.get("", response_model=List[EjercicioOut])
def get_exercises(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el catálogo maestro de ejercicios.
    Retorna tanto los ejercicios globales del sistema (id_entrenador es NULL)
    como los ejercicios personalizados creados por el entrenador autenticado.
    """
    # Determinar qué id_entrenador buscar para overrides
    id_entrenador_target = None

    if current_user.rol == "alumno":
        from app.models import Alumno
        alumno = db.query(Alumno).filter(Alumno.id_usuario == current_user.id_usuario).first()
        if not alumno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alumno no registrado correctamente."
            )
        id_entrenador_target = alumno.id_entrenador
    elif current_user.rol == "entrenador":
        id_entrenador_target = current_user.id_usuario
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol de usuario inválido."
        )

    # Buscar ejercicios globales y del entrenador
    ejercicios = db.query(Ejercicio).filter(
        or_(
            Ejercicio.id_entrenador == None,
            Ejercicio.id_entrenador == id_entrenador_target
        )
    ).all()

    # Buscar los overrides del entrenador
    overrides = db.query(EjercicioMediaCoach).filter(
        EjercicioMediaCoach.id_entrenador == id_entrenador_target
    ).all()
    override_map = {str(o.id_ejercicio): {"url_media": o.url_media, "url_gif": o.url_gif} for o in overrides}

    # Inyectar el url_media y url_gif sobrescrito (si existe) en los ejercicios globales
    result = []
    for ex in ejercicios:
        omap = override_map.get(str(ex.id_ejercicio), {})
        
        ex_dict = {
            "id_ejercicio": ex.id_ejercicio,
            "nombre": ex.nombre,
            "descripcion": ex.descripcion,
            "categoria": ex.categoria,
            "url_media": omap.get("url_media") if str(ex.id_ejercicio) in override_map and omap.get("url_media") is not None else ex.url_media,
            "url_gif": omap.get("url_gif") if str(ex.id_ejercicio) in override_map and omap.get("url_gif") is not None else ex.url_gif,
            "es_con_peso": ex.es_con_peso,
            "tipo_banda": ex.tipo_banda,
            "id_entrenador": ex.id_entrenador
        }
        result.append(ex_dict)
        
    return result

@router.post("/custom", response_model=EjercicioOut, status_code=status.HTTP_201_CREATED)
def create_custom_exercise(
    exercise_data: EjercicioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite a un entrenador crear un ejercicio personalizado en su catálogo.
    Guarda el registro vinculando su id_entrenador y la URL multimedia de R2.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores para crear ejercicios personalizados."
        )
        
    try:
        nuevo_ejercicio = Ejercicio(
            nombre=exercise_data.nombre,
            descripcion=exercise_data.descripcion,
            categoria=exercise_data.categoria,
            url_media=exercise_data.url_media,
            url_gif=exercise_data.url_gif,
            es_con_peso=exercise_data.es_con_peso if exercise_data.es_con_peso is not None else True,
            tipo_banda=exercise_data.tipo_banda,
            id_entrenador=current_user.id_usuario
        )
        db.add(nuevo_ejercicio)
        db.commit()
        db.refresh(nuevo_ejercicio)
        return nuevo_ejercicio
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Crear Ejercicio Custom): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

class OverrideMediaRequest(BaseModel):
    url_media: Optional[str] = None
    url_gif: Optional[str] = None

@router.post("/{id_ejercicio}/media", status_code=status.HTTP_200_OK)
def override_exercise_media(
    id_ejercicio: str,
    payload: OverrideMediaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Solo entrenadores pueden sobrescribir media.")
    
    override = db.query(EjercicioMediaCoach).filter(
        EjercicioMediaCoach.id_ejercicio == id_ejercicio,
        EjercicioMediaCoach.id_entrenador == current_user.id_usuario
    ).first()
    
    try:
        if override:
            if payload.url_media is not None:
                override.url_media = payload.url_media
            if payload.url_gif is not None:
                override.url_gif = payload.url_gif
        else:
            override = EjercicioMediaCoach(
                id_ejercicio=id_ejercicio,
                id_entrenador=current_user.id_usuario,
                url_media=payload.url_media,
                url_gif=payload.url_gif
            )
            db.add(override)
        db.commit()
        return {"message": "Media actualizada correctamente"}
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Guardar Video Override): {str(e)}")
        raise HTTPException(status_code=500, detail="Ocurrió un error interno en el servidor.")

@router.put("/{ejercicio_id}", response_model=EjercicioOut)
def update_custom_exercise(
    ejercicio_id: UUID,
    exercise_data: EjercicioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores pueden modificar ejercicios.")
        
    ejercicio = db.query(Ejercicio).filter(Ejercicio.id_ejercicio == ejercicio_id).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")
        
    if ejercicio.id_entrenador != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No puedes modificar un ejercicio global o de otro entrenador.")
        
    if exercise_data.nombre is not None:
        ejercicio.nombre = exercise_data.nombre
    if exercise_data.descripcion is not None:
        ejercicio.descripcion = exercise_data.descripcion
    if exercise_data.categoria is not None:
        ejercicio.categoria = exercise_data.categoria
    if exercise_data.url_media is not None:
        ejercicio.url_media = exercise_data.url_media
    if exercise_data.url_gif is not None:
        ejercicio.url_gif = exercise_data.url_gif
    if exercise_data.es_con_peso is not None:
        ejercicio.es_con_peso = exercise_data.es_con_peso
    if exercise_data.tipo_banda is not None:
        ejercicio.tipo_banda = exercise_data.tipo_banda
        
    db.commit()
    db.refresh(ejercicio)
    return ejercicio

@router.delete("/{ejercicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_exercise(
    ejercicio_id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores pueden eliminar ejercicios.")
        
    ejercicio = db.query(Ejercicio).filter(Ejercicio.id_ejercicio == ejercicio_id).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")
        
    if ejercicio.id_entrenador != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No puedes eliminar un ejercicio global o de otro entrenador.")
        
    try:
        db.delete(ejercicio)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el ejercicio. Es posible que esté en uso en alguna rutina.")
