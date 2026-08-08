import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.database import get_db
from app.models import Usuario, Entrenador, Alumno

load_dotenv()

# Configuración de JWT
import secrets
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas por defecto para desarrollo

# Esquema de autenticación OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Compara una contraseña en texto plano con su hash almacenado usando bcrypt puro."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def generar_hash_password(password: str) -> str:
    """Genera un hash seguro utilizando la librería bcrypt oficial de forma directa."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def crear_token_acceso(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT firmado de acceso temporal."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verificar_token_acceso(token: str) -> Optional[dict]:
    """Decodifica y valida un token JWT."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    """Dependencia para validar el JWT y retornar al Usuario autenticado actual."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación inválidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verificar_token_acceso(token)
    if payload is None:
        raise credentials_exception
        
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    rol = payload.get("rol")
    if rol == "superadmin":
        # Retornar un objeto usuario "falso" en memoria
        from uuid import UUID
        return Usuario(
            id_usuario=UUID("00000000-0000-0000-0000-000000000000"),
            email=email,
            rol="superadmin"
        )
        
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if usuario is None:
        raise credentials_exception
        
    # Validaciones financieras de acceso B2B
    if usuario.rol == "entrenador":
        entrenador = db.query(Entrenador).filter(Entrenador.id_usuario == usuario.id_usuario).first()
        if entrenador and entrenador.estado_financiero == "suspendido":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pago requerido"
            )
    elif usuario.rol == "alumno":
        alumno = db.query(Alumno).filter(Alumno.id_usuario == usuario.id_usuario).first()
        if alumno:
            # Quitamos el bloqueo global de estado_activo para que el frontend pueda obtener el perfil
            # y renderizar su propia pantalla de Acceso Suspendido.
            entrenador_asignado = db.query(Entrenador).filter(Entrenador.id_usuario == alumno.id_entrenador).first()
            if entrenador_asignado and entrenador_asignado.estado_financiero == "suspendido":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Servicio temporalmente suspendido"
                )
                
    return usuario
