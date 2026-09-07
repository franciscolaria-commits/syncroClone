from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal, engine
from app import models
import uuid

# Recreate tables to be safe (assuming a test db or just checking errors)
# Actually, since it's the real DB, let's just make a fake email and delete it later
client = TestClient(app)

db = SessionLocal()
try:
    # Find a valid coach email to use as codigo_invitacion
    coach = db.query(models.Usuario).filter(models.Usuario.rol == "entrenador").first()
    if not coach:
        print("No coach found to test")
        exit(1)
        
    test_email = f"test_{uuid.uuid4().hex[:6]}@test.com"
    
    # 1. Register student
    reg_data = {
        "email": test_email,
        "password": "password123",
        "codigo_invitacion": coach.email,
        "telefono": "123456789"
    }
    
    r = client.post("/api/v1/auth/register-student", json=reg_data)
    print("Register status:", r.status_code)
    if r.status_code != 201:
        print("Register err:", r.text)
        exit(1)
        
    # 2. Login
    login_data = {
        "username": test_email,
        "password": "password123"
    }
    r = client.post("/api/v1/auth/login", data=login_data)
    print("Login status:", r.status_code)
    token = r.json().get("access_token")
    if not token:
        print("Login err:", r.text)
        exit(1)
        
    # 3. Fetch profile
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/v1/students/profile", headers=headers)
    print("Profile status:", r.status_code)
    if r.status_code != 200:
        print("Profile err:", r.text)
        
finally:
    # Cleanup
    user = db.query(models.Usuario).filter(models.Usuario.email == test_email).first()
    if user:
        # Delete Alumno first
        db.query(models.Alumno).filter(models.Alumno.id_usuario == user.id_usuario).delete()
        db.query(models.Usuario).filter(models.Usuario.email == test_email).delete()
        db.commit()
    db.close()

