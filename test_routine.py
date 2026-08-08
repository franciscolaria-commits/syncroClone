import os
import sys
from dotenv import load_dotenv

# Set up paths so we can import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))
load_dotenv(os.path.join(os.path.dirname(__file__), 'api', '.env'))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def run_test():
    db = SessionLocal()
    try:
        # Get any active student with a routine assigned
        alumno = db.query(models.Alumno).filter(models.Alumno.id_rutina_activa != None).first()
        if not alumno:
            print("No student with active routine found.")
            return

        print(f"Found student: {alumno.id_usuario}")
        print(f"Active Routine ID: {alumno.id_rutina_activa}")

        rutina = db.query(models.Rutina).filter(models.Rutina.id_rutina == alumno.id_rutina_activa).first()
        if not rutina:
            print("Routine not found for student!")
            return
            
        print(f"Found routine: {rutina.nombre_rutina} (is_active={rutina.is_active})")
        print(f"Days count: {len(rutina.dias)}")
        
        # Test the loop
        for dia in rutina.dias:
            for ex in dia.ejercicios:
                if ex.ejercicio and not ex.ejercicio.id_entrenador:
                    override = db.query(models.EjercicioMediaCoach).filter(
                        models.EjercicioMediaCoach.id_ejercicio == ex.id_ejercicio,
                        models.EjercicioMediaCoach.id_entrenador == alumno.id_entrenador
                    ).first()
                    if override:
                        ex.ejercicio.url_media = override.url_media
        
        print("Loop completed successfully.")
        
        # Test Pydantic serialization
        from app.schemas import RutinaOut
        try:
            out = RutinaOut.from_orm(rutina)
            print("Serialization successful.")
        except Exception as e:
            print(f"Serialization failed: {str(e)}")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
