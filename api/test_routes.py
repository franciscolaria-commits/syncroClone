from app.main import app

routes = []
for route in app.routes:
    routes.append(route.path)

if "/api/v1/students/{student_id}/evaluations/physical" in routes:
    print("ROUTE FOUND")
else:
    print("ROUTE NOT FOUND")
    for r in routes:
        if "evaluations" in r:
            print("Found:", r)
