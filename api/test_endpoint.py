from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.post("/api/v1/students/f65ea29e-24bc-4b8d-a5fe-d657488d5475/evaluations/physical")
print(f"Status Code: {response.status_code}")
