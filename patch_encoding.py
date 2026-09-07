with open("pwa/src/views/ActiveWorkout.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("ASeguro que querAcs salir? Todo el progreso de este entrenamiento se perderA.", "¿Seguro que querés salir? Todo el progreso de este entrenamiento se perderá.")

with open("pwa/src/views/ActiveWorkout.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Encoding fixed")
