from app.database import SessionLocal
from app.models import Usuario, Alumno, Entrenador
from app.schemas import AlumnoOut
import uuid
import datetime

db = SessionLocal()
try:
    # Find a valid coach
    coach = db.query(Usuario).filter(Usuario.rol == "entrenador").first()
    if not coach:
        print("No coach found")
        exit(1)
        
    coach_entrenador = db.query(Entrenador).filter(Entrenador.id_usuario == coach.id_usuario).first()
    
    # Create mock student
    test_email = f"test_{uuid.uuid4().hex[:6]}@test.com"
    
    nuevo_usuario = Usuario(
        email=test_email,
        password_hash="mock",
        rol="alumno",
        telefono="123"
    )
    db.add(nuevo_usuario)
    db.flush()
    
    nuevo_alumno = Alumno(
        id_usuario=nuevo_usuario.id_usuario,
        id_entrenador=coach_entrenador.id_usuario,
        peso_corporal_actual=80.0,
        objetivo="Test",
        estado_activo=True,
        fecha_vencimiento_pago=None
    )
    db.add(nuevo_alumno)
    db.commit()
    db.refresh(nuevo_alumno)
    
    # Now simulate get_my_profile
    alumno_from_db = db.query(Alumno).filter(Alumno.id_usuario == nuevo_usuario.id_usuario).first()
    try:
        # Simulate FastAPI response serialization
        out = AlumnoOut.from_orm(alumno_from_db)
        print("Serialization success:", out.id_usuario)
    except Exception as e:
        print("SERIALIZATION ERROR in get_my_profile:", str(e))
        import traceback
        traceback.print_exc()
        
    try:
        # Check get_my_stats error
        from sqlalchemy import text
        mv_records = db.execute(text(
            "SELECT re.nombre, mv.rep_range, mv.max_peso "
            "FROM mv_rep_maxes mv "
            "JOIN ejercicios re ON mv.id_ejercicio = re.id_ejercicio "
            "WHERE mv.id_alumno = :id_alumno"
        ), {"id_alumno": nuevo_usuario.id_usuario}).fetchall()
        print("Stats success")
    except Exception as e:
        print("STATS ERROR in get_my_stats:", str(e))
        
finally:
    # Cleanup
    db.rollback()
    user = db.query(Usuario).filter(Usuario.email == test_email).first()
    if user:
        db.query(Alumno).filter(Alumno.id_usuario == user.id_usuario).delete()
        db.query(Usuario).filter(Usuario.id_usuario == user.id_usuario).delete()
        db.commit()
    db.close()
