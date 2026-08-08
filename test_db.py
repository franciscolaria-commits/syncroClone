import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup database directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))
load_dotenv(os.path.join(os.path.dirname(__file__), 'api', '.env'))

DB_URL = os.getenv("DIRECT_URL")
if not DB_URL:
    print("No DIRECT_URL found.")
    sys.exit(1)

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app import models

def test():
    db = SessionLocal()
    try:
        # Check students
        alumnos = db.query(models.Alumno).filter(models.Alumno.id_rutina_activa != None).all()
        print(f"Total students with a routine assigned: {len(alumnos)}")
        for al in alumnos:
            print(f"Student {al.id_usuario} has id_rutina_activa={al.id_rutina_activa}")
            rutina = db.query(models.Rutina).filter(models.Rutina.id_rutina == al.id_rutina_activa).first()
            if rutina:
                print(f"  -> Routine exists: {rutina.nombre_rutina}, is_active={rutina.is_active}")
                
                # Check for loop
                for dia in rutina.dias:
                    for ex in dia.ejercicios:
                        if ex.ejercicio and not ex.ejercicio.id_entrenador:
                            override = db.query(models.EjercicioMediaCoach).filter(
                                models.EjercicioMediaCoach.id_ejercicio == ex.id_ejercicio,
                                models.EjercicioMediaCoach.id_entrenador == al.id_entrenador
                            ).first()
            else:
                print("  -> ERROR: Routine DOES NOT EXIST in rutinas table!")
    finally:
        db.close()

if __name__ == "__main__":
    test()
