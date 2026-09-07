import requests

BASE_URL = "http://localhost:8000"

# 1. Register student
reg_data = {
    "email": "teststudent500@test.com",
    "password": "password123",
    "codigo_invitacion": "francisco@test.com", # Asumiendo que este es un email de coach valido
    "telefono": "123456789"
}
try:
    r = requests.post(f"{BASE_URL}/api/v1/auth/register-student", json=reg_data)
    print("Register status:", r.status_code)
    if r.status_code != 201:
        print("Register response:", r.text)
except Exception as e:
    print("Register failed:", e)

# 2. Login
login_data = {
    "username": "teststudent500@test.com",
    "password": "password123"
}
try:
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    print("Login status:", r.status_code)
    token = r.json().get("access_token")
    if not token:
        print("Login response:", r.text)
except Exception as e:
    print("Login failed:", e)

# 3. Fetch profile
if token:
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = requests.get(f"{BASE_URL}/api/v1/students/profile", headers=headers)
        print("Profile status:", r.status_code)
        if r.status_code == 500:
            print("Profile response:", r.text)
    except Exception as e:
        print("Profile fetch failed:", e)
