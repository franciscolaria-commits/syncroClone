import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DIRECT_URL = os.getenv("DIRECT_URL")


def _normalize_db_url(url: str) -> str:
    """
    Normaliza la URL de base de datos para usar psycopg3 (psycopg[binary]).
    Render puede entregar cualquiera de estos formatos:
      - postgresql+psycopg://...   (ya psycopg3, OK)
      - postgresql+psycopg2://...  (psycopg2, convertir a psycopg3)
      - postgresql://...           (sin driver, psycopg3 lo toma)
      - postgres://...             (alias Heroku/Render, normalizar)
    """
    if not url:
        return url
    # Alias antiguo de Heroku/Render: postgres:// -> postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    # Forzar psycopg2 a psycopg3 por si viene así
    url = url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
    url = url.replace("postgres+psycopg2://",   "postgresql+psycopg://")
    return url


if DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = _normalize_db_url(DATABASE_URL)
    ALEMBIC_DATABASE_URL = _normalize_db_url(DIRECT_URL) if DIRECT_URL else SQLALCHEMY_DATABASE_URL
else:
    POSTGRES_USER     = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB       = os.getenv("POSTGRES_DB", "fitness_db")
    POSTGRES_PORT     = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
    SQLALCHEMY_DATABASE_URL = (
        f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )
    ALEMBIC_DATABASE_URL = SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
