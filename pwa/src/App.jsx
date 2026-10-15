import React, { useState, useEffect } from 'react';
const AuthView = React.lazy(() => import('./views/AuthView.jsx'));
const LandingPage = React.lazy(() => import('./views/LandingPage.jsx'));
const CoachDashboard = React.lazy(() => import('./views/CoachDashboard.jsx'));
const StudentDashboard = React.lazy(() => import('./views/StudentDashboard.jsx'));
const BlockedView = React.lazy(() => import('./views/BlockedView.jsx'));
const QRCheckinView = React.lazy(() => import('./views/QRCheckinView.jsx'));
const SuperAdminPanel = React.lazy(() => import('./views/SuperAdminPanel.jsx'));
const GuardianConsentView = React.lazy(() => import('./views/GuardianConsentView.jsx'));
const PendingGuardianConsentView = React.lazy(() => import('./views/PendingGuardianConsentView.jsx'));
import WeightGuardian from './components/WeightGuardian.jsx';
import { api } from './services/api.js';

const LoadingScreen = () => (
  <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
    <div className="w-16 h-16 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
    <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm animate-pulse">Cargando Syncro...</p>
  </div>
);

import { initOfflineSync } from './services/offlineSync.js';
import './index.css';

initOfflineSync();

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const token = localStorage.getItem("fitness_jwt");
    const userRaw = localStorage.getItem("fitness_user");
    if (token && userRaw) {
      const parsed = JSON.parse(userRaw);
      setSession(parsed);

      // Si es alumno, sincronizar estado actualizado de autorización con el backend
      if (parsed.rol === 'alumno') {
        api.get('/api/v1/students/profile').then(profile => {
          if (profile && (
            profile.requiere_autorizacion_tutor !== parsed.requiere_autorizacion_tutor ||
            profile.autorizacion_tutor_completada !== parsed.autorizacion_tutor_completada ||
            profile.email_tutor !== parsed.email_tutor
          )) {
            const updated = {
              ...parsed,
              requiere_autorizacion_tutor: profile.requiere_autorizacion_tutor,
              autorizacion_tutor_completada: profile.autorizacion_tutor_completada,
              email_tutor: profile.email_tutor
            };
            localStorage.setItem("fitness_user", JSON.stringify(updated));
            setSession(updated);
          }
        }).catch(() => {});
      }
    } else {
      setSession(null);
    }
  };

  const path = window.location.pathname;

  // Ruta pública de consentimiento parental (no requiere login)
  if (path === '/consentimiento-tutor') {
    return <React.Suspense fallback={<LoadingScreen />}><GuardianConsentView /></React.Suspense>;
  }

  if (path.startsWith('/qr/')) {
    return <React.Suspense fallback={<LoadingScreen />}><QRCheckinView /></React.Suspense>;
  }

  if (path === '/blocked') {
    return <React.Suspense fallback={<LoadingScreen />}><BlockedView /></React.Suspense>;
  }

  if (path === '/admin-secreto') {
    if (!session || session.rol !== 'superadmin') {
      return <React.Suspense fallback={<LoadingScreen />}><AuthView onLoginSuccess={checkSession} /></React.Suspense>;
    }
    return <React.Suspense fallback={<LoadingScreen />}><SuperAdminPanel /></React.Suspense>;
  }

  if (!session) {
    if (path === '/login') {
      return <React.Suspense fallback={<LoadingScreen />}><AuthView onLoginSuccess={checkSession} /></React.Suspense>;
    }
    // Por defecto, visitantes no autenticados ven la Landing B2B
    return <React.Suspense fallback={<LoadingScreen />}><LandingPage /></React.Suspense>;
  }

  // == Si hay sesión, ignoramos la Landing y resolvemos vistas ==
  if (path === '/' || path === '/login') {
    // Si entró a la raíz o al login con sesión activa, no hacemos nada extra,
    // el código de abajo renderizará el Dashboard correspondiente.
    // Opcionalmente se podría usar history.pushState, pero esto es más simple.
  }

  if (session.rol === 'superadmin') {
    return <React.Suspense fallback={<LoadingScreen />}><SuperAdminPanel /></React.Suspense>;
  }

  // Si es entrenador, retornamos directamente
  if (session.rol === 'entrenador') {
    return <React.Suspense fallback={<LoadingScreen />}><CoachDashboard /></React.Suspense>;
  }

  // Si es alumno, verificar si está bloqueado preventivamente por falta de autorización parental
  if (session.rol === 'alumno') {
    if (session.requiere_autorizacion_tutor && !session.autorizacion_tutor_completada) {
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <PendingGuardianConsentView
            user={session}
            onUpdateUser={(updated) => setSession(updated)}
          />
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={<LoadingScreen />}>
        <WeightGuardian user={session}>
          <StudentDashboard />
        </WeightGuardian>
      </React.Suspense>
    );
  }

  return <div>Rol desconocido</div>;
}
