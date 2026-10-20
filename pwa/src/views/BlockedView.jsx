import React, { useState } from "react";
import { LogOut, AlertTriangle, Sparkles, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { logout, api } from "../services/api";

export default function BlockedView() {
  const reason = sessionStorage.getItem("fitness_blocked_reason") || "";
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  let user = null;
  try {
    const raw = localStorage.getItem("fitness_user");
    if (raw) user = JSON.parse(raw);
  } catch (e) {}

  const isCoach = user?.rol === 'entrenador' || reason.includes("Suscripción de entrenador cancelada");
  const isCoachCancelled = reason.includes("cancelada") || reason.includes("Suscripción de entrenador cancelada");
  const isStudentSuspended = user?.rol === 'alumno' || reason.includes("Servicio de entrenador suspendido") || reason.includes("pausada");

  const handleReactivate = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await api.post("/api/v1/coaches/subscription/reactivate");
      sessionStorage.removeItem("fitness_blocked_reason");
      window.location.href = "/";
    } catch (err) {
      console.error("Error al reactivar cuenta:", err);
      setErrorMsg(err.message || "No se pudo reactivar la cuenta. Inténtalo de nuevo o contacta a soporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

        {isCoach && isCoachCancelled ? (
          <div>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Tu Cuenta se Encuentra Pausada</h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Has cancelado tu suscripción a Syncro. El acceso a tus herramientas de gestión y las cuentas de tus alumnos se encuentran temporalmente bloqueadas. Puedes reactivar tu servicio en cualquier momento con un solo clic.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs text-left">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleReactivate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-base rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Reactivando cuenta...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Reactivar mi Cuenta Ahora</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-medium rounded-xl transition-colors border border-zinc-700/50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        ) : isStudentSuspended ? (
          <div>
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Servicio en Pausa</h1>
            <p className="text-zinc-300 text-sm mb-4 leading-relaxed font-medium">
              Tu acceso está temporalmente suspendido porque el servicio de tu entrenador se encuentra pausado. Por favor, comunícate con tu entrenador.
            </p>
            <p className="text-zinc-500 text-xs mb-6">
              Todos tus entrenamientos, rutinas y registros de peso se encuentran respaldados de forma segura. Volverás a tener acceso tan pronto tu entrenador reactive la plataforma.
            </p>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors cursor-pointer border border-zinc-700"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 bg-red-900/30 border border-red-800/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Acceso Bloqueado</h1>

            <p className="text-zinc-300 mb-8 text-sm leading-relaxed">
              {reason.includes("Pago requerido")
                ? "Tu suscripción está vencida. Contacta a soporte para reactivar tu cuenta y recuperar el acceso de tus alumnos."
                : (reason || "El servicio está temporalmente en mantenimiento o suspendido. Por favor, contacta a tu entrenador.")}
            </p>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors cursor-pointer border border-zinc-700"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
