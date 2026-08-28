import sys
import codecs

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('alert("Error al subir imagen");', 'console.error(err); alert("Error al subir imagen");')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Added console.error")
