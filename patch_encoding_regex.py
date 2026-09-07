import re
with open("pwa/src/views/ActiveWorkout.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r'const isConfirmed = await modal\.confirm\(".*?"\);', 'const isConfirmed = await modal.confirm("¿Seguro que querés salir? Todo el progreso de este entrenamiento se perderá.");', content)

with open("pwa/src/views/ActiveWorkout.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Encoding fixed via regex")
