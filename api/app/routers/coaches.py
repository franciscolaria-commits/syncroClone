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
