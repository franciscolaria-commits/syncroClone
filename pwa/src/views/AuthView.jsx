import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useModal } from '../components/ModalProvider.jsx';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthView({ onLoginSuccess }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCoachCode = urlParams.get('coachCode') || '';
  const initialActivePanel = initialCoachCode ? 'registerStudent' : 'login';

  const [activePanel, setActivePanel] = useState(initialActivePanel); // 'login', 'registerCoach', 'registerStudent'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const modal = useModal();

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target['login-email'].value;
    const password = e.target['login-password'].value;
    setLoadingAction('login');
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const data = await api.post("/api/v1/auth/login", formData);
      localStorage.setItem("fitness_jwt", data.access_token);
      const userData = { email: data.email, rol: data.rol, id_usuario: data.id_usuario };
      localStorage.setItem("fitness_user", JSON.stringify(userData));
      try {
        window.indexedDB.deleteDatabase("keyval-store");
      } catch (e) {}
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRegisterCoach = async (e) => {
    e.preventDefault();
    const email = e.target['reg-coach-email'].value;
    const password = e.target['reg-coach-password'].value;
    setLoadingAction('registerCoach');
    try {
      await api.post("/api/v1/auth/register", { email, password, rol: "entrenador" });
      await modal.alert("¡Cuenta de entrenador creada con éxito! Actualmente se encuentra suspendida hasta que el administrador te dé de alta.");
      setActivePanel('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    const code = e.target['reg-student-code'].value.trim();
    const email = e.target['reg-student-email'].value;
    const password = e.target['reg-student-password'].value;
    const weight = e.target['reg-student-weight'].value;
    const goal = e.target['reg-student-goal'].value;
    const phone = e.target['reg-student-phone'].value.trim();
    setLoadingAction('registerStudent');
    try {
      await api.post("/api/v1/auth/register-student", {
        codigo_invitacion: code,
        email,
        password,
        peso_corporal_actual: weight ? parseFloat(weight) : null,
        objetivo: goal || null,
        telefono: phone
      });
      await modal.alert("¡Registro completado exitosamente! Inicia sesión.");
      // Limpiar URL si venia de link
      window.history.replaceState({}, document.title, window.location.pathname);
      setActivePanel('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-6">
      <div className="text-center">
        <div className="h-12 w-12 mx-auto rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">COACH PLATFORM</h1>
        <p className="text-xs text-zinc-400 mt-1">Gestión Premium e Invitaciones Inmutables</p>
      </div>

      {error && <div className="text-red-400 text-sm text-center">{error}</div>}

      {activePanel === 'login' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-zinc-100">Iniciar Sesión</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Email</label>
              <input type="email" id="login-email" required placeholder="entrenador@correo.com o alumno@correo.com" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="login-password" required placeholder="••••••••" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loadingAction === 'login'} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold active:scale-95 transition-all text-sm mt-2 shadow-lg shadow-blue-500/10 disabled:opacity-50">
              {loadingAction === 'login' ? 'Cargando...' : 'Entrar a la Plataforma'}
            </button>
          </form>
          
          <div className="border-t border-zinc-800/60 mt-4 pt-4 flex flex-col gap-3">
            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">¿Aún no tienes cuenta?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setError(null); setActivePanel('registerCoach') }} type="button" className="w-full py-3.5 px-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 active:scale-95 transition-all text-xs font-bold text-blue-400 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/5">
                Soy Entrenador
              </button>
              <button onClick={() => { setError(null); setActivePanel('registerStudent') }} type="button" className="w-full py-3.5 px-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95 transition-all text-xs font-bold text-indigo-400 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/5">
                Soy Alumno
              </button>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'registerCoach' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-zinc-100">Crear Cuenta de Entrenador</h2>
          <form onSubmit={handleRegisterCoach} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Email Profesional</label>
              <input type="email" id="reg-coach-email" required placeholder="coach@profesional.com" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Contraseña (mínimo 6 caracteres)</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="reg-coach-password" required minLength="6" placeholder="Mínimo 6 caracteres" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loadingAction === 'registerCoach'} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold active:scale-95 transition-all text-sm mt-2 shadow-lg shadow-blue-500/10 disabled:opacity-50">
              {loadingAction === 'registerCoach' ? 'Cargando...' : 'Registrarse como Entrenador'}
            </button>
          </form>
          <div className="border-t border-zinc-800/60 mt-4 pt-4">
            <button onClick={() => { setError(null); setActivePanel('login') }} type="button" className="w-full py-3 rounded-xl border border-zinc-800 hover:bg-zinc-800/40 transition-all text-xs font-bold text-zinc-400 active:scale-95">
              Regresar al Inicio de Sesión
            </button>
          </div>
        </div>
      )}

      {activePanel === 'registerStudent' && (
        <div className="glass-card rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping"></span>
            <h2 className="text-lg font-bold text-zinc-100">Registro de Alumnos</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">Vincula tu cuenta usando el código o email de tu entrenador.</p>
          <form onSubmit={handleRegisterStudent} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Email o Código de Invitación del Coach</label>
              <input type="text" id="reg-student-code" required defaultValue={initialCoachCode} placeholder="entrenador@correo.com o UUID" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Email</label>
              <input type="email" id="reg-student-email" required placeholder="atleta@correo.com" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">WhatsApp (con código de país)</label>
              <input type="text" id="reg-student-phone" required placeholder="Ej: 5491123456789" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Contraseña (mínimo 6 caracteres)</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} id="reg-student-password" required minLength="6" placeholder="Mínimo 6 caracteres" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Peso Corporal (kg)</label>
                <input type="number" step="0.1" id="reg-student-weight" placeholder="Ej: 75.5" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Objetivo</label>
                <input type="text" id="reg-student-goal" placeholder="Ej: Fuerza" className="w-full border rounded-xl px-4 py-3 text-sm text-zinc-200" />
              </div>
            </div>
            <button type="submit" disabled={loadingAction === 'registerStudent'} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold active:scale-95 transition-all text-sm mt-2 shadow-lg shadow-blue-500/10 disabled:opacity-50">
              {loadingAction === 'registerStudent' ? 'Cargando...' : 'Registrarse como Alumno'}
            </button>
          </form>
          <div className="border-t border-zinc-800/60 mt-4 pt-4">
            <button onClick={() => { setError(null); setActivePanel('login') }} type="button" className="w-full py-3 rounded-xl border border-zinc-800 hover:bg-zinc-800/40 transition-all text-xs font-bold text-zinc-400 active:scale-95">
              Regresar al Inicio de Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
