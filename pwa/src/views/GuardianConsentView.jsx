import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { ShieldCheck, AlertCircle, CheckCircle, Dumbbell, Award, Calendar, FileText, Lock } from 'lucide-react';

export default function GuardianConsentView() {
  const [token, setToken] = useState('');
  const [info, setInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Form states
  const [nombreTutor, setNombreTutor] = useState('');
  const [vinculoTutor, setVinculoTutor] = useState('padre');
  const [checkParentesco, setCheckParentesco] = useState(false);
  const [checkPolitica, setCheckPolitica] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (!urlToken) {
      setLoadError('No se proporcionó ningún token de autorización. Verifique el enlace recibido por correo.');
      setIsLoading(false);
      return;
    }

    setToken(urlToken);
    api.get(`/api/v1/tutores/info-autorizacion?token=${encodeURIComponent(urlToken)}`)
      .then((data) => {
        setInfo(data);
        if (data.nombre_tutor) setNombreTutor(data.nombre_tutor);
        if (data.vinculo_tutor) setVinculoTutor(data.vinculo_tutor);
        if (data.estado === 'autorizado') {
          setSubmitSuccess(true);
        }
      })
      .catch((err) => {
        setLoadError(err.message || 'El enlace de autorización es inválido o ha expirado.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!nombreTutor.trim()) {
      setSubmitError('Por favor ingresa tu nombre y apellido completo.');
      return;
    }

    if (!checkParentesco || !checkPolitica) {
      setSubmitError('Debes marcar ambas casillas bajo declaración jurada para confirmar la autorización.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/v1/tutores/autorizar', {
        token,
        nombre: nombreTutor.trim(),
        vinculo: vinculoTutor,
        checks_jurados: true
      });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'Ocurrió un error al procesar la autorización. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-lg shadow-sm">
            S
          </div>
          <div>
            <span className="font-black text-base tracking-wider bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              SYNCRO
            </span>
            <span className="block text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              Legal & Privacidad
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} />
          <span>Portal Oficial</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto my-auto py-8">
        {isLoading ? (
          <div className="glass-card rounded-2xl p-8 border border-zinc-800 bg-zinc-900/40 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-3 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-zinc-300">Validando credenciales de autorización...</p>
            <p className="text-xs text-zinc-500 mt-1">Criptografía segura y verificación inmutable</p>
          </div>
        ) : loadError ? (
          <div className="glass-card rounded-2xl p-8 border border-red-500/30 bg-zinc-900/60 text-center flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Solicitud No Disponible</h2>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
              {loadError}
            </p>
            <p className="text-xs text-zinc-500">
              Si el enlace venció (30 días de vigencia), solicita al alumno que ingrese a su sesión en Syncro y pulse <b>Reenviar Enlace</b>.
            </p>
          </div>
        ) : submitSuccess ? (
          <div className="glass-card rounded-2xl p-8 border border-emerald-500/40 bg-zinc-900/70 text-center flex flex-col items-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle size={40} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              Consentimiento Registrado
            </div>

            <h1 className="text-2xl font-black text-white mb-2">
              ¡Autorización Formal Completada!
            </h1>

            <p className="text-sm text-zinc-300 max-w-md leading-relaxed mb-6">
              La cuenta deportiva de <b className="text-white">{info?.nombre_alumno}</b> ha sido habilitada con éxito. Ya tiene acceso total a sus planes de entrenamiento con su entrenador <b className="text-white">{info?.nombre_entrenador}</b>.
            </p>

            <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-left text-xs text-zinc-400 flex flex-col gap-2 mb-6">
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500">Alumno:</span>
                <span className="font-semibold text-zinc-200">{info?.nombre_alumno}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500">Entrenador / Box:</span>
                <span className="font-semibold text-zinc-200">{info?.nombre_entrenador}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500">Tutor responsable:</span>
                <span className="font-semibold text-zinc-200">{nombreTutor || info?.email_tutor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Estado legal:</span>
                <span className="font-bold text-emerald-400">Autorizado y Activo</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Hemos despachado una constancia por correo a <b>{info?.email_tutor}</b>. Puedes cerrar esta ventana.
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-zinc-800 bg-zinc-900/60 shadow-2xl flex flex-col gap-6">
            {/* Header info */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Lock size={12} />
                Cumplimiento Legal de Protección de Menores
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Autorización Parental de Menor
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                Por favor, revise las finalidades y brinde su conformidad para el alta atlética de su representado/a.
              </p>
            </div>

            {/* Context Badge */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Alumno a autorizar:</span>
                <span className="font-bold text-sm text-white">{info?.nombre_alumno}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Entrenador / Box:</span>
                <span className="font-semibold text-zinc-200">{info?.nombre_entrenador}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Casilla legal del tutor:</span>
                <span className="font-mono text-emerald-400">{info?.email_tutor}</span>
              </div>
            </div>

            {/* Fines del Tratamiento (Transparencia Legal) */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-emerald-400" />
                Fines del Tratamiento Deportivo
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-col gap-1.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Dumbbell size={15} />
                  </div>
                  <span className="text-xs font-bold text-zinc-200">Planificación</span>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Diseño y prescripción de rutinas de fuerza adaptadas al menor.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-col gap-1.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Award size={15} />
                  </div>
                  <span className="text-xs font-bold text-zinc-200">Cargas y Peso</span>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Seguimiento de peso corporal, repeticiones y evolución de rendimiento.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-col gap-1.5">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Calendar size={15} />
                  </div>
                  <span className="text-xs font-bold text-zinc-200">Asistencia</span>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Control de concurrencia a entrenamientos presenciales.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-400 leading-relaxed">
                🛡️ <b>Compromiso de Privacidad:</b> Syncro aplica el principio de <b>minimización de datos</b>. No solicitamos DNI de ninguna de las partes. Los datos deportivos son de acceso exclusivo para el menor y su entrenador acreditado.
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-zinc-800 pt-5">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Declaración y Datos del Tutor
              </h2>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  Nombre y Apellido del Padre, Madre o Tutor Legal *
                </label>
                <input
                  type="text"
                  required
                  value={nombreTutor}
                  onChange={(e) => setNombreTutor(e.target.value)}
                  placeholder="Ej: Laura Martínez"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  Vínculo / Representación Legal *
                </label>
                <select
                  value={vinculoTutor}
                  onChange={(e) => setVinculoTutor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="padre">Padre</option>
                  <option value="madre">Madre</option>
                  <option value="tutor_legal">Tutor Legal / Representante</option>
                </select>
              </div>

              {/* Declaraciones Juradas */}
              <div className="space-y-3 mt-1 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkParentesco}
                    onChange={(e) => setCheckParentesco(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300 leading-relaxed select-none">
                    Declaro <b>bajo fe de juramento</b> que poseo la patria potestad o tutela legal sobre el/la menor <b>{info?.nombre_alumno}</b> y que los datos ingresados son fidedignos.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer border-t border-zinc-800/80 pt-3">
                  <input
                    type="checkbox"
                    checked={checkPolitica}
                    onChange={(e) => setCheckPolitica(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300 leading-relaxed select-none">
                    Autorizo expresamente el <b>tratamiento de sus datos deportivos y seguimiento físico</b> en la plataforma Syncro. Comprendo que puedo revocar este permiso en cualquier momento escribiendo a <a href="mailto:syncroclone@gmail.com" className="text-emerald-400 hover:underline">syncroclone@gmail.com</a>.
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !checkParentesco || !checkPolitica || !nombreTutor.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-black text-sm text-white shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Registrando Firma Digital...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Confirmar y Autorizar Consentimiento</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto py-4 text-center text-xs text-zinc-600 border-t border-zinc-800/60">
        Syncro Fitness Platform &copy; 2026 • Versión de Política {info?.version_politica || 'v1.0-2026-10'}
      </footer>
    </div>
  );
}
