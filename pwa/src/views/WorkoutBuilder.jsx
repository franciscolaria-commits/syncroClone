import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useModal } from '../components/ModalProvider.jsx';

export default function WorkoutBuilder({ initialData, onClose, onSaveSuccess }) {
  const [exercisesCatalog, setExercisesCatalog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const categories = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'General'];
  const modal = useModal();
  
  // Si tenemos initialData, inicializamos con esos datos. Si no, datos por defecto.
  const [routineName, setRoutineName] = useState(initialData ? initialData.nombre_rutina : 'Mi Nueva Rutina');
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState(initialData?.frecuencia_semanal || 3);
  
  const initialDays = initialData && initialData.dias ? initialData.dias.map((d, dIdx) => ({
    id: d.id_dia || `dia-${dIdx}`,
    name: d.nombre_dia,
    exercises: d.ejercicios.map((ex, exIdx) => ({
      localId: ex.id_rutina_ejercicio || `ex-${dIdx}-${exIdx}`,
      id_ejercicio: ex.id_ejercicio,
      nombre: ex.ejercicio?.nombre || "Ejercicio (Cargado)",
      series_esperadas: ex.series_esperadas,
      reps_esperadas: ex.reps_esperadas,
      descanso_segundos: ex.descanso_segundos || 60,
      nota_entrenador: ex.nota_entrenador || ''
    }))
  })) : [
    { id: 'dia-1', name: 'Día 1 (Ej: Piernas)', exercises: [] }
  ];

  const [days, setDays] = useState(initialDays);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar catálogo de ejercicios para seleccionar
    const fetchExercises = async () => {
      try {
        const data = await api.get("/api/v1/exercises");
        setExercisesCatalog(data);
      } catch (err) {
        console.error("Error al cargar ejercicios", err);
      }
    };
    fetchExercises();
  }, []);

  const addDay = () => {
    setDays([...days, { id: `dia-${Date.now()}`, name: `Día ${days.length + 1}`, exercises: [] }]);
  };

  const updateDayName = (dayIndex, newName) => {
    const updated = [...days];
    updated[dayIndex].name = newName;
    setDays(updated);
  };

  const removeDay = (dayIndex) => {
    const updated = days.filter((_, idx) => idx !== dayIndex);
    setDays(updated);
  };

  const addExerciseToDay = (dayIndex, exerciseFromCatalog) => {
    const updated = [...days];
    updated[dayIndex].exercises.push({
      localId: `ex-${Date.now()}`,
      id_ejercicio: exerciseFromCatalog.id_ejercicio,
      nombre: exerciseFromCatalog.nombre,
      series_esperadas: 4,
      reps_esperadas: 10,
      descanso_segundos: 60,
      nota_entrenador: ''
    });
    setDays(updated);
  };

  const updateExercise = (dayIndex, exIndex, field, value) => {
    const updated = [...days];
    updated[dayIndex].exercises[exIndex][field] = value;
    setDays(updated);
  };

  const removeExercise = (dayIndex, exIndex) => {
    const updated = [...days];
    updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, idx) => idx !== exIndex);
    setDays(updated);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Preparar payload para la API (Schemas: RutinaCreate, RutinaDiaCreate, RutinaEjercicioCreate)
      const payload = {
        nombre_rutina: routineName,
        frecuencia_semanal: parseInt(frecuenciaSemanal),
        dias: days.map((day, dIndex) => ({
          nombre_dia: day.name,
          orden: dIndex + 1,
          ejercicios: day.exercises.map((ex, exIndex) => ({
            id_ejercicio: ex.id_ejercicio,
            series_esperadas: parseInt(ex.series_esperadas),
            reps_esperadas: parseInt(ex.reps_esperadas),
            descanso_segundos: ex.descanso_segundos ? parseInt(ex.descanso_segundos) : null,
            nota_entrenador: ex.nota_entrenador || null,
            orden: exIndex + 1
          }))
        }))
      };

      if (initialData && initialData.id_rutina) {
        // Modo Edición Inmutable (PUT)
        await api.put(`/api/v1/routines/${initialData.id_rutina}`, payload);
        await modal.alert("¡Rutina editada con éxito! Se ha generado una nueva versión inmutable.");
      } else {
        // Modo Creación (POST)
        await api.post("/api/v1/routines", payload);
        await modal.alert("¡Rutina creada y guardada con éxito!");
      }
      onSaveSuccess();
    } catch (err) {
      await modal.alert(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] overflow-y-auto flex flex-col">
      {/* Header Fijo */}
      <div className="sticky top-0 z-10 glass-card border-b border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-all shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent truncate">Workout Builder</h1>
            <p className="text-xs text-zinc-400 truncate">Creación de estructura jerárquica inmutable</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            value={routineName} 
            onChange={(e) => setRoutineName(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-sm font-bold text-white px-4 py-2 rounded-xl focus:border-blue-500 outline-none flex-1 sm:flex-none sm:w-64 min-w-0"
            placeholder="Nombre de Rutina"
          />
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 shrink-0">
            <span className="text-xs font-bold text-zinc-400 uppercase">Días/Sem:</span>
            <select
              value={frecuenciaSemanal}
              onChange={(e) => setFrecuenciaSemanal(e.target.value)}
              className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <option key={num} value={num} className="bg-zinc-900">{num}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 shrink-0"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Catálogo lateral izquierdo */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-4 flex flex-col gap-4 h-[500px] lg:h-[calc(100vh-120px)] relative lg:sticky lg:top-24 mb-6 lg:mb-0 border-2 border-emerald-500/20 lg:border-zinc-800/50">
          <h2 className="text-sm font-bold text-emerald-400 lg:text-zinc-100 uppercase tracking-wider">Catálogo de Ejercicios</h2>
          
          <input 
            type="text" 
            placeholder="🔍 Buscar ejercicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
          />

          <div className="flex flex-wrap gap-2 pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
            {exercisesCatalog
              .filter(ex => selectedCategory === 'Todos' || ex.categoria === selectedCategory)
              .filter(ex => ex.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(ex => (
              <div key={ex.id_ejercicio} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all flex flex-col gap-2">
                <div className="flex items-start gap-3 relative">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 leading-tight">{ex.nombre}</p>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">{ex.categoria || 'General'}</span>
                  </div>
                </div>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {/* Botones para agregar a días específicos */}
                  {days.map((day, idx) => (
                    <button 
                      key={day.id} 
                      onClick={() => addExerciseToDay(idx, ex)}
                      className="px-2 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] rounded border border-blue-500/20"
                    >
                      {`+ ${day.name || 'Sin nombre'}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zona central constructora */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {days.map((day, dIndex) => (
            <div key={day.id} className="glass-card rounded-2xl p-6 shadow-lg border border-zinc-800/60">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-4">
                <input 
                  type="text" 
                  value={day.name} 
                  onChange={(e) => updateDayName(dIndex, e.target.value)}
                  className="bg-transparent text-xl font-bold text-zinc-100 outline-none border-b border-transparent focus:border-blue-500 transition-colors w-1/2"
                />
                <button onClick={() => removeDay(dIndex)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-lg">Eliminar Día</button>
              </div>

              <div className="flex flex-col gap-3">
                {day.exercises.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                    <p className="text-zinc-500 text-sm font-medium">No hay ejercicios en este día</p>
                    <p className="text-zinc-600 text-xs">Usa el catálogo lateral para agregar ejercicios aquí.</p>
                  </div>
                ) : (
                  day.exercises.map((ex, exIndex) => (
                    <div key={ex.localId} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-zinc-900/80 border border-zinc-700/50 rounded-xl relative group">
                      <div className="flex-1">
                        <p className="font-bold text-zinc-200 text-sm flex items-center gap-2">
                          <span className="text-blue-500 opacity-50 font-mono">{exIndex + 1}.</span> {ex.nombre}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Series</label>
                          <input type="number" min="1" value={ex.series_esperadas} onChange={e => updateExercise(dIndex, exIndex, 'series_esperadas', e.target.value)} className="w-full sm:w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-center text-zinc-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Reps</label>
                          <input type="number" min="1" value={ex.reps_esperadas} onChange={e => updateExercise(dIndex, exIndex, 'reps_esperadas', e.target.value)} className="w-full sm:w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-center text-zinc-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 truncate">Descanso (s)</label>
                          <input type="number" step="15" min="0" value={ex.descanso_segundos} onChange={e => updateExercise(dIndex, exIndex, 'descanso_segundos', e.target.value)} className="w-full sm:w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-center text-zinc-200 focus:border-blue-500 outline-none" />
                        </div>
                      </div>

                      <div className="w-full mt-3 sm:mt-0 sm:flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 truncate">Nota de Profe (Opcional)</label>
                        <input type="text" value={ex.nota_entrenador || ''} onChange={e => updateExercise(dIndex, exIndex, 'nota_entrenador', e.target.value)} placeholder="Ej: Tira con 90kg" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:border-blue-500 outline-none" />
                      </div>

                      <button onClick={() => removeExercise(dIndex, exIndex)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-start sm:self-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <button onClick={addDay} className="py-4 border-2 border-dashed border-zinc-700 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Agregar Nuevo Día
          </button>
        </div>

      </div>
    </div>
  );
}
