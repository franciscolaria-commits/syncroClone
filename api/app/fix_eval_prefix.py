import sys
import codecs

filepath = 'routers/evaluations.py'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('router = APIRouter()', 'router = APIRouter(prefix="/api/v1", tags=["Evaluations"])')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Added prefix to evaluations router")
