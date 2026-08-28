import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('await api.delete(`/api/v1/evaluations/${id}`);', 'await api.delete(`/api/v1/evaluations/${endpoint}/${id}`);')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Fixed api.delete in frontend")
