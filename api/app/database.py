import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DIRECT_URL = os.getenv("DIRECT_URL")


def _normalize_db_url(url: str) -> str:
    """
    Render puede entregar DATABASE_URL con el scheme 'postgresql+psycopg' (psycopg3).
    Como usamos psycopg2-binary, normalizamos siempre al scheme correcto.
    Tambien maneja el alias antiguo 'postgres://' de Heroku/Render.
    """
    if not url:
        return url
    # psycopg3 schemes -> psycopg2
    url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://")
    url = url.replace("postgres+psycopg://",   "postgresql+psycopg2://")
    # 'postgres://' es alias antiguo de Heroku/Render -> normalizar a postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
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
        f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
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
