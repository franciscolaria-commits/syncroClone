import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models import Usuario, Entrenador, Alumno, Invitacion
from app.schemas import UsuarioCreate, UsuarioOut, AlumnoCreate, AlumnoOut, Token
from app.utils.auth import (
    generar_hash_password,
    verificar_password,
    crear_token_acceso
)
from app.utils.rate_limit import limiter

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["autenticación"]
)

@router.post("/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def register_coach(user_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con rol de Entrenador profesional.
    Crea tanto el registro principal en 'usuarios' como el secundario en 'entrenadores'.
    """
    if user_data.rol != "entrenador":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint es exclusivo para el registro de entrenadores profesionales."
        )
        
    # Verificar si el email ya existe
    existing_user = db.query(Usuario).filter(Usuario.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
        
    try:
        # Crear usuario principal
        hashed_password = generar_hash_password(user_data.password)
        nuevo_usuario = Usuario(
            email=user_data.email.lower(),
            password_hash=hashed_password,
            rol="entrenador"
        )
        db.add(nuevo_usuario)
        db.flush() # Obtener id_usuario generado por la base de datos
        
        # Crear perfil del entrenador asociado (suspendido por defecto)
        nuevo_entrenador = Entrenador(
            id_usuario=nuevo_usuario.id_usuario,
            especialidad=None,
            biografia=None,
            url_foto_perfil=None,
            estado_financiero="suspendido"
        )
        db.add(nuevo_entrenador)
        db.commit()
        db.refresh(nuevo_usuario)
        
        return nuevo_usuario
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Registro Entrenador): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

@router.post("/register-student", response_model=AlumnoOut, status_code=status.HTTP_201_CREATED)
def register_student(student_data: AlumnoCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con rol de Alumno.
    Valida estrictamente el código de invitación provisto por el entrenador.
    Asocia el alumno al entrenador y marca la invitación como utilizada.
    """
    # 1. Verificar si el email ya existe
    existing_user = db.query(Usuario).filter(Usuario.email == student_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
        
    # 2. Validar el código de invitación o el email del entrenador
    input_coach = student_data.codigo_invitacion.strip()
    id_entrenador = None
    
    if "@" in input_coach:
        # Buscar por email
        coach_user = db.query(Usuario).filter(Usuario.email == input_coach.lower(), Usuario.rol == "entrenador").first()
        if coach_user:
            entrenador_obj = db.query(Entrenador).filter(Entrenador.id_usuario == coach_user.id_usuario).first()
            if entrenador_obj:
                id_entrenador = entrenador_obj.id_usuario
        
        if not id_entrenador:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró un entrenador con ese correo electrónico."
            )
    else:
        # Buscar por UUID de invitación
        invitacion = db.query(Invitacion).filter(Invitacion.codigo_unico == input_coach).first()
        if not invitacion:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código de invitación proporcionado es inválido o no existe."
            )
        id_entrenador = invitacion.id_entrenador
        
    try:
        # 3. Crear usuario principal (Alumno)
        hashed_password = generar_hash_password(student_data.password)
        nuevo_usuario = Usuario(
            email=student_data.email.lower(),
            password_hash=hashed_password,
            rol="alumno",
            telefono=student_data.telefono
        )
        db.add(nuevo_usuario)
        db.flush()
        
        # 4. Obtener config del entrenador para setear default_status y vencimiento
        entrenador_config = db.query(Entrenador).filter(Entrenador.id_usuario == id_entrenador).first()
        is_activo = True
        vencimiento = None
        
        if entrenador_config:
            is_activo = (entrenador_config.config_estado_alumno_default == "activo")
            if entrenador_config.config_vencimiento_tipo == "fijo" and entrenador_config.config_vencimiento_dia:
                hoy = datetime.utcnow()
                dia = entrenador_config.config_vencimiento_dia
                mes = hoy.month
                anio = hoy.year
                # Si el dia ya paso este mes, vencimiento el mes que viene
                if hoy.day >= dia:
                    mes += 1
                    if mes > 12:
                        mes = 1
                        anio += 1
                try:
                    vencimiento = hoy.replace(year=anio, month=mes, day=dia, hour=0, minute=0, second=0, microsecond=0)
                except ValueError:
                    # Ej: 30 de febrero
                    vencimiento = hoy.replace(year=anio, month=mes, day=28, hour=0, minute=0, second=0, microsecond=0)
            elif entrenador_config.config_vencimiento_tipo == "fijo_por_alumno":
                # Fijo por alumno: el campo arranca vacío, el entrenador lo define al activar
                vencimiento = None
            else:
                # Individual: vence en 30 días exactos desde que se registra
                vencimiento = datetime.utcnow() + timedelta(days=30)
                
        # 5. Crear perfil de Alumno asociado al entrenador
        nuevo_alumno = Alumno(
            id_usuario=nuevo_usuario.id_usuario,
            id_entrenador=id_entrenador,
            peso_corporal_actual=student_data.peso_corporal_actual,
            objetivo=student_data.objetivo,
            estado_activo=is_activo,
            fecha_vencimiento_pago=vencimiento
        )
        db.add(nuevo_alumno)
        
        # 5. La invitación ya no se inahbilita (códigos reutilizables)
        # invitacion.is_used = True
        
        db.commit()
        db.refresh(nuevo_alumno)
        return nuevo_alumno
    except Exception as e:
        db.rollback()
        print(f"ERROR INTERNO (Registro Alumno): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error interno en el servidor."
        )

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint para autenticar usuarios mediante OAuth2.
    Valida las credenciales y retorna un token de acceso JWT.
    """
    # 1. Validar si es el SuperAdmin B2B
    SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL")
    SUPERADMIN_PASSWORD = os.getenv("SUPERADMIN_PASSWORD")
    
    if SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD and form_data.username.lower() == SUPERADMIN_EMAIL.lower() and form_data.password == SUPERADMIN_PASSWORD:
        access_token = crear_token_acceso(data={"sub": SUPERADMIN_EMAIL, "rol": "superadmin"})
        # Retornamos UUID dummy (lleno de ceros) ya que no existe en tabla usuarios
        return Token(
            access_token=access_token,
            token_type="bearer",
            email=SUPERADMIN_EMAIL,
            rol="superadmin",
            id_usuario=UUID("00000000-0000-0000-0000-000000000000")
        )
        
    # 2. Validar usuarios normales en BD
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username.lower()).first()
    if not usuario or not verificar_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verificar si es entrenador y está suspendido o eliminado
    if usuario.rol == "entrenador":
        entrenador = db.query(Entrenador).filter(Entrenador.id_usuario == usuario.id_usuario).first()
        if entrenador:
            if not entrenador.estado_activo:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu cuenta de entrenador ha sido eliminada. Contacta al administrador."
                )
            if entrenador.estado_financiero == "suspendido":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tu cuenta está suspendida porque todavía no se ha dado de alta o por falta de pago."
                )
        
    # Crear token JWT
    access_token = crear_token_acceso(data={"sub": usuario.email, "rol": usuario.rol})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        email=usuario.email,
        rol=usuario.rol,
        id_usuario=usuario.id_usuario
    )
