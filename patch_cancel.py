with open("pwa/src/views/ActiveWorkout.jsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """  const startRest = (seconds) => {
    setRestTime(seconds || 60);
    setIsResting(true);
  };"""

new_block = """  const startRest = (seconds) => {
    setRestTime(seconds || 60);
    setIsResting(true);
  };

  const handleCancel = async () => {
    if (sets.length > 0) {
      const isConfirmed = await modal.confirm("¿Seguro que querés salir? Todo el progreso de este entrenamiento se perderá.");
      if (!isConfirmed) return;
    }
    onCancel();
  };"""

content = content.replace(old_block, new_block)

content = content.replace('<button onClick={onCancel} className="text-zinc-400 hover:text-red-400 font-bold transition-all">Cancelar</button>', '<button onClick={handleCancel} className="text-zinc-400 hover:text-red-400 font-bold transition-all">Cancelar</button>')

with open("pwa/src/views/ActiveWorkout.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Success")
