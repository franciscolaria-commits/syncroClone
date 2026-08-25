import sys

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = 'from app.routers import auth, students, coaches, routines, analytics, templates, subscriptions, admin, superadmin, gamification, storage, history, attendance'
new_import_line = 'from app.routers import auth, students, coaches, routines, analytics, templates, subscriptions, admin, superadmin, gamification, storage, history, attendance, evaluations'

router_include = 'app.include_router(attendance.router, prefix="/api/v1")'
new_router_include = '''app.include_router(attendance.router, prefix="/api/v1")
app.include_router(evaluations.router, prefix="/api/v1", tags=["evaluaciones"])'''

if import_line in content:
    content = content.replace(import_line, new_import_line)
if router_include in content:
    content = content.replace(router_include, new_router_include)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
