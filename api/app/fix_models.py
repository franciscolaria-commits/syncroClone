import sys
import codecs

filepath = 'models.py'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

target = 'dia = relationship("RutinaDia")'
replacement = 'dia = relationship("RutinaDia", overlaps="ejercicios")'

if target in content and replacement not in content:
    content = content.replace(target, replacement)
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)
