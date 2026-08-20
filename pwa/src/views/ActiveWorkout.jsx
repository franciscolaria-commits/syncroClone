import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { enqueueSession } from '../services/offlineSync.js';
import Confetti from 'react-confetti';
import ExerciseAnimations from '../components/ExerciseAnimations.jsx';
import { useModal } from '../components/ModalProvider.jsx';

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}` : url;
};

export default function ActiveWorkout({ routine, initialDayIdx, onComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [currentDayIdx, setCurrentDayIdx] = useState(initialDayIdx !== undefined ? initialDayIdx : 0);
  const [sets, setSets] = useState([]);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [prs, setPrs] = useState([]);
  const [demoExercise, setDemoExercise] = useState(null);
  const modal = useModal();
  
  const currentDay = routine.dias[currentDayIdx];

  useEffect(() => {
    let interval = null;
    if (isResting && restTime > 0) {
      interval = setInterval(() => setRestTime(r => r - 1), 1000);
    } else if (restTime === 0 && isResting) {
      setIsResting(false);
      modal.alert("¡Tiempo de descanso finalizado!");
    }
    return () => clearInterval(interval);
  }, [isResting, restTime]);

  if (!currentDay) return null;

  const mutation = useMutation({
    mutationFn: async (sessionData) => {
      if (!navigator.onLine) {
        throw new Error("OFFLINE");
      }
      const sessionStart = await api.post('/api/v1/sessions/start', { id_rutina: sessionData.id_rutina });
      const completeResponse = await api.put(`/api/v1/sessions/${sessionStart.id_sesion}/complete`, {
        fecha_fin: sessionData.fecha_fin,
        sets: sessionData.sets
      });
      return completeResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studentStats'] });
      queryClient.invalidateQueries({ queryKey: ['studentLeagues'] });
      
      if (data && data.nuevos_prs && data.nuevos_prs.length > 0) {
        setShowConfetti(true);
        setPrs(data.nuevos_prs);
        setTimeout(() => {
          setShowConfetti(false);
          onComplete();
        }, 5000);
      } else {
        modal.alert("Entrenamiento guardado en servidor (Sincronizado).").then(() => onComplete());
      }
    },
    onError: async (error, variables) => {
      if (error.message === "OFFLINE") {
        console.warn("Fallo de red o modo offline detectado, guardando en cola offline...");
        // Disparar en background y continuar inmediatamente
        enqueueSession(variables).catch(e => console.error("Fallo al encolar session", e));
        await modal.alert("Sin conexión. Guardado localmente. Se sincronizará automáticamente cuando haya conexión a Internet.");
        onComplete();
      } else {
        await modal.alert("Ocurrió un error: " + error.message);
      }
    }
  });

  const handleFinish = () => {
    const nextDay = (currentDayIdx + 1) % routine.dias.length;
    localStorage.setItem(`last_day_${routine.id_rutina}`, nextDay);

    mutation.mutate({
      id_rutina: routine.id_rutina,
      fecha_fin: new Date().toISOString(),
      sets: sets
    });
  };

  const startRest = (seconds) => {
    setRestTime(seconds || 60);
    setIsResting(true);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 overflow-y-auto p-4 sm:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-bold text-indigo-400">Entrenando: <span className="text-white">{routine.nombre_rutina}</span></h2>
        <button onClick={onCancel} className="text-zinc-400 hover:text-red-400 font-bold transition-all">Cancelar</button>
      </header>

      {isResting && (
        <div className="bg-indigo-600/20 border border-indigo-500/50 rounded-2xl p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-indigo-400 text-xs font-bold uppercase">Descanso Activo</p>
            <p className="text-2xl font-mono text-white mt-1">{Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}</p>
          </div>
          <button onClick={() => setIsResting(false)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-indigo-500/20">Saltar</button>
        </div>
      )}

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <h3 className="text-2xl font-black text-white mb-6">Día {currentDayIdx + 1}: {currentDay.nombre_dia}</h3>
        
        {currentDay.ejercicios.map((ex, exIdx) => (
          <div key={ex.id_rutina_ejercicio} className="bg-zinc-900 rounded-2xl p-6 mb-6 border border-zinc-800 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded">Ejercicio {exIdx + 1}</span>
                <div className="flex items-center gap-2 mt-2">
                  <h4 className="font-bold text-zinc-100 text-lg">{ex.ejercicio ? ex.ejercicio.nombre : `ID: ${ex.id_ejercicio}`}</h4>
                  {ex.ejercicio && (
                    <button 
                      onClick={() => setDemoExercise(ex.ejercicio)}
                      className="text-emerald-500 hover:text-emerald-400 p-1 bg-emerald-500/10 rounded border border-emerald-500/20 transition-colors"
                      title="Ver Técnica"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-300">{ex.series_esperadas} x {ex.reps_esperadas}</p>
                <p className="text-xs text-zinc-500">{ex.descanso_segundos || 60}s descanso</p>
                {ex.ejercicio?.es_con_peso === false && (
                  <p className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block mt-1 uppercase border border-blue-500/20">
                    {ex.ejercicio.tipo_banda ? `BANDA ${ex.ejercicio.tipo_banda}` : 'SIN PESO'}
                  </p>
                )}
              </div>
            </div>

            {ex.nota_entrenador && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-4 flex gap-3 items-start">
                <span className="text-lg">💬</span>
                <div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Nota del Entrenador</p>
                  <p className="text-sm text-indigo-100 font-medium italic">"{ex.nota_entrenador}"</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 items-center mt-2">
              {ex.ejercicio?.es_con_peso !== false && (
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1 block mb-1">Peso (kg)</label>
                  <input type="number" className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-white transition-all" id={`peso-${ex.id_rutina_ejercicio}`} />
                </div>
              )}
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase ml-1 block mb-1">Reps</label>
                <input type="number" defaultValue={ex.reps_esperadas} className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-white transition-all" id={`reps-${ex.id_rutina_ejercicio}`} />
              </div>
              <div className="mt-5">
                <button 
                  onClick={async () => {
                    const isConPeso = ex.ejercicio?.es_con_peso !== false;
                    const pesoInput = document.getElementById(`peso-${ex.id_rutina_ejercicio}`);
                    const peso = isConPeso ? pesoInput?.value : '0';
                    const reps = document.getElementById(`reps-${ex.id_rutina_ejercicio}`).value;
                    
                    if(isConPeso && !peso) return;
                    if(!reps) return;
                    
                    if(isConPeso && parseFloat(peso) > 400) {
                      await modal.alert("Peso inválido. Máximo permitido: 400 kg");
                      return;
                    }
                    if((isConPeso && parseFloat(peso) < 0) || parseInt(reps) <= 0) {
                      await modal.alert("Los valores deben ser positivos.");
                      return;
                    }
                    
                    setSets([...sets, { id_rutina_ejercicio: ex.id_rutina_ejercicio, peso_usado: isConPeso ? parseFloat(peso) : 0, reps_logradas: parseInt(reps) }]);
                    startRest(ex.descanso_segundos || 60);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all h-full"
                >
                  ✓ Set
                </button>
              </div>
            </div>
            <p className="text-xs mt-3 text-emerald-400 font-medium">
              {sets.filter(s => s.id_rutina_ejercicio === ex.id_rutina_ejercicio).length} / {ex.series_esperadas} completadas
            </p>
          </div>
        ))}
        <button disabled={mutation.isPending} onClick={handleFinish} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/20 transition-all text-lg uppercase tracking-wider disabled:opacity-50">
          {mutation.isPending ? 'Procesando...' : 'Finalizar y Sincronizar'}
        </button>
      </div>
      
      {showConfetti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-8 max-w-sm text-center shadow-[0_0_50px_rgba(245,158,11,0.5)] transform scale-110 transition-transform">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-black text-amber-400 mb-2 uppercase tracking-widest">¡NUEVO PR!</h2>
            <p className="text-zinc-300 font-medium mb-4">¡Felicitaciones! Has roto tus propias marcas en:</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {prs.map(pr => (
                <span key={pr} className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg text-sm font-bold border border-amber-500/30">
                  {pr}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-500">Guardando tu progreso glorioso...</p>
          </div>
        </div>
      )}

      {demoExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="font-black text-white uppercase tracking-tight truncate pr-4">{demoExercise.nombre}</h3>
              <button onClick={() => setDemoExercise(null)} className="text-zinc-500 hover:text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 bg-zinc-950 flex flex-col items-center justify-center min-h-[300px]">
              {demoExercise.url_gif ? (
                <div className="w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center relative">
                  <img 
                    src={demoExercise.url_gif} 
                    alt={demoExercise.nombre} 
                    className="w-full h-full object-contain" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="fallback-icon absolute inset-0 bg-zinc-900 hidden flex-col items-center justify-center p-8">
                    <span className="text-sm text-zinc-500 font-bold uppercase text-center leading-tight">Sin Imagen Disponible</span>
                  </div>
                </div>
              ) : demoExercise.url_media ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black flex flex-col items-center justify-center">
                  {getYouTubeEmbedUrl(demoExercise.url_media) !== demoExercise.url_media ? (
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={getYouTubeEmbedUrl(demoExercise.url_media)} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                      <span className="text-zinc-400 text-sm">El entrenador proporcionó un enlace externo para este ejercicio.</span>
                      <a href={demoExercise.url_media} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase tracking-widest text-xs transition-colors">
                        Abrir Enlace Externo 🚀
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-sm aspect-square bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-8">
                  <ExerciseAnimations exerciseName={demoExercise.nombre} />
                </div>
              )}
              {demoExercise.descripcion && (
                <p className="mt-6 text-zinc-400 text-sm text-center italic">{demoExercise.descripcion}</p>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-center">
              <button onClick={() => setDemoExercise(null)} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase tracking-widest text-xs transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
