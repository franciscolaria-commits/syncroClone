from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
try:
    mv_records = db.execute(text("SELECT re.nombre, mv.rep_range, mv.max_peso FROM mv_rep_maxes mv JOIN ejercicios re ON mv.id_ejercicio = re.id_ejercicio")).fetchall()
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
