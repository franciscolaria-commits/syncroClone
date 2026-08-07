import asyncio
from app.database import SessionLocal
from app.routers.auth import register_coach
from app.schemas import UsuarioCreate

async def run():
    db = SessionLocal()
    user_data = UsuarioCreate(email="test8@test.com", password="password123", rol="entrenador")
    try:
        res = register_coach(user_data=user_data, db=db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())
