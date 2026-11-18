import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Custom routing used instead of react-router-dom
import { api } from '../services/api.js';

const IconCheck = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const IconWarn = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default function QRCheckinView() {
  const pathParts = window.location.pathname.split('/');
  const coachId = pathParts[pathParts.length - 1];
  const navigate = (path) => { window.location.href = path; };
  const [gymInfo, setGymInfo] = useState(null);
  const [result, setResult] = useState(null);  // checkin result
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('fitness_jwt');
  const queryClient = useQueryClient();

  // Load gym info
  useEffect(() => {
    api.get(`/api/v1/qr/${coachId}`)
      .then(data => setGymInfo(data))
      .catch(() => setError('Gimnasio no encontrado o no habilitado.'))
      .finally(() => setLoading(false));
  }, [coachId]);

  // Auto check-in if logged in
  useEffect(() => {
    if (!gymInfo || !token) return;
    doCheckin();
  }, [gymInfo]);

  const doCheckin = async () => {
    setLoading(true);
    try {
      const data = await api.post(`/api/v1/qr/${coachId}/checkin`, {});
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['studentAttendances'] });
    } catch (e) {
      const msg = e?.detail || e?.message || 'Error al registrar asistencia';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Not logged in ──
  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-6">
        <div className="w-full max-w-sm">
          {gymInfo && (
            <p className="text-zinc-400 text-sm text-center mb-6">
              Registrar entrada en <span className="text-emerald-400 font-bold">{gymInfo.nombre}</span>
            </p>
          )}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 text-blue-300 text-sm text-center mb-4">
            Necesitás iniciar sesión para registrar tu asistencia.
          </div>
          <button
            onClick={() => navigate(`/login?redirect=/qr/${coachId}`)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl uppercase tracking-widest text-sm transition-all"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm uppercase tracking-widest">Registrando asistencia...</p>
      </div>
    );
  }

  // ── Error ──
  if (error && !result) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
          <IconWarn />
        </div>
        <h2 className="text-white font-black text-xl">Error</h2>
        <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
      </div>
    );
  }

  // ── Results ──
  const getResultConfig = () => {
    if (!result) return null;
    if (result.status === 'ok') return {
      bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', iconColor: 'text-emerald-400',
      icon: <IconCheck />, title: '¡Bienvenido/a!', subtitle: result.mensaje,
    };
    if (result.status === 'ya_registrado') return {
      bg: 'bg-amber-500/20', border: 'border-amber-500/40', iconColor: 'text-amber-400',
      icon: <IconWarn />, title: '¡Ya entraste hoy!', subtitle: 'Ya registraste tu asistencia hoy.',
    };
    if (result.status === 'sin_clases') return {
      bg: 'bg-red-500/20', border: 'border-red-500/40', iconColor: 'text-red-400',
      icon: <IconRefresh />, title: 'Sin clases disponibles', subtitle: '¡Renovar membresía para seguir entrenando!',
    };
    if (result.status === 'sin_membresia') return {
      bg: 'bg-amber-500/20', border: 'border-amber-500/40', iconColor: 'text-amber-400',
      icon: <IconWarn />, title: 'Membresía no configurada', subtitle: result.mensaje || 'Debes configurar tu membresía en la app antes de ingresar.',
    };
    return null;
  };

  const cfg = getResultConfig();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-6">
      {gymInfo && (
        <p className="text-zinc-500 text-xs uppercase tracking-widest">{gymInfo.nombre}</p>
      )}

      {cfg && (
        <div className={`w-full max-w-sm rounded-2xl border p-8 flex flex-col items-center gap-4 ${cfg.bg} ${cfg.border}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.iconColor}`}>
            {cfg.icon}
          </div>
          <h2 className="text-white font-black text-xl text-center">{cfg.title}</h2>
          <p className="text-zinc-300 text-sm text-center">{cfg.subtitle}</p>

          {result?.tipo_membresia === 'por_clases' && result?.status === 'ok' && (
            <div className="w-full mt-2 grid grid-cols-2 gap-3 text-center">
              <div className="bg-zinc-900/60 rounded-xl p-3">
                <p className="text-2xl font-black text-white">{result.clases_restantes}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Clases restantes</p>
              </div>
              {result.vencimiento_estimado && (
                <div className="bg-zinc-900/60 rounded-xl p-3">
                  <p className="text-sm font-black text-white">{result.vencimiento_estimado}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Venc. estimado</p>
                </div>
              )}
            </div>
          )}

          {result?.sin_clases_warning && (
            <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-center">
              ⚠️ Última clase consumida. Hablá con tu entrenador para renovar.
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/app')}
        className="text-zinc-500 hover:text-zinc-300 text-xs underline transition-colors"
      >
        Ir al dashboard →
      </button>
    </div>
  );
}
