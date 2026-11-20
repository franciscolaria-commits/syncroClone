import React, { useState, useEffect } from 'react';
import { Download, X, PlusSquare, ChevronDown, ChevronUp } from 'lucide-react';

// Detectar si es iOS (iPhone/iPad/iPod)
const isIOS = () => {
  const ua = navigator.userAgent || '';
  return /iP(hone|od|ad)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detectar si ya está instalada como PWA
const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
};

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState('unknown'); // 'chromium' | 'ios' | 'unknown'

  useEffect(() => {
    // No mostrar si ya fue descartado por el usuario (con reset a 30 días)
    const dismissed = localStorage.getItem('syncro_pwa_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      if (Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem('syncro_pwa_dismissed');
    }

    // No mostrar si ya está instalada
    if (isStandalone()) return;

    // Caso iOS
    if (isIOS()) {
      setPlatform('ios');
      setShowBanner(true);
      return;
    }

    // Caso Chrome / Chromium — escuchar beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('chromium');
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar si ya fue instalada durante la sesión
    const installedHandler = () => {
      setShowBanner(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Handler Chrome/Android: dispara el prompt nativo
  const handleInstallChromium = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSSteps(false);
    localStorage.setItem('syncro_pwa_dismissed', String(Date.now()));
  };

  if (!showBanner) return null;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER: iOS Safari — Instrucciones paso a paso
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (platform === 'ios') {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
        {/* Banner principal */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-300">
                ¡Instalá Syncro en tu iPhone!
              </p>
              <p className="text-xs text-zinc-400">
                Accedé más rápido desde tu pantalla de inicio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowIOSSteps(!showIOSSteps)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              {showIOSSteps ? 'Ocultar' : 'Ver cómo'}
              {showIOSSteps
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tutorial expandible iOS — 3 pasos visuales */}
        {showIOSSteps && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4">

              <p className="text-xs text-zinc-400 font-medium text-center">
                Seguí estos 3 pasos para instalar Syncro:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Paso 1 */}
                <div className="flex flex-col items-center gap-2 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-black text-sm">1</span>
                  </div>
                  <div className="w-8 h-8 text-blue-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-300 text-center font-medium">
                    Tocá el botón de <strong className="text-blue-400">Compartir</strong>
                  </p>
                  <p className="text-[10px] text-zinc-500 text-center">
                    (el ícono con la flecha hacia arriba en la barra inferior de Safari)
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="flex flex-col items-center gap-2 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 font-black text-sm">2</span>
                  </div>
                  <div className="w-8 h-8 text-emerald-400 flex items-center justify-center">
                    <PlusSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-zinc-300 text-center font-medium">
                    Seleccioná <strong className="text-emerald-400">"Agregar a inicio"</strong>
                  </p>
                  <p className="text-[10px] text-zinc-500 text-center">
                    (desplazá hacia abajo en el menú hasta encontrar la opción)
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="flex flex-col items-center gap-2 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-400 font-black text-sm">3</span>
                  </div>
                  <div className="w-8 h-8 text-amber-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-300 text-center font-medium">
                    Tocá <strong className="text-amber-400">"Agregar"</strong>
                  </p>
                  <p className="text-[10px] text-zinc-500 text-center">
                    ¡Listo! Syncro aparecerá como app en tu pantalla de inicio
                  </p>
                </div>

              </div>

              <p className="text-[10px] text-zinc-600 text-center mt-1">
                Una vez instalada, Syncro se abrirá en pantalla completa como una app nativa.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER: Chrome / Android — Botón de instalación directa
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-300 truncate">
            ¡Instalá Syncro en tu celular!
          </p>
          <p className="text-xs text-zinc-400 truncate">
            Accedé más rápido y usalo como una app nativa.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallChromium}
          disabled={isInstalling}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          {isInstalling ? 'Instalando...' : 'Instalar'}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
