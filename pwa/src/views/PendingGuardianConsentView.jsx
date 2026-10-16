import React, { useState, useEffect } from 'react';
import { api, logout } from '../services/api.js';
import { useModal } from '../components/ModalProvider.jsx';
import { ShieldAlert, Mail, Send, Edit3, RefreshCw, LogOut, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';

export default function PendingGuardianConsentView({ user, onUpdateUser }) {
  const modal = useModal();
  const [tutorEmail, setTutorEmail] = useState(user?.email_tutor || '');
  const [authUrl, setAuthUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email_tutor || '');
  const [loadingAction, setLoadingAction] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchPendingLink() {
      try {
        const data = await api.get('/api/v1/tutores/mi-enlace');
        if (!isMounted) return;
        if (data?.enlace_autorizacion) {
          setAuthUrl(data.enlace_autorizacion);
        }
        if (data?.email_tutor) {
          setTutorEmail(data.email_tutor);
        }
      } catch (err) {
        console.warn('[PendingGuardianConsent] No se pudo recuperar enlace directo inicial:', err);
      }
    }
    fetchPendingLink();
    return () => { isMounted = false; };
  }, []);

  const handleCopyLink = async () => {
    if (!authUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(authUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = authUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Error al copiar enlace', e);
    }
  };

  const handleResend = async () => {
    setLoadingAction('resend');
    setFeedbackMessage(null);
    try {
      const res = await api.post('/api/v1/tutores/reenviar-solicitud', {});
      if (res.enlace_autorizacion) {
        setAuthUrl(res.enlace_autorizacion);
      }
      if (res.email_enviado === false) {
        setFeedbackMessage({
          type: 'error',
          text: res.message || 'El enlace se generó correctamente, pero el servidor no pudo entregar el email. Puedes copiar el enlace directo abajo.'
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: res.message || 'Se ha reenviado el correo de autorización a tu tutor con éxito. Recuerda revisar la carpeta de Spam.'
        });
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'No se pudo reenviar la solicitud. Intenta más tarde.'
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      modal.alert('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setLoadingAction('updateEmail');
    setFeedbackMessage(null);
    try {
      const res = await api.post('/api/v1/tutores/reenviar-solicitud', {
        email_tutor: newEmail.trim()
      });
      setTutorEmail(res.email_tutor || newEmail.trim());
      if (res.enlace_autorizacion) {
        setAuthUrl(res.enlace_autorizacion);
      }
      setIsEditModalOpen(false);
      if (res.email_enviado === false) {
        setFeedbackMessage({
          type: 'error',
          text: res.message || `Correo actualizado a ${res.email_tutor || newEmail.trim()}, pero no se pudo entregar el email. Copia el enlace directo abajo.`
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: res.message || `Correo del tutor actualizado a ${res.email_tutor || newEmail.trim()} y enlace despachado.`
        });
      }

      // Actualizar sesión local
      const localUser = JSON.parse(localStorage.getItem('fitness_user') || '{}');
      localUser.email_tutor = res.email_tutor || newEmail.trim();
      localStorage.setItem('fitness_user', JSON.stringify(localUser));
      if (onUpdateUser) onUpdateUser(localUser);
    } catch (err) {
      modal.alert(err.message || 'Error al actualizar el correo.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckStatus = async () => {
    setLoadingAction('checkStatus');
    setFeedbackMessage(null);
    try {
      const profile = await api.get('/api/v1/students/profile');
      if (profile.autorizacion_tutor_completada) {
        // Actualizar sesión local
        const localUser = JSON.parse(localStorage.getItem('fitness_user') || '{}');
        localUser.autorizacion_tutor_completada = true;
        localStorage.setItem('fitness_user', JSON.stringify(localUser));
        if (onUpdateUser) {
          onUpdateUser(localUser);
        } else {
          window.location.reload();
        }
      } else {
        setFeedbackMessage({
          type: 'info',
          text: 'La autorización aún se encuentra pendiente de firma por tu tutor. En cuanto complete el formulario, tendrás acceso inmediato.'
        });
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: 'No se pudo verificar el estado actual. Intenta nuevamente.'
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400">
            S
          </div>
          <span className="font-black text-base tracking-wider bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            SYNCRO
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-red-500/30 bg-zinc-900/40 transition-colors"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-amber-500/20 bg-zinc-900/60 flex flex-col items-center text-center">
          {/* Badge Icon */}
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 mb-5 animate-pulse">
            <ShieldAlert size={34} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
            Pendiente de Autorización Parental
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white mb-2">
            Tu cuenta está casi lista
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
            Por normativas de privacidad y protección de menores de 18 años, tu padre, madre o tutor legal debe brindar su conformidad para que puedas comenzar a entrenar y registrar métricas en Syncro.
          </p>

          {/* Email Info Box */}
          <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Mail size={13} className="text-zinc-500" />
                Correo del tutor legal:
              </span>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 transition-colors"
              >
                <Edit3 size={12} />
                Corregir
              </button>
            </div>
            <div className="font-mono text-sm text-amber-300 font-bold truncate bg-zinc-900/80 px-3 py-2 rounded-lg border border-zinc-800">
              {tutorEmail || 'No asignado'}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Enviamos un enlace seguro de 30 días con los fines del tratamiento y la declaración jurada.
            </p>
          </div>

          {/* Direct Link Box */}
          {authUrl && (
            <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mb-4 flex flex-col gap-2 text-left">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ExternalLink size={13} />
                  Enlace directo de autorización:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={authUrl}
                  className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-black'
                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                  }`}
                  title="Copiar enlace"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <p className="text-[11px] text-zinc-500">
                💡 Si el correo tarda o tu tutor está presente, puedes abrirlo directamente o enviárselo por WhatsApp.
              </p>
            </div>
          )}

          {/* Spam / Promociones Notice */}
          <div className="w-full bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 mb-4 text-left flex items-start gap-2.5">
            <div className="text-base leading-none mt-0.5">📬</div>
            <div className="text-[11px] text-zinc-300 leading-relaxed">
              <b className="text-amber-400">¿No llega el correo?</b> Revisa la carpeta de <b>Spam / Correo no deseado</b> o la pestaña <b>Promociones</b> de la casilla del tutor. También puedes copiar el enlace directo de arriba.
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div
              className={`w-full p-3 rounded-xl text-xs font-medium mb-4 flex items-center gap-2 text-left ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : feedbackMessage.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
              }`}
            >
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={loadingAction === 'checkStatus'}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-sm text-white shadow-lg shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loadingAction === 'checkStatus' ? 'animate-spin' : ''} />
              {loadingAction === 'checkStatus' ? 'Verificando...' : 'Ya me autorizaron (Verificar)'}
            </button>

            <button
              onClick={handleResend}
              disabled={loadingAction === 'resend'}
              className="w-full py-3 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={14} />
              {loadingAction === 'resend' ? 'Reenviando...' : 'Reenviar Enlace al Tutor'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 leading-relaxed">
            🛡️ Mientras tu autorización esté en trámite, tus datos deportivos no son accesibles ni modificables.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-zinc-600">
        Syncro Fitness Platform &copy; 2026 • Protección de Menores
      </footer>

      {/* Modal para rectificar email */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white mb-1">Corregir Correo del Tutor</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Si hubo un error tipográfico en la casilla de tu padre, madre o tutor legal, actualízala aquí para despachar un nuevo enlace.
            </p>
            <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  Nuevo Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="tutor@ejemplo.com"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'updateEmail'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  {loadingAction === 'updateEmail' ? 'Guardando...' : 'Actualizar y Reenviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
