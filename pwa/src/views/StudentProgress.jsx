import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import SessionHistory from '../components/SessionHistory.jsx';
import StudentEvaluations from './StudentEvaluations.jsx';

// Helper para obtener estilo visual según el nivel
const getTierStyle = (tier) => {
  switch (tier?.toLowerCase()) {
    case 'cobre': return { border: 'border-orange-900', bg: 'bg-orange-950/30', text: 'text-orange-700', shield: 'text-orange-900' };
    case 'bronce': return { border: 'border-amber-700', bg: 'bg-amber-950/40', text: 'text-amber-600', shield: 'text-amber-700' };
    case 'plata': return { border: 'border-slate-400', bg: 'bg-slate-900/50', text: 'text-slate-300', shield: 'text-slate-400' };
    case 'oro': return { border: 'border-yellow-400', bg: 'bg-yellow-950/50', text: 'text-yellow-400', shield: 'text-yellow-400' };
    case 'platino': return { border: 'border-cyan-400', bg: 'bg-cyan-950/50', text: 'text-cyan-400', shield: 'text-cyan-400' };
    case 'diamante': return { border: 'border-blue-500', bg: 'bg-blue-950/50', text: 'text-blue-400', shield: 'text-blue-500' };
    default: return { border: 'border-zinc-800', bg: 'bg-zinc-950', text: 'text-zinc-500', shield: 'text-zinc-800' };
  }
};

const ShieldIcon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 100 L10 75 V25 L50 0 L90 25 V75 Z" opacity="0.3" />
    <path d="M50 90 L20 70 V30 L50 10 L80 30 V70 Z" opacity="0.6" />
    <path d="M50 80 L30 65 V35 L50 20 L70 35 V65 Z" />
    <path d="M50 20 L50 80 L70 65 V35 Z" fill="white" opacity="0.15" />
  </svg>
);

export default function StudentProgress({ studentId }) {
  const [selectedExercise, setSelectedExercise] = React.useState('');
  const [progressTab, setProgressTab] = React.useState('training'); // training, evaluations
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['studentStats', studentId || 'me'],
    queryFn: () => api.get(studentId ? `/api/v1/coaches/students/${studentId}/stats` : '/api/v1/students/me/stats')
  });

  const { data: leagues, isLoading: loadingLeagues } = useQuery({
    queryKey: ['studentLeagues', studentId || 'me'],
    queryFn: () => api.get(studentId ? `/api/v1/coaches/students/${studentId}/league` : '/api/v1/students/me/league')
  });

  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ['studentChart', studentId],
    queryFn: () => api.get(`/api/v1/coaches/students/${studentId}/progress_chart`),
    enabled: !!studentId
  });

  const { data: attendanceData, isLoading: loadingAttendance } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => api.get(`/api/v1/coaches/students/${studentId}/attendance`),
    enabled: !!studentId
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['studentHistory', studentId || 'me'],
    queryFn: () => api.get(studentId ? `/api/v1/coaches/students/${studentId}/history` : '/api/v1/students/me/history')
  });

  const availableExercises = chartData ? [...new Set(chartData.map(d => d.ejercicio_nombre))] : [];
  
  React.useEffect(() => {
    if (availableExercises.length > 0 && !selectedExercise) {
      setSelectedExercise(availableExercises[0]);
    }
  }, [availableExercises, selectedExercise]);

  const filteredChartData = chartData ? chartData.filter(d => d.ejercicio_nombre === selectedExercise) : [];

  if (loadingStats) {
    return <div className="p-12 text-center text-zinc-500 font-mono uppercase tracking-widest">CARGANDO DATOS...</div>;
  }

  if (!stats) return null;

  const winRate = stats.win_rate_percentage || 0;
  const pieData = [
    { name: 'Victorias (PRs)', value: winRate },
    { name: 'Mantenimiento', value: 100 - winRate }
  ];
  const COLORS = ['#10b981', '#18181b'];

  const repMaxes = stats.rep_maxes || {};
  const exercises = Object.keys(repMaxes);

  return (
    <div className="w-full">
      {studentId && (
        <div className="flex gap-4 mb-4 border-b border-zinc-800 pb-2">
          <button 
            onClick={() => setProgressTab('training')}
            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors ${progressTab === 'training' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Progreso Deportivo
          </button>
          <button 
            onClick={() => setProgressTab('evaluations')}
            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors ${progressTab === 'evaluations' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Evaluaciones Físicas
          </button>
        </div>
      )}
      
      {progressTab === 'evaluations' && studentId ? (
        <StudentEvaluations providedStudentId={studentId} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min">

      {/* ASISTENCIA HERO (Sólo Entrenador) */}
      {studentId && (
        <div className="lg:col-span-12 border border-zinc-800 bg-zinc-900 p-6 md:p-10 flex flex-col">
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-4">
            CONTROL DE ASISTENCIA
          </h2>
          {loadingAttendance ? (
            <p className="text-zinc-700 font-black text-2xl uppercase tracking-tighter">CARGANDO ASISTENCIA...</p>
          ) : !attendanceData || attendanceData.asistencias_por_semana.length === 0 ? (
            <p className="text-zinc-700 font-black text-2xl uppercase tracking-tighter">SIN DATOS DE ASISTENCIA.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {attendanceData.asistencias_por_semana.map((weekData, idx) => {
                const target = attendanceData.frecuencia_objetivo || 3;
                const achieved = weekData.asistencias;
                const percent = Math.min(100, Math.round((achieved / target) * 100));
                
                // Formatear la fecha para que sea legible (ej: "Semana del 12/10")
                const weekDate = new Date(weekData.semana);
                const dateStr = `${weekDate.getDate().toString().padStart(2, '0')}/${(weekDate.getMonth() + 1).toString().padStart(2, '0')}`;
                
                let colorClass = "bg-red-500/20 border-red-500/50 text-red-400"; // < 50%
                let barColor = "bg-red-500";
                
                if (percent >= 100) {
                  colorClass = "bg-green-500/20 border-green-500/50 text-green-400";
                  barColor = "bg-green-500";
                } else if (percent >= 60) {
                  colorClass = "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
                  barColor = "bg-yellow-500";
                }

                return (
                  <div key={idx} className={`border p-4 rounded-xl flex flex-col items-center justify-center text-center ${colorClass}`}>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Semana {dateStr}</span>
                    <span className="text-3xl font-black">{achieved}<span className="text-xl opacity-60">/{target}</span></span>
                    
                    <div className="w-full bg-black/40 h-2 rounded-full mt-3 overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* CHART HERO (Sólo Entrenador) */}
      {studentId && (
        <div className="lg:col-span-12 border border-zinc-800 bg-zinc-900 p-6 md:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-zinc-800 pb-4">
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">GRÁFICO DE PROGRESO</h2>
            {availableExercises.length > 0 && (
              <select 
                value={selectedExercise}
                onChange={e => setSelectedExercise(e.target.value)}
                className="mt-4 sm:mt-0 bg-zinc-950 border border-zinc-700 text-white p-2 outline-none font-bold text-sm uppercase tracking-widest cursor-pointer"
              >
                {availableExercises.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            )}
          </div>
          
          {loadingChart ? (
             <p className="text-zinc-700 font-black text-3xl uppercase tracking-tighter">CARGANDO GRÁFICO...</p>
          ) : filteredChartData.length === 0 ? (
             <p className="text-zinc-700 font-black text-3xl uppercase tracking-tighter">SIN DATOS PARA GRAFICAR.</p>
          ) : (
             <div className="w-full h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={filteredChartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                   <XAxis dataKey="fecha" stroke="#a1a1aa" tick={{fill: '#a1a1aa', fontSize: 12}} tickMargin={10} minTickGap={30} />
                   <YAxis yAxisId="left" stroke="#3b82f6" tick={{fill: '#3b82f6', fontSize: 12}} domain={['auto', 'auto']} />
                   <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{fill: '#10b981', fontSize: 12}} domain={['auto', 'auto']} />
                   <RechartsTooltip 
                     contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                     itemStyle={{ fontWeight: 'bold' }}
                   />
                   <Legend wrapperStyle={{ paddingTop: '20px' }} />
                   <Line yAxisId="left" type="monotone" dataKey="max_e1rm" name="e1RM (Fuerza Estimada) [KG]" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                   <Line yAxisId="right" type="monotone" dataKey="max_peso" name="Peso Real Máx [KG]" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          )}
        </div>
      )}

      {/* LIGAS HERO (Fase 4.5) */}
      <div className="lg:col-span-12 border border-zinc-800 bg-zinc-900 p-6 md:p-10">
        <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-4">FUERZA RELATIVA / MI LIGA</h2>
        
        {loadingLeagues ? (
          <p className="text-zinc-700 font-black text-5xl uppercase tracking-tighter">CARGANDO...</p>
        ) : !leagues || leagues.length === 0 ? (
          <p className="text-zinc-700 font-black text-5xl uppercase tracking-tighter">SIN DATOS DE LIGA.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {leagues.map((league) => {
              const tierStyle = getTierStyle(league.nivel_actual);
              
              return (
              <div key={league.ejercicio_nombre} className={`border p-6 md:p-8 flex flex-col relative overflow-hidden transition-colors ${league.is_pending_audit ? 'border-amber-500 bg-zinc-950' : `${tierStyle.border} ${tierStyle.bg}`}`}>
                
                {league.is_pending_audit && (
                  <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center border-4 border-amber-500">
                    <span className="text-6xl mb-4">⏳</span>
                    <p className="text-amber-500 font-black uppercase tracking-widest text-lg bg-zinc-950 px-4 py-2 border border-amber-500/50">EN REVISIÓN</p>
                  </div>
                )}
                
                <div className="flex flex-col mb-6 lg:mb-8 border-b border-zinc-800/50 pb-4 relative">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter pr-2 leading-tight">{league.ejercicio_nombre}</h3>
                    <ShieldIcon className={`w-10 h-10 shrink-0 ${tierStyle.shield} drop-shadow-lg`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <span className={`block text-2xl sm:text-3xl font-black leading-none uppercase ${tierStyle.text}`}>{league.nivel_actual}</span>
                    {league.nivel_actual !== "Sin Nivel" && (
                      <span className="block text-white font-bold uppercase tracking-widest text-[10px] bg-zinc-950 px-2 py-0.5 border border-zinc-800">NIVEL {league.subnivel_actual}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 lg:mb-8 flex-grow">
                  <div className="border-r border-zinc-800 pr-2 lg:pr-4">
                    <span className="block text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 truncate">e1RM ACTUAL</span>
                    <span className="block text-xl sm:text-2xl lg:text-3xl font-black text-white">{Math.round(league.e1rm_actual)}<span className="text-xs lg:text-sm text-zinc-600">KG</span></span>
                  </div>
                  <div className="pl-1 sm:pl-2">
                    <span className="block text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 truncate">MULTIPLICADOR</span>
                    <span className="block text-xl sm:text-2xl lg:text-3xl font-black text-indigo-400">{league.multiplicador_actual.toFixed(2)}x</span>
                  </div>
                </div>
                
                {league.proximo_nivel ? (
                  <div className="mt-auto bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3">
                      <span className="text-zinc-500">PRÓX: <span className="text-zinc-300">{league.proximo_nivel} {league.proximo_subnivel}</span></span>
                      <span className="text-amber-500 font-black">FALTAN {Math.round(league.peso_faltante_proximo_nivel)}KG</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-3 border border-zinc-800">
                      <div className="bg-amber-500 h-full transition-all duration-1000 ease-out" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto bg-emerald-500/10 border border-emerald-500/50 p-5 text-center">
                    <span className="text-emerald-500 font-black uppercase tracking-widest text-sm">RANGO MÁXIMO ALCANZADO</span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WIN RATE & RECORDS GRID */}
      <div className="lg:col-span-4 border border-zinc-800 bg-zinc-900 p-8 flex flex-col min-h-[300px]">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">TASA DE VICTORIA (WIN RATE)</h3>
        <div className="relative w-full flex-grow flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} stroke="none" dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-6xl font-black text-white tracking-tighter">{Math.round(winRate)}%</span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">PRs LOGRADOS</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 border border-zinc-800 bg-zinc-900 p-6 md:p-10">
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-4">PRs ABSOLUTOS HISTÓRICOS</h3>
        {exercises.length === 0 ? (
          <p className="text-zinc-700 font-black text-5xl uppercase tracking-tighter">SIGUE ENTRENANDO.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exercises.map((ejercicio) => (
              <div key={ejercicio} className="border border-zinc-800 bg-zinc-950 p-6">
                <h4 className="text-lg font-black text-zinc-300 uppercase tracking-tighter mb-6 truncate">{ejercicio}</h4>
                <div className="grid grid-cols-4 gap-3">
                  {['1RM', '5RM', '8RM', '10RM'].map(rango => {
                    const peso = repMaxes[ejercicio][rango];
                    return (
                      <div key={rango} className={`flex flex-col items-center justify-center p-3 border ${peso ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-zinc-800 bg-zinc-900 text-zinc-600'}`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest mb-2">{rango}</span>
                        <span className="text-lg md:text-xl font-black">{peso ? peso : '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HISTORIAL DETALLADO */}
      <div className="lg:col-span-12 border border-zinc-800 bg-zinc-900 p-6 md:p-10">
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-4">HISTORIAL DE SESIONES</h3>
        {loadingHistory ? (
          <p className="text-zinc-700 font-black text-2xl uppercase tracking-tighter">CARGANDO HISTORIAL...</p>
        ) : (
          <SessionHistory sessions={historyData} />
        )}
      </div>

    </div>
    )}
    </div>
  );
}
