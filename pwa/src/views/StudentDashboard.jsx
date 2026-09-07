import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, logout } from '../services/api.js';
import ActiveWorkout from './ActiveWorkout.jsx';
import StudentProgress from './StudentProgress.jsx';
import StudentEvaluations from './StudentEvaluations.jsx';
import ExerciseAnimations from '../components/ExerciseAnimations.jsx';
import TutorialPanel from '../components/TutorialPanel.jsx';
import { Info } from 'lucide-react';

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}` : url;
};

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('home'); // home, routine, league, history
  const [isWorkingOut, setIsWorkingOut] = useState(false);
  const [demoExercise, setDemoExercise] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [phoneInput, setPhoneInput] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['studentProfile', 'v2'],
    queryFn: () => api.get("/api/v1/students/profile"),
    onError: (err) => {
      if (err.message.includes("401")) logout();
    }
  });

  const { data: routine, isLoading: loadingRoutine } = useQuery({
    queryKey: ['studentRoutine'],
    queryFn: () => api.get("/api/v1/students/me/routine"),
    retry: false
  });

  const { data: stats } = useQuery({
    queryKey: ['studentStats'],
    queryFn: () => api.get('/api/v1/students/me/stats')
  });

  if (loadingProfile) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-mono uppercase tracking-widest">Cargando...</div>;
  }

  const isSuspended = profile?.estado_activo === false || (profile?.data && profile.data.estado_activo === false);
  const isBlockedByPayment = profile?.bloqueado_por_pago || (profile?.data && profile.data.bloqueado_por_pago);

  if (!profile && !loadingProfile) {
    return <div className="text-white p-10">ERROR: Profile no cargó. ¿Error 500 del backend?</div>;
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-200 font-sans p-4">
        <div className="bg-red-900/20 border border-red-900/50 p-8 rounded-2xl max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-red-900/40 text-red-500 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-red-400">Acceso Suspendido</h1>
          <p className="text-sm text-zinc-400">
            {isBlockedByPayment 
              ? "Tu cuenta ha sido suspendida automáticamente por falta de pago. Por favor, comunícate con tu entrenador para regularizar tu situación mensual y reactivar tu acceso."
              : "Tu cuenta ha sido suspendida temporalmente por tu entrenador. Por favor, comunícate con él para regularizar tu situación y reactivar tu acceso a las rutinas."
            }
          </p>
          <button onClick={logout} className="mt-4 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors w-full">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const handleUpdatePhone = async () => {
    if (!phoneInput) return;
    setIsUpdatingPhone(true);
    try {
      await api.put("/api/v1/students/profile/phone", { telefono: phoneInput });
      window.location.reload();
    } catch (e) {
      alert("Error al guardar el teléfono.");
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {profile?.usuario && !profile.usuario.telefono && (
        <div className="bg-orange-500/10 border-b border-orange-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-orange-400 text-sm">
            <strong className="font-bold">¡Atención!</strong> Es necesario que ingreses tu número de WhatsApp para recibir notificaciones y avisos importantes.
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Ej: +5491123456789"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm w-full sm:w-48 text-white focus:outline-none focus:border-orange-500"
            />
            <button 
              onClick={handleUpdatePhone}
              disabled={isUpdatingPhone}
              className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold px-4 py-1.5 rounded text-sm whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {isUpdatingPhone ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Brutalist Top Navbar */}
      <header className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 md:gap-0">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-emerald-500 rounded-sm"></div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-white">ATLETA PANEL</h1>
          </div>
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-zinc-400 hover:text-white p-2">
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[70px] left-4 right-4 z-50">
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 shadow-xl">
              <button 
                onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }} 
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'home' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Entrenar
              </button>
              <button 
                onClick={() => { setActiveTab('routine'); setIsMobileMenuOpen(false); }} 
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'routine' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Mi Rutina
              </button>
              <button 
                onClick={() => { setActiveTab('league'); setIsMobileMenuOpen(false); }} 
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'league' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Mi Liga
              </button>
              <button 
                onClick={() => { setActiveTab('evolution'); setIsMobileMenuOpen(false); }} 
                className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'evolution' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Mi Evolución
              </button>
              <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest text-red-500 hover:text-red-400">
                SALIR
              </button>
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 md:gap-4 border border-zinc-800 p-1 bg-zinc-900 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'home' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Entrenar
          </button>
          <button 
            onClick={() => setActiveTab('routine')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'routine' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Rutina
          </button>
          <button 
            onClick={() => setActiveTab('league')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'league' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Liga
          </button>
          <button 
            onClick={() => setActiveTab('evolution')} 
            className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'evolution' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mi Evolución
          </button>
        </nav>

        <button onClick={() => setActiveTab('tutorial')} className={`text-xs font-black uppercase transition-colors hidden md:block ${activeTab === 'tutorial' ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}>
            CÓMO USAR
          </button>
          <button onClick={logout} className="text-xs font-black uppercase text-zinc-500 hover:text-red-500 transition-colors hidden md:block">
          SALIR
        </button>
      </header>

      {/* Main Container - Full Width Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min">
            
            {/* HERO SECTION */}
            <div className="lg:col-span-8 border border-zinc-800 bg-zinc-900 p-6 md:p-12 flex flex-col justify-between min-h-[400px]">
              <div>
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">ENTRENAMIENTO ACTUAL</h2>
                {loadingRoutine ? (
                  <h3 className="text-5xl md:text-7xl lg:text-8xl font-black text-zinc-800 tracking-tighter uppercase leading-none break-words">CARGANDO<br/>RUTINA...</h3>
                ) : routine ? (
                  <>
                    <h3 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase leading-none mb-6 break-words">{routine.nombre_rutina}</h3>
                    <p className="text-xl md:text-2xl text-emerald-500 font-mono font-bold">{routine.dias?.length || 0} DÍAS ASIGNADOS</p>
                  </>
                ) : (
                  <h3 className="text-5xl md:text-7xl lg:text-8xl font-black text-zinc-800 tracking-tighter uppercase leading-none break-words">SIN RUTINA<br/>ACTIVA.</h3>
                )}
              </div>

              <div className="mt-12 md:mt-24">
                {routine && (() => {
                  const storedDay = parseInt(localStorage.getItem(`last_day_${routine.id_rutina}`) || '0') % (routine.dias?.length || 1);
                  const activeIdx = selectedDayIdx !== null ? selectedDayIdx : storedDay;
                  
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="bg-zinc-950/80 border border-emerald-500/30 p-4 rounded-xl">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Día de Entrenamiento</label>
                        <select 
                          value={activeIdx}
                          onChange={(e) => setSelectedDayIdx(parseInt(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white font-bold rounded-lg px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                        >
                          {routine.dias?.map((dia, idx) => (
                            <option key={dia.id_dia} value={idx}>
                              Día {dia.orden}: {dia.nombre_dia} {idx === storedDay ? '(Sugerido)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={() => setIsWorkingOut(true)}
                        className="w-full bg-emerald-500 text-zinc-950 font-black text-xl md:text-3xl uppercase tracking-tighter py-6 md:py-8 hover:bg-emerald-400 transition-all border-4 border-emerald-500 hover:border-white flex justify-between items-center px-6 md:px-10 mt-2 rounded-xl"
                      >
                        <span>ENTRENAR</span>
                        <span className="text-4xl md:text-5xl">→</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SIDEBAR STATS */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              {/* CONSISTENCY MODULE */}
              <div className="border border-zinc-800 bg-zinc-950 p-6 md:p-8 flex flex-col justify-between h-full min-h-[200px]">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">CONSISTENCIA (30D)</h3>
                <div className="text-7xl md:text-8xl font-black text-white tracking-tighter">
                  {stats ? Math.round(stats.rolling_adherence || 0) : 0}<span className="text-4xl text-zinc-700">%</span>
                </div>
                <div className="w-full bg-zinc-900 h-3 mt-auto border border-zinc-800">
                  <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${stats ? Math.min(stats.rolling_adherence || 0, 100) : 0}%` }}></div>
                </div>
              </div>

              {/* QUICK STATS MODULE */}
              <div className="border border-zinc-800 bg-zinc-950 p-6 grid grid-cols-2 gap-4 flex-grow min-h-[150px]">
                <div className="flex flex-col justify-end border-r border-zinc-800 pr-4">
                  <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">SESIONES</h4>
                  <p className="text-4xl md:text-5xl font-black text-white">{stats ? stats.total_sessions : 0}</p>
                </div>
                <div className="flex flex-col justify-end pl-2">
                  <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">VOLUMEN TOTAL</h4>
                  <p className="text-4xl md:text-5xl font-black text-white truncate">{stats ? Math.round(stats.total_volume_kg) : 0}<span className="text-xl text-zinc-600">KG</span></p>
                </div>
              </div>

              {/* COACH MODULE */}
              <div className="border border-zinc-800 bg-emerald-950/20 p-6 flex items-center justify-between mt-auto">
                <div>
                  <h4 className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">SUPERVISADO POR</h4>
                  <p className="text-sm font-black text-emerald-400 uppercase">{profile?.entrenador?.nombre || "COACH VINCULADO"}</p>
                </div>
                <div className="h-10 w-10 bg-emerald-500 text-zinc-950 flex items-center justify-center font-black text-xl border-2 border-emerald-400">
                  ✓
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'routine' && (
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-tighter">Plan de Entrenamiento</h2>
            {!routine ? (
              <p className="text-zinc-500 text-sm">No tienes una rutina asignada actualmente.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routine.dias?.map((dia, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-xl font-bold text-emerald-400 uppercase tracking-tight">Día {dia.orden}: {dia.nombre_dia}</h3>
                    <div className="flex flex-col gap-3">
                      {dia.ejercicios?.map((ex, i) => (
                        <div key={i} className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-200">{ex.ejercicio?.nombre || `ID: ${ex.id_ejercicio}`}</h4>
                            <p className="text-xs text-zinc-500 font-mono mt-1">{ex.series_esperadas} Series x {ex.reps_esperadas} Reps</p>
                            {ex.nota_entrenador && (
                              <p className="text-[10px] text-indigo-400 font-bold mt-2 bg-indigo-500/10 inline-block px-2 py-1 rounded border border-indigo-500/20">
                                💬 Profe: {ex.nota_entrenador}
                              </p>
                            )}
                          </div>
                          {ex.ejercicio && (
                            <button 
                              onClick={() => setDemoExercise(ex.ejercicio)}
                              className="text-emerald-500 hover:text-emerald-400 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 transition-colors ml-4"
                              title="Ver Técnica"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tutorial' && (
          <div className="w-full max-w-4xl pt-4">
            <TutorialPanel userType="student" />
          </div>
        )}

        {activeTab === 'evolution' && (<StudentEvaluations />)}
        {activeTab === 'league' && (
          <StudentProgress />
        )}



      </main>

      {/* Demo Modal */}
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
              {demoExercise.url_media ? (
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

      {isWorkingOut && routine && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
          <ActiveWorkout 
            routine={routine} 
            initialDayIdx={selectedDayIdx !== null ? selectedDayIdx : parseInt(localStorage.getItem(`last_day_${routine.id_rutina}`) || '0') % (routine.dias?.length || 1)}
            onComplete={() => {
              setIsWorkingOut(false);
              queryClient.invalidateQueries(['studentStats']);
            }} 
            onCancel={() => setIsWorkingOut(false)} 
          />
        </div>
      )}
    </div>
  );
}



