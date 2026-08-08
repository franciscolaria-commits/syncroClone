import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found.")
    sys.exit(1)

# Fix configparser interpolation if needed, but here we just use it directly
engine = create_engine(db_url)

queries = [
    "ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS config_estado_alumno_default VARCHAR NOT NULL DEFAULT 'activo';",
    "ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS config_vencimiento_tipo VARCHAR NOT NULL DEFAULT 'individual';",
    "ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS config_vencimiento_dia INTEGER;",
    "ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS config_bloqueo_morosos VARCHAR NOT NULL DEFAULT 'nunca';",
    "ALTER TABLE entrenadores ADD COLUMN IF NOT EXISTS config_bloqueo_dias INTEGER NOT NULL DEFAULT 0;",
    
    "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago TIMESTAMP;",
    "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS bloqueado_por_pago BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS recordatorio_enviado_2_dias BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS recordatorio_enviado_hoy BOOLEAN NOT NULL DEFAULT FALSE;"
]

with engine.connect() as conn:
    for q in queries:
        print(f"Executing: {q}")
        conn.execute(text(q))
    conn.commit()

print("Columns added successfully.")
