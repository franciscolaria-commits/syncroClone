import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.models import Usuario, Entrenador, Invitacion
from app.schemas import EntrenadorOut, EntrenadorUpdate, InvitacionOut, InvitacionCreate
from app.utils.auth import get_current_user
from app.services.r2 import upload_file_to_r2

router = APIRouter(
    prefix="/api/v1/coaches",
    tags=["entrenadores"]
)

@router.get("/profile", response_model=EntrenadorOut)
def get_coach_profile(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el perfil profesional del entrenador autenticado.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores."
        )
        
    perfil = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de entrenador no encontrado."
        )
        
    return perfil

@router.put("/profile", response_model=EntrenadorOut)
def update_coach_profile(
    profile_data: EntrenadorUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza el perfil profesional del entrenador autenticado.
    Permite modificar la especialidad, biografía y url de la foto de perfil (alojada en R2).
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores."
        )
        
    perfil = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de entrenador no encontrado."
        )
        
    try:
        update_data = profile_data.dict(exclude_unset=True)
        
        # Prevenir modificación accidental
        if "fecha_vencimiento" in update_data:
            del update_data["fecha_vencimiento"]
        if "estado_financiero" in update_data:
            del update_data["estado_financiero"]

        for field, value in update_data.items():
            setattr(perfil, field, value)
            
        db.commit()
        db.refresh(perfil)
        return perfil
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Update Entrenador): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

@router.post("/profile/image", response_model=EntrenadorOut)
async def upload_coach_profile_image(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube una foto de perfil para el entrenador a Cloudflare R2 y actualiza su perfil.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores."
        )
        
    perfil = db.query(Entrenador).filter(Entrenador.id_usuario == current_user.id_usuario).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de entrenador no encontrado."
        )
        
    try:
        # Validate file size (e.g., 5MB limit)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Máximo 5MB.")
            
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        unique_filename = f"profiles/coach_{current_user.id_usuario}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        url_foto = upload_file_to_r2(contents, unique_filename, file.content_type or f"image/{file_ext}")
        if not url_foto:
            raise HTTPException(status_code=500, detail="Error al subir la imagen a Cloudflare R2.")
            
        perfil.url_foto_perfil = url_foto
        db.commit()
        db.refresh(perfil)
        return perfil
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Upload Foto): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

@router.post("/invitations", response_model=InvitacionOut, status_code=status.HTTP_201_CREATED)
def create_invitation(
    invitation_data: InvitacionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera un nuevo código de invitación único (UUIDv4 inquebrantable) 
    para vincular un alumno con este entrenador. Expiración de 7 días.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores."
        )
        
    try:
        # Generar código de invitación obligatoriamente como UUIDv4
        codigo_uuid = uuid.uuid4()
        
        nueva_invitacion = Invitacion(
            id_entrenador=current_user.id_usuario,
            codigo_unico=str(codigo_uuid),
            email_destinatario=None,
            is_used=False,
            fecha_expiracion=datetime.utcnow() + timedelta(days=36500)
        )
        
        db.add(nueva_invitacion)
        db.commit()
        db.refresh(nueva_invitacion)
        
        return nueva_invitacion
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Generar Invitacion): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

@router.get("/invitations", response_model=List[InvitacionOut])
def get_invitations(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas las invitaciones creadas por este entrenador.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para entrenadores."
        )
        
    invitaciones = db.query(Invitacion).filter(Invitacion.id_entrenador == current_user.id_usuario).order_by(Invitacion.fecha_creacion.desc()).all()
    return invitaciones

@router.get("/audits/pending", response_model=List[schemas.LogLigaAlumnoOut])
def get_pending_audits(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores pueden ver auditorías")
        
    logs = db.query(models.LogLigaAlumno).join(
        models.Alumno, models.Alumno.id_usuario == models.LogLigaAlumno.id_alumno
    ).filter(
        models.Alumno.id_entrenador == current_user.id_usuario,
        models.LogLigaAlumno.estado_validacion == "pendiente_auditoria"
    ).all()
    
    # Mapear para incluir nombre del alumno
    result = []
    for log in logs:
        usuario_alumno = db.query(models.Usuario).filter(models.Usuario.id_usuario == log.id_alumno).first()
        log_dict = {
            "id_log": log.id_log,
            "id_alumno": log.id_alumno,
            "alumno_nombre": usuario_alumno.email.split("@")[0] if usuario_alumno else "Alumno", # fallback
            "ejercicio_nombre": log.ejercicio_nombre,
            "nivel_alcanzado": log.nivel_alcanzado,
            "subnivel_alcanzado": log.subnivel_alcanzado,
            "fecha_logro": log.fecha_logro,
            "e1rm_logrado": log.e1rm_logrado
        }
        result.append(log_dict)
        
    return result

@router.get("/audits/attendance_alerts")
def get_attendance_alerts(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores pueden ver alertas")
        
    query = text("""
        WITH TargetWeek AS (
            SELECT DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') AS semana
        ),
        ActiveStudents AS (
            SELECT 
                a.id_usuario AS id_alumno,
                u.email,
                r.frecuencia_semanal,
                tw.semana
            FROM alumnos a
            JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN rutinas r ON a.id_rutina_activa = r.id_rutina
            CROSS JOIN TargetWeek tw
            WHERE a.id_entrenador = :id_entrenador AND a.estado_activo = true
        ),
        SessionDays AS (
            SELECT 
                ses.id_sesion,
                ses.id_alumno,
                DATE_TRUNC('week', ses.fecha_inicio) AS semana,
                re.id_dia,
                COUNT(DISTINCT re.id_ejercicio) AS ejercicios_realizados
            FROM entrenamiento_sesiones ses
            JOIN entrenamiento_sets_reales set_r ON ses.id_sesion = set_r.id_sesion
            JOIN rutinas_ejercicios re ON set_r.id_rutina_ejercicio = re.id_rutina_ejercicio
            WHERE ses.estado = 'completado'
              AND DATE_TRUNC('week', ses.fecha_inicio) = (SELECT semana FROM TargetWeek)
            GROUP BY ses.id_sesion, ses.id_alumno, DATE_TRUNC('week', ses.fecha_inicio), re.id_dia
        ),
        DayTotals AS (
            SELECT id_dia, COUNT(DISTINCT id_ejercicio) AS total_ejercicios
            FROM rutinas_ejercicios
            GROUP BY id_dia
        ),
        SessionStats AS (
            SELECT 
                sd.id_sesion,
                sd.id_alumno,
                sd.semana,
                (sd.ejercicios_realizados::FLOAT / NULLIF(dt.total_ejercicios, 0)) AS completitud,
                ROW_NUMBER() OVER (PARTITION BY sd.id_sesion ORDER BY (sd.ejercicios_realizados::FLOAT / NULLIF(dt.total_ejercicios, 0)) DESC) as rn
            FROM SessionDays sd
            JOIN DayTotals dt ON sd.id_dia = dt.id_dia
        ),
        ValidSessions AS (
            SELECT id_alumno, COUNT(id_sesion) AS asistencias
            FROM SessionStats
            WHERE rn = 1 AND completitud >= 0.6
            GROUP BY id_alumno
        )
        SELECT 
            ast.id_alumno,
            ast.email,
            ast.semana,
            COALESCE(ast.frecuencia_semanal, 3) AS frecuencia_objetivo,
            COALESCE(vs.asistencias, 0) AS asistencias
        FROM ActiveStudents ast
        LEFT JOIN ValidSessions vs ON ast.id_alumno = vs.id_alumno
        WHERE COALESCE(vs.asistencias, 0) < (COALESCE(ast.frecuencia_semanal, 3) * 0.5)
        ORDER BY asistencias ASC
    """)
    result = db.execute(query, {"id_entrenador": current_user.id_usuario}).fetchall()
    
    return [
        {
            "id_alumno": str(row.id_alumno),
            "email": row.email,
            "alumno_nombre": row.email.split("@")[0],
            "semana": row.semana.isoformat() if hasattr(row.semana, 'isoformat') else str(row.semana),
            "frecuencia_objetivo": row.frecuencia_objetivo,
            "asistencias": row.asistencias
        } for row in result
    ]

@router.post("/audits/{id_log}/resolve")
def resolve_audit(
    id_log: str, 
    data: schemas.AuditResolveRequest,
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    log = db.query(models.LogLigaAlumno).filter(models.LogLigaAlumno.id_log == id_log).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log no encontrado")
        
    # Validar que pertenece a un alumno suyo
    alumno = db.query(models.Alumno).filter(models.Alumno.id_usuario == log.id_alumno).first()
    if not alumno or alumno.id_entrenador != current_user.id_usuario:
        raise HTTPException(status_code=403, detail="No tienes permiso sobre este alumno")
        
    if data.action == "aprobar":
        log.estado_validacion = "aprobado_manual"
        db.commit()
        return {"status": "Aprobado", "message": "Récord validado exitosamente."}
    elif data.action == "rechazar":
        log.estado_validacion = "rechazado"
        db.commit()
        return {"status": "Rechazado", "message": "Récord rechazado."}
    else:
        raise HTTPException(status_code=400, detail="Acción inválida")

from sqlalchemy import text

@router.get("/students/{id_alumno}/progress_chart")
def get_student_progress_chart(
    id_alumno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")

    query = text("""
        SELECT ejercicio_nombre, fecha, max_e1rm, max_peso
        FROM mv_student_progress_chart
        WHERE id_alumno = :id_alumno
        ORDER BY fecha ASC
    """)
    result = db.execute(query, {"id_alumno": id_alumno}).fetchall()
    
    return [
        {
            "ejercicio_nombre": row.ejercicio_nombre,
            "fecha": row.fecha.isoformat() if hasattr(row.fecha, 'isoformat') else str(row.fecha),
            "max_e1rm": round(row.max_e1rm, 2),
            "max_peso": round(row.max_peso, 2)
        } for row in result
    ]

@router.get("/students/{id_alumno}/attendance")
def get_student_attendance(
    id_alumno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")
        
    rutina_activa = db.query(models.Rutina).filter(models.Rutina.id_rutina == alumno.id_rutina_activa).first()
    frecuencia_objetivo = rutina_activa.frecuencia_semanal if rutina_activa and rutina_activa.frecuencia_semanal else 3

    query = text("""
        WITH SessionDays AS (
            SELECT 
                ses.id_sesion,
                DATE_TRUNC('week', ses.fecha_inicio) AS semana,
                re.id_dia,
                COUNT(DISTINCT re.id_ejercicio) AS ejercicios_realizados
            FROM entrenamiento_sesiones ses
            JOIN entrenamiento_sets_reales set_r ON ses.id_sesion = set_r.id_sesion
            JOIN rutinas_ejercicios re ON set_r.id_rutina_ejercicio = re.id_rutina_ejercicio
            WHERE ses.id_alumno = :id_alumno 
              AND ses.estado = 'completado'
            GROUP BY ses.id_sesion, DATE_TRUNC('week', ses.fecha_inicio), re.id_dia
        ),
        DayTotals AS (
            SELECT id_dia, COUNT(DISTINCT id_ejercicio) AS total_ejercicios
            FROM rutinas_ejercicios
            GROUP BY id_dia
        ),
        SessionStats AS (
            SELECT 
                sd.id_sesion,
                sd.semana,
                sd.id_dia,
                sd.ejercicios_realizados,
                dt.total_ejercicios,
                (sd.ejercicios_realizados::FLOAT / NULLIF(dt.total_ejercicios, 0)) AS completitud,
                ROW_NUMBER() OVER (PARTITION BY sd.id_sesion ORDER BY (sd.ejercicios_realizados::FLOAT / NULLIF(dt.total_ejercicios, 0)) DESC) as rn
            FROM SessionDays sd
            JOIN DayTotals dt ON sd.id_dia = dt.id_dia
        ),
        ValidSessions AS (
            SELECT id_sesion, semana
            FROM SessionStats
            WHERE rn = 1 AND completitud >= 0.6
        )
        SELECT 
            semana,
            COUNT(id_sesion) AS asistencias
        FROM ValidSessions
        GROUP BY semana
        ORDER BY semana DESC
        LIMIT 10
    """)
    result = db.execute(query, {"id_alumno": id_alumno}).fetchall()
    
    return {
        "frecuencia_objetivo": frecuencia_objetivo,
        "asistencias_por_semana": [
            {
                "semana": row.semana.isoformat() if hasattr(row.semana, 'isoformat') else str(row.semana),
                "asistencias": row.asistencias
            } for row in result
        ]
    }


# ==========================================
# ENDPOINTS DE ESTADÍSTICAS Y PROGRESO (VISTA DEL ENTRENADOR)
# ==========================================

@router.get("/students/{id_alumno}/stats")
def get_student_stats_for_coach(
    id_alumno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve las estadísticas completas del alumno para el entrenador."""
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")

    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")

    from sqlalchemy import func, text
    from datetime import timedelta

    total_sessions = db.query(models.EntrenamientoSesion).filter(
        models.EntrenamientoSesion.id_alumno == id_alumno,
        models.EntrenamientoSesion.estado == "completado"
    ).count()

    stats_row = db.query(
        func.sum(models.EntrenamientoSetReal.peso_usado * models.EntrenamientoSetReal.reps_logradas).label("volume"),
        func.sum(models.EntrenamientoSetReal.reps_logradas).label("reps")
    ).join(
        models.EntrenamientoSesion,
        models.EntrenamientoSesion.id_sesion == models.EntrenamientoSetReal.id_sesion
    ).filter(
        models.EntrenamientoSesion.id_alumno == id_alumno,
        models.EntrenamientoSesion.estado == "completado"
    ).first()

    volume = stats_row.volume or 0.0
    reps = stats_row.reps or 0
    win_rate_percentage = 80.0 if total_sessions > 0 else 0.0

    # Rolling adherence (últimos 30 días)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sessions_last_30 = db.query(models.EntrenamientoSesion).filter(
        models.EntrenamientoSesion.id_alumno == id_alumno,
        models.EntrenamientoSesion.estado == "completado",
        models.EntrenamientoSesion.fecha_fin >= thirty_days_ago
    ).count()

    frecuencia = 3
    if alumno.id_rutina_activa:
        rutina = db.query(models.Rutina).filter(models.Rutina.id_rutina == alumno.id_rutina_activa).first()
        if rutina:
            frecuencia = rutina.frecuencia_semanal

    expected_sessions = (frecuencia / 7.0) * 30.0
    rolling_adherence = min(100.0, (sessions_last_30 / expected_sessions) * 100.0) if expected_sessions > 0 else 0.0

    # Rep maxes desde materialized view
    mv_records = db.execute(text(
        "SELECT re.nombre, mv.rep_range, mv.max_peso "
        "FROM mv_rep_maxes mv "
        "JOIN ejercicios re ON mv.id_ejercicio = re.id_ejercicio "
        "WHERE mv.id_alumno = :id_alumno"
    ), {"id_alumno": id_alumno}).fetchall()

    rep_maxes = {}
    for row in mv_records:
        nombre_ej = row[0]
        rango = row[1]
        peso = float(row[2])
        if nombre_ej not in rep_maxes:
            rep_maxes[nombre_ej] = {}
        rep_maxes[nombre_ej][rango] = peso

    return {
        "total_sessions": total_sessions,
        "total_volume_kg": float(volume),
        "total_reps": int(reps),
        "win_rate_percentage": float(win_rate_percentage),
        "rolling_adherence": float(rolling_adherence),
        "rep_maxes": rep_maxes
    }


@router.get("/students/{id_alumno}/league")
def get_student_league_for_coach(
    id_alumno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve el estado de ligas/fuerza relativa del alumno para el entrenador."""
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")

    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")

    peso_corporal = alumno.peso_corporal_actual or 70.0

    MAPEO_PILARES = {
        "Press Banca": "Press Banca",
        "Sentadilla": "Sentadilla",
        "Peso Muerto": "Peso Muerto",
        "Press Militar": "Press Militar",
        "Dominadas": "Dominadas"
    }

    result = []
    for pilar, nombre_largo in MAPEO_PILARES.items():
        ejercicio = db.query(models.Ejercicio).filter(models.Ejercicio.nombre == nombre_largo).first()
        if not ejercicio:
            continue

        historial = db.query(models.HistorialEjercicioAlumno).filter(
            models.HistorialEjercicioAlumno.id_alumno == id_alumno,
            models.HistorialEjercicioAlumno.id_ejercicio == ejercicio.id_ejercicio
        ).first()

        e1rm_actual = historial.last_e1rm if historial else 0.0
        multiplicador_actual = e1rm_actual / peso_corporal if peso_corporal > 0 else 0.0

        umbral_alcanzado = db.query(models.GamificacionUmbral).filter(
            models.GamificacionUmbral.ejercicio_nombre == pilar,
            models.GamificacionUmbral.multiplicador_requerido <= multiplicador_actual
        ).order_by(models.GamificacionUmbral.multiplicador_requerido.desc()).first()

        nivel_actual = umbral_alcanzado.nivel_nombre if umbral_alcanzado else "Sin Nivel"
        subnivel_actual = umbral_alcanzado.subnivel if umbral_alcanzado else 0

        proximo_umbral = db.query(models.GamificacionUmbral).filter(
            models.GamificacionUmbral.ejercicio_nombre == pilar,
            models.GamificacionUmbral.multiplicador_requerido > multiplicador_actual
        ).order_by(models.GamificacionUmbral.multiplicador_requerido.asc()).first()

        peso_faltante = 0.0
        proximo_nivel = None
        proximo_subnivel = None

        if proximo_umbral:
            e1rm_necesario = proximo_umbral.multiplicador_requerido * peso_corporal
            peso_faltante = e1rm_necesario - e1rm_actual
            proximo_nivel = proximo_umbral.nivel_nombre
            proximo_subnivel = proximo_umbral.subnivel

        auditoria = db.query(models.LogLigaAlumno).filter(
            models.LogLigaAlumno.id_alumno == id_alumno,
            models.LogLigaAlumno.ejercicio_nombre == pilar,
            models.LogLigaAlumno.estado_validacion == "pendiente_auditoria"
        ).first()

        result.append({
            "ejercicio_nombre": pilar,
            "e1rm_actual": e1rm_actual,
            "multiplicador_actual": multiplicador_actual,
            "nivel_actual": nivel_actual,
            "subnivel_actual": subnivel_actual,
            "peso_faltante_proximo_nivel": max(0.0, peso_faltante),
            "proximo_nivel": proximo_nivel,
            "proximo_subnivel": proximo_subnivel,
            "is_pending_audit": auditoria is not None
        })

    return result


@router.get("/students/{id_alumno}/history")
def get_student_history_for_coach(
    id_alumno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Devuelve el historial de sesiones del alumno para el entrenador."""
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")

    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")

    from sqlalchemy.orm import joinedload

    sesiones = db.query(models.EntrenamientoSesion).options(
        joinedload(models.EntrenamientoSesion.sets).joinedload(models.EntrenamientoSetReal.rutina_ejercicio).joinedload(models.RutinaEjercicio.ejercicio),
        joinedload(models.EntrenamientoSesion.sets).joinedload(models.EntrenamientoSetReal.rutina_ejercicio).joinedload(models.RutinaEjercicio.dia)
    ).filter(
        models.EntrenamientoSesion.id_alumno == id_alumno,
        models.EntrenamientoSesion.estado == "completado"
    ).order_by(models.EntrenamientoSesion.fecha_fin.desc()).all()

    for sesion in sesiones:
        if sesion.sets and sesion.sets[0].rutina_ejercicio and sesion.sets[0].rutina_ejercicio.dia:
            sesion.nombre_dia = sesion.sets[0].rutina_ejercicio.dia.nombre_dia

    return sesiones


# ==========================================
# ENDPOINTS DE FINANZAS Y SUSPENSIÓN
# ==========================================

@router.get("/payments", response_model=List[schemas.EstadoPagoAlumnoResponse])
def get_payments_status(
    anio_mes: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumnos = db.query(models.Alumno).filter(models.Alumno.id_entrenador == current_user.id_usuario).all()
    
    pagos = db.query(models.PagoAlumno).filter(
        models.PagoAlumno.id_entrenador == current_user.id_usuario,
        models.PagoAlumno.anio_mes == anio_mes
    ).all()
    
    pagos_dict = {str(p.id_alumno): p for p in pagos}
    
    ahora = datetime.utcnow()
    
    result = []
    for al in alumnos:
        usuario_al = db.query(models.Usuario).filter(models.Usuario.id_usuario == al.id_usuario).first()
        pago = pagos_dict.get(str(al.id_usuario))
        
        dias_para_vencer = None
        if al.fecha_vencimiento_pago:
            # calculo truncando las horas
            vencimiento_solo_dia = al.fecha_vencimiento_pago.replace(hour=0, minute=0, second=0, microsecond=0)
            hoy_solo_dia = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
            dias_para_vencer = (vencimiento_solo_dia - hoy_solo_dia).days
        
        result.append({
            "id_alumno": al.id_usuario,
            "nombre_alumno": usuario_al.email.split("@")[0] if usuario_al else "Alumno",
            "email_alumno": usuario_al.email if usuario_al else "",
            "telefono_alumno": usuario_al.telefono if usuario_al else None,
            "estado_activo": al.estado_activo,
            "pagado": True if pago else False,
            "pago": pago,
            "fecha_vencimiento_pago": al.fecha_vencimiento_pago,
            "dias_para_vencer": dias_para_vencer,
            "bloqueado_por_pago": al.bloqueado_por_pago
        })
        
    return result

@router.get("/finances/summary", response_model=schemas.CoachFinanceSummary)
def get_finances_summary(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    current_anio_mes = datetime.utcnow().strftime("%Y-%m")
    
    entrenador = db.query(models.Entrenador).filter(models.Entrenador.id_usuario == current_user.id_usuario).first()
    alumnos_activos = db.query(models.Alumno).filter(
        models.Alumno.id_entrenador == current_user.id_usuario, 
        models.Alumno.estado_activo == True
    ).all()
    
    cant_alumnos = len(alumnos_activos)
    
    pagos_mes = db.query(models.PagoAlumno).filter(
        models.PagoAlumno.id_entrenador == current_user.id_usuario,
        models.PagoAlumno.anio_mes == current_anio_mes
    ).all()
    
    alumnos_pagados_ids = {p.id_alumno for p in pagos_mes}
    alumnos_pagados = len(alumnos_pagados_ids)
    
    # Pendientes son los activos que NO pagaron
    alumnos_pendientes = 0
    for al in alumnos_activos:
        if al.id_usuario not in alumnos_pagados_ids:
            alumnos_pendientes += 1
            
    ingreso_real = sum([p.monto or 0 for p in pagos_mes])
    
    ingreso_esperado = None
    deuda_pendiente = None
    if entrenador.tipo_cobro_alumnos == "por_alumno" and entrenador.precio_cobro_alumnos is not None:
        ingreso_esperado = cant_alumnos * entrenador.precio_cobro_alumnos
        deuda_pendiente = ingreso_esperado - ingreso_real
        if deuda_pendiente < 0: deuda_pendiente = 0
    elif entrenador.tipo_cobro_alumnos == "fijo" and entrenador.precio_cobro_alumnos is not None:
        ingreso_esperado = entrenador.precio_cobro_alumnos
        deuda_pendiente = ingreso_esperado - ingreso_real
        if deuda_pendiente < 0: deuda_pendiente = 0

    # Historial últimos 12 meses
    historial = []
    from sqlalchemy import func
    meses_anteriores = db.query(
        models.PagoAlumno.anio_mes, 
        func.sum(models.PagoAlumno.monto).label('total')
    ).filter(models.PagoAlumno.id_entrenador == current_user.id_usuario)\
     .group_by(models.PagoAlumno.anio_mes)\
     .order_by(models.PagoAlumno.anio_mes.desc())\
     .limit(12).all()
     
    for anio_mes, total in reversed(meses_anteriores):
        historial.append({
            "mes": anio_mes,
            "ingresos": total or 0
        })
        
    return {
        "ingreso_real_mes": ingreso_real,
        "ingreso_esperado_mes": ingreso_esperado,
        "deuda_pendiente": deuda_pendiente,
        "alumnos_pagados": alumnos_pagados,
        "alumnos_pendientes": alumnos_pendientes,
        "cant_alumnos": cant_alumnos,
        "historial": historial
    }

@router.post("/payments", response_model=schemas.PagoAlumnoOut)
def register_payment(
    pago_data: schemas.PagoAlumnoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == pago_data.id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    pago_existente = db.query(models.PagoAlumno).filter(
        models.PagoAlumno.id_alumno == pago_data.id_alumno,
        models.PagoAlumno.anio_mes == pago_data.anio_mes
    ).first()
    
    if pago_existente:
        pago_existente.monto = pago_data.monto
        pago_existente.metodo_pago = pago_data.metodo_pago
        pago_existente.notas = pago_data.notas
        pago_existente.fecha_pago = datetime.utcnow()
        db.refresh(pago_existente)
    else:
        nuevo_pago = models.PagoAlumno(
            id_alumno=pago_data.id_alumno,
            id_entrenador=current_user.id_usuario,
            anio_mes=pago_data.anio_mes,
            monto=pago_data.monto,
            metodo_pago=pago_data.metodo_pago,
            notas=pago_data.notas
        )
        db.add(nuevo_pago)
        
    # Obtener configuración del entrenador para saber cómo sumar el tiempo
    entrenador_config = db.query(models.Entrenador).filter(models.Entrenador.id_usuario == current_user.id_usuario).first()
    
    if not alumno.fecha_vencimiento_pago:
        alumno.fecha_vencimiento_pago = datetime.utcnow() + timedelta(days=30)
    else:
        if entrenador_config and entrenador_config.config_vencimiento_tipo == "fijo_por_alumno":
            # Para este modo, la fecha base siempre es la fecha de vencimiento anterior,
            # sin importar si pagó tarde, para mantener intacto su número de día.
            base_date = alumno.fecha_vencimiento_pago
            
            # Sumar exactamente 1 mes manteniendo el mismo día
            import calendar
            mes = base_date.month + 1
            anio = base_date.year
            if mes > 12:
                mes = 1
                anio += 1
            dia_original = alumno.fecha_vencimiento_pago.day
            _, ultimo_dia_mes = calendar.monthrange(anio, mes)
            nuevo_dia = min(dia_original, ultimo_dia_mes)
            alumno.fecha_vencimiento_pago = base_date.replace(year=anio, month=mes, day=nuevo_dia)
        else:
            # Lógica anterior de +30 días: si estaba vencido, cuenta desde hoy
            ahora = datetime.utcnow()
            base_date = alumno.fecha_vencimiento_pago if alumno.fecha_vencimiento_pago >= ahora else ahora
            alumno.fecha_vencimiento_pago = base_date + timedelta(days=30)
            
    alumno.bloqueado_por_pago = False
    alumno.recordatorio_enviado_2_dias = False
    alumno.recordatorio_enviado_hoy = False
    
    db.commit()
    
    if pago_existente:
        return pago_existente
    else:
        db.refresh(nuevo_pago)
        return nuevo_pago

@router.delete("/payments/{id_pago}")
def delete_payment(
    id_pago: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    pago = db.query(models.PagoAlumno).filter(
        models.PagoAlumno.id_pago == id_pago,
        models.PagoAlumno.id_entrenador == current_user.id_usuario
    ).first()
    
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    db.delete(pago)
    db.commit()
    return {"status": "ok", "message": "Pago eliminado"}

@router.patch("/students/{id_alumno}/payment_date")
def update_payment_date(
    id_alumno: str,
    data: schemas.UpdatePaymentDate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    hoy = datetime.utcnow()
    dia = data.dia_vencimiento_personalizado
    
    mes = hoy.month
    anio = hoy.year
    # Si el día ya pasó este mes, cuenta para el mes siguiente
    if hoy.day >= dia:
        mes += 1
        if mes > 12:
            mes = 1
            anio += 1
                
    # Asegurar que el día sea válido para el mes calculado (ej. febrero 28)
    import calendar
    _, ultimo_dia_mes = calendar.monthrange(anio, mes)
    if dia > ultimo_dia_mes:
        dia = ultimo_dia_mes
        
    alumno.fecha_vencimiento_pago = hoy.replace(year=anio, month=mes, day=dia, hour=0, minute=0, second=0, microsecond=0)
    db.commit()
    
    return {"status": "ok", "fecha_vencimiento_pago": alumno.fecha_vencimiento_pago}

@router.patch("/students/{id_alumno}/suspend")
def suspend_student(
    id_alumno: str,
    data: schemas.SuspensionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Sólo entrenadores")
        
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    alumno.estado_activo = data.estado_activo
    
    # Si se envía un día de vencimiento personalizado al reactivar
    if data.estado_activo and data.dia_vencimiento_personalizado is not None:
        hoy = datetime.utcnow()
        mes = hoy.month
        anio = hoy.year
        dia = data.dia_vencimiento_personalizado
        
        # Si el día ya pasó este mes, el vencimiento es el mes siguiente
        if hoy.day >= dia:
            mes += 1
            if mes > 12:
                mes = 1
                anio += 1
                
        # Asegurarnos de que el día sea válido para el mes calculado
        import calendar
        _, ultimo_dia_mes = calendar.monthrange(anio, mes)
        if dia > ultimo_dia_mes:
            dia = ultimo_dia_mes
            
        alumno.fecha_vencimiento_pago = hoy.replace(year=anio, month=mes, day=dia, hour=0, minute=0, second=0, microsecond=0)
        
    db.commit()
    return {"status": "ok", "estado_activo": alumno.estado_activo}


# ==========================================
# ENDPOINT DE IMPORTACIÓN DE RUTINAS
# ==========================================

from pydantic import BaseModel

class ImportSetItem(BaseModel):
    peso_usado: float = 0.0
    reps_logradas: int = 0

class ImportEjercicioItem(BaseModel):
    nombre_ejercicio: str
    series: int = 3
    reps_objetivo: str = "10"
    peso_sugerido: float = 0.0
    rir: int | None = None
    historial: list[ImportSetItem] = []

class ImportDiaItem(BaseModel):
    nombre_dia: str
    ejercicios: list[ImportEjercicioItem] = []

class ImportRoutineRequest(BaseModel):
    id_alumno: str
    nombre_rutina: str
    frecuencia_semanal: int = 3
    asignar_al_alumno: bool = True
    dias: list[ImportDiaItem] = []

@router.post("/import_routine")
def import_routine(
    data: ImportRoutineRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Importa una rutina completa con historial desde el frontend (archivo parseado).
    Crea ejercicios si no existen, construye la rutina, y registra el historial.
    """
    if current_user.rol != "entrenador":
        raise HTTPException(status_code=403, detail="Solo entrenadores pueden importar rutinas")

    # 1. Verificar que el alumno pertenece a este entrenador
    alumno = db.query(models.Alumno).filter(
        models.Alumno.id_usuario == data.id_alumno,
        models.Alumno.id_entrenador == current_user.id_usuario
    ).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no autorizado")

    created_exercises = []
    reused_exercises = []
    exercise_id_map = {}  # nombre_lower -> id_ejercicio

    # 2. Resolver/crear ejercicios
    for dia in data.dias:
        for ex_item in dia.ejercicios:
            nombre_lower = ex_item.nombre_ejercicio.strip().lower()
            if nombre_lower in exercise_id_map:
                continue

            # Buscar ejercicio global (id_entrenador = null)
            ejercicio_global = db.query(models.Ejercicio).filter(
                models.Ejercicio.id_entrenador == None,
                models.Ejercicio.nombre.ilike(ex_item.nombre_ejercicio.strip())
            ).first()

            if ejercicio_global:
                exercise_id_map[nombre_lower] = ejercicio_global.id_ejercicio
                reused_exercises.append(ejercicio_global.nombre)
                continue

            # Buscar ejercicio propio del entrenador
            ejercicio_propio = db.query(models.Ejercicio).filter(
                models.Ejercicio.id_entrenador == current_user.id_usuario,
                models.Ejercicio.nombre.ilike(ex_item.nombre_ejercicio.strip())
            ).first()

            if ejercicio_propio:
                exercise_id_map[nombre_lower] = ejercicio_propio.id_ejercicio
                reused_exercises.append(ejercicio_propio.nombre)
                continue

            # Crear ejercicio nuevo del entrenador
            nuevo = models.Ejercicio(
                id_ejercicio=uuid.uuid4(),
                nombre=ex_item.nombre_ejercicio.strip(),
                descripcion="Importado desde archivo",
                categoria="General",
                id_entrenador=current_user.id_usuario
            )
            db.add(nuevo)
            db.flush()  # Para obtener el id sin commit
            exercise_id_map[nombre_lower] = nuevo.id_ejercicio
            created_exercises.append(nuevo.nombre)

    # 3. Crear la rutina
    rutina = models.Rutina(
        id_rutina=uuid.uuid4(),
        id_entrenador=current_user.id_usuario,
        nombre_rutina=data.nombre_rutina.strip(),
        frecuencia_semanal=data.frecuencia_semanal,
        is_active=True
    )
    db.add(rutina)
    db.flush()

    # 4. Crear los días y ejercicios de la rutina
    rutina_ejercicio_map = {}  # (dia_idx, nombre_lower) -> id_rutina_ejercicio

    for dia_idx, dia in enumerate(data.dias):
        nombre_dia = dia.nombre_dia.strip() if dia.nombre_dia.strip() else f"Día {dia_idx + 1}"
        rutina_dia = models.RutinaDia(
            id_dia=uuid.uuid4(),
            id_rutina=rutina.id_rutina,
            nombre_dia=nombre_dia,
            orden=dia_idx
        )
        db.add(rutina_dia)
        db.flush()

        for ex_idx, ex_item in enumerate(dia.ejercicios):
            nombre_lower = ex_item.nombre_ejercicio.strip().lower()
            id_ejercicio = exercise_id_map.get(nombre_lower)
            if not id_ejercicio:
                continue

            # Parsear reps_objetivo: si es "8-10" tomamos el primer número
            reps_num = 10
            try:
                reps_str = str(ex_item.reps_objetivo).split('-')[0].strip()
                reps_num = int(float(reps_str))
            except (ValueError, AttributeError):
                reps_num = 10

            rutina_ejercicio = models.RutinaEjercicio(
                id_rutina_ejercicio=uuid.uuid4(),
                id_dia=rutina_dia.id_dia,
                id_ejercicio=id_ejercicio,
                series_esperadas=max(1, ex_item.series),
                reps_esperadas=max(1, reps_num),
                orden=ex_idx,
                nota_entrenador=f"RIR: {ex_item.rir}" if ex_item.rir is not None else None
            )
            db.add(rutina_ejercicio)
            db.flush()
            rutina_ejercicio_map[(dia_idx, nombre_lower)] = rutina_ejercicio.id_rutina_ejercicio

    # 5. Crear historial si hay sets con datos
    sesiones_creadas = 0
    for dia_idx, dia in enumerate(data.dias):
        for ex_item in dia.ejercicios:
            nombre_lower = ex_item.nombre_ejercicio.strip().lower()
            id_re = rutina_ejercicio_map.get((dia_idx, nombre_lower))
            if not id_re or not ex_item.historial:
                continue

            # Filtrar sets con datos reales
            sets_validos = [s for s in ex_item.historial if s.reps_logradas > 0]
            if not sets_validos:
                continue

            # Crear una sesión histórica por cada ejercicio con datos
            sesion = models.EntrenamientoSesion(
                id_sesion=uuid.uuid4(),
                id_alumno=data.id_alumno,
                id_rutina=rutina.id_rutina,
                fecha_inicio=datetime.utcnow(),
                fecha_fin=datetime.utcnow(),
                estado="completado"
            )
            db.add(sesion)
            db.flush()
            sesiones_creadas += 1

            for set_item in sets_validos:
                set_real = models.EntrenamientoSetReal(
                    id_set=uuid.uuid4(),
                    id_sesion=sesion.id_sesion,
                    id_rutina_ejercicio=id_re,
                    peso_usado=max(0.0, set_item.peso_usado),
                    reps_logradas=max(0, set_item.reps_logradas),
                    rpe=None
                )
                db.add(set_real)

    # 6. Asignar rutina al alumno si se indicó
    if data.asignar_al_alumno:
        alumno.id_rutina_activa = rutina.id_rutina

    db.commit()

    return {
        "success": True,
        "id_rutina": str(rutina.id_rutina),
        "nombre_rutina": rutina.nombre_rutina,
        "ejercicios_creados": created_exercises,
        "ejercicios_reutilizados": reused_exercises,
        "dias_creados": len(data.dias),
        "sesiones_historial_creadas": sesiones_creadas,
        "asignada_al_alumno": data.asignar_al_alumno
    }

