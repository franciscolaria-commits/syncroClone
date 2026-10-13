from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import sentry_sdk

from app.database import get_db, engine
from app import models

# Ejecutar migraciones de Alembic al inicio
try:
    from pathlib import Path
    from alembic.config import Config
    from alembic import command
    
    # Path absoluto a alembic.ini
    base_dir = Path(__file__).resolve().parent.parent
    alembic_ini_path = base_dir / "alembic.ini"
    
    if alembic_ini_path.exists():
        alembic_cfg = Config(str(alembic_ini_path))
        # Ajustar el script_location a la ruta absoluta
        alembic_cfg.set_main_option("script_location", str(base_dir / "alembic"))
        command.upgrade(alembic_cfg, "head")
        print("Alembic migrations executed successfully.")
    else:
        print("alembic.ini not found, skipping migrations.")
except Exception as e:
    print(f"Error running alembic migrations: {e}")

# Parche de emergencia para agregar columnas que Alembic pudo haber ignorado
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR DEFAULT 'estandar'"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_tipo_cobro VARCHAR"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_frecuencia_tipo VARCHAR"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_frecuencia_valor INTEGER"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_monto_pase_libre NUMERIC(10, 2)"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_monto_clases NUMERIC(10, 2)"))
        conn.execute(text("ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS gym_paquetes_clases JSON DEFAULT '[]'::json"))
        
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS tipo_membresia VARCHAR"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS clases_compradas INTEGER"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS clases_usadas_total INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS clases_restantes INTEGER"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_inicio_paquete DATE"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS vencimiento_estimado_clases DATE"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS gym_paquete_id VARCHAR"))
        conn.execute(text("ALTER TABLE evaluaciones_fisicas ADD COLUMN IF NOT EXISTS visible_para_entrenador BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE composicion_corporal ADD COLUMN IF NOT EXISTS visible_para_entrenador BOOLEAN DEFAULT TRUE"))
        print("Manual DDL (columnas) aplicadas con éxito.")
except Exception as e:
    print(f"Error aplicando manual DDL: {e}")

# Crear las tablas en la base de datos automáticamente si no existen (creará asistencias_qr)
models.Base.metadata.create_all(bind=engine)
from app.routers.storage import router as storage_router
from app.routers.auth import router as auth_router
from app.routers.coaches import router as coaches_router
from app.routers.students import router as students_router
from app.routers.student_me import router as student_me_router
from app.routers.exercises import router as exercises_router
from app.routers.routines import router as routines_router
from app.routers.sessions import router as sessions_router
from app.routers.superadmin import router as superadmin_router
from app.routers.cron import router as cron_router
from app.routers.evaluations import router as evaluations_router
from app.routers.qr import router as qr_router
from app.routers.gym_config import router as gym_config_router
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.utils.rate_limit import limiter

# Sentry Integration
sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        traces_sample_rate=1.0,
        # Set profiles_sample_rate to 1.0 to profile 100%
        # of sampled transactions.
        # We recommend adjusting this value in production.
        profiles_sample_rate=1.0,
    )

app = FastAPI(title="Fitness Platform API")

# Rate Limiting Global Setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
# Build allowed origins list - support multiple origins and PWA/mobile installs
allowed_origins = []
if FRONTEND_URL:
    # Support comma-separated list of origins (e.g. "https://app.com,https://www.app.com")
    for origin in FRONTEND_URL.split(","):
        origin = origin.strip()
        if origin:
            allowed_origins.append(origin)

# Always allow localhost for dev
allowed_origins += ["http://localhost:5173", "http://localhost:3000"]

# Deduplicate
allowed_origins = list(dict.fromkeys(allowed_origins))

# Configurar middleware CORS para comunicación cruzada (Frontend PWA a Backend API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth_router)
app.include_router(coaches_router)
app.include_router(students_router)
app.include_router(student_me_router)
app.include_router(exercises_router)
app.include_router(routines_router)
app.include_router(sessions_router)
app.include_router(storage_router)
app.include_router(superadmin_router)
app.include_router(cron_router)
app.include_router(evaluations_router)
app.include_router(qr_router)
app.include_router(gym_config_router)



@app.get("/ping")
def ping(db: Session = Depends(get_db)):
    try:
        # Ejecuta un query básico para validar que PostgreSQL responde
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

@app.get("/keep-alive", tags=["Health"])
async def keep_alive():
    """
    Endpoint ultraligero exclusivo para el cron job de Render.
    Evita consultar PostgreSQL para no agotar el pooler de Supabase.
    """
    return {"status": "awake", "service": "Syncro API"}