from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID, uuid4

class AlumnoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_usuario: UUID
    rutina_nombre: Optional[str] = None

class MockAlumno:
    def __init__(self):
        self.id_usuario = uuid4()
        # Does NOT have rutina_nombre

mock = MockAlumno()
try:
    out = AlumnoOut.model_validate(mock)
    print("Success:", out)
except Exception as e:
    print("Error:", e)
