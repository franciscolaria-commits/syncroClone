import React, { useState } from "react";
import { CheckCircle2, Dumbbell, Star, ChevronRight, WifiOff, TrendingUp, Menu, X } from "lucide-react";

export default function LandingPage({ onNavigateLogin }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const WHATSAPP_LINK = "https://wa.me/5492644517903?text=Hola,%20quiero%20activar%20el%20periodo%20de%20prueba%20para%20mi%20gimnasio/entrenamiento.";

  const handleGoToLogin = () => {
    setIsMobileMenuOpen(false);
    if (onNavigateLogin) {
      onNavigateLogin();
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Efectos de Fondo Avanzados */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Fondo base oscuro */}
        <div className="absolute inset-0 bg-[#050505]"></div>
        
        {/* Luces/Blobs difuminados */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/40 rounded-full blur-[120px] opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/30 rounded-full blur-[150px] opacity-60"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[800px] h-[800px] bg-emerald-800/20 rounded-full blur-[180px] opacity-50"></div>
        
        {/* Textura de ruido sutil para darle un toque "premium/matte" */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>
      </div>

      {/* Navbar Minimalista */}
      <nav className="relative z-50 pt-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center bg-gray-900/90 backdrop-blur-xl border border-emerald-500/20 shadow-lg shadow-emerald-900/10 rounded-full px-6 py-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Syncro Logo" className="w-12 h-12 object-contain mix-blend-screen" />
              <span className="text-3xl font-extrabold tracking-tight text-white/90">
                <span className="text-emerald-500">Syn</span>cro
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <a href="#" className="hover:text-white transition-colors cursor-pointer">Inicio</a>
              <a href="#features" className="hover:text-white transition-colors cursor-pointer">Funciones</a>
              <a href="#pricing" className="hover:text-white transition-colors cursor-pointer">Precios</a>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={handleGoToLogin}
                className="text-sm font-medium text-white/70 hover:text-emerald-400 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                Iniciar Sesión / Registrarse
              </button>
              <button 
                onClick={() => window.location.href = WHATSAPP_LINK}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 cursor-pointer"
              >
                Demo gratis
              </button>
            </div>

            {/* Hamburger icon for mobile */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full px-6 mt-2 z-50">
              <div className="bg-gray-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
                <button 
                  onClick={handleGoToLogin}
                  className="w-full text-center py-3 text-sm font-bold text-white hover:bg-white/5 rounded-xl transition-colors border border-white/10"
                >
                  Iniciar Sesión / Registrarse
                </button>
                <button 
                  onClick={() => window.location.href = WHATSAPP_LINK}
                  className="w-full bg-emerald-500 text-gray-900 py-3 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  Demo gratis
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section Centrado */}
      <section className="relative z-10 pt-24 pb-16 px-4 text-center flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 mb-8">
          <span className="bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Para vos</span>
          <span className="text-xs font-medium text-emerald-300/80 tracking-wide">Para entrenadores con 10 a 50 alumnos</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-[1.1]">
          Tus rutinas en Excel te están costando alumnos.
        </h1>
        
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-10 font-light">
          Rutinas, seguimiento de cargas, evaluaciones y cobros en un solo lugar. Dejá las planillas y el caos de WhatsApp.
        </p>

        <button 
          onClick={() => window.location.href = WHATSAPP_LINK}
          className="bg-white hover:bg-gray-200 text-black px-8 py-4 rounded-xl text-base font-semibold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] cursor-pointer"
        >
          Probá gratis por 30 días
        </button>

        {/* Social Proof */}
        <div className="mt-10 flex flex-col items-center gap-2 text-sm text-white/40">
          <div className="flex text-emerald-400 gap-0.5">
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
          </div>
          <span>Usado por entrenadores personales en Argentina</span>
        </div>
      </section>

      {/* App Mockup Flotante */}
      <section className="relative z-10 px-4 pb-24 flex justify-center perspective-1000">
        <div className="relative w-full max-w-5xl rounded-2xl md:rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-emerald-900/20 overflow-hidden transform-gpu">
          {/* Header del mockup simulado */}
          <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-[#111]">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          {/* Video subido a Cloudflare R2 */}
          <video 
            src="https://pub-c9df6b372d71433c93f52808f95347d4.r2.dev/landing/VideoPresentacion.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-auto object-cover opacity-90 mix-blend-screen"
          />
          {/* Sutil gradiente oscuro en la parte inferior de la imagen para fundirse */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none"></div>
        </div>
      </section>

      {/* Propuesta de Valor (5 Puntos B2B) */}
      <section id="features" className="relative z-10 py-24 border-t border-white/5 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Tecnología diseñada para escalar</h2>
            <p className="text-lg text-white/50 max-w-3xl mx-auto">No es solo una app bonita. Es el motor operativo que automatiza tu retención de clientes y destruye tus horas administrativas.</p>
          </div>

          {/* Grilla bento-style para las 5 características */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Offline */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-emerald-500/50">
                <WifiOff className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">1. Entrenamientos sin Interrupciones</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">El Problema:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Los gimnasios tienen pésima señal de celular o Wi-Fi. Si una app depende de internet, no carga, el alumno se frustra y abandona el seguimiento.</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">La Solución:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Registro de pesos y repeticiones 100% offline. Los datos se suben automáticamente al recuperar conexión. Sin fricción ni pérdida de registros.</p>
                </div>
              </div>
            </div>

            {/* 2. Historial */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-blue-500/50">
                <Dumbbell className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">2. Historial de Progreso Intacto</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">El Problema:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Cuando actualizás un Excel o mandás un PDF nuevo, el registro de lo que el alumno levantaba el mes pasado se pierde o queda desorganizado.</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">La Solución:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Cada actualización mantiene el registro previo, generando gráficos visuales de fuerza a lo largo de los meses. Evidencia objetiva para justificar tu servicio.</p>
                </div>
              </div>
            </div>

            {/* 3. Gamificación (Ocupa 2 filas en lg) */}
            <div className="bg-gradient-to-br from-[#111111] to-[#1a1515] p-8 rounded-3xl border border-white/5 hover:border-red-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden lg:row-span-2 flex flex-col">
              <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-red-500/50">
                <TrendingUp className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Motivación en Piloto Automático</h3>
              <div className="space-y-4 flex-1">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">El Problema:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">El alumno promedio pierde la constancia a los 3 meses. Revisar alumno por alumno quién superó sus marcas para felicitarlo es insostenible si tenés volumen.</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-500">La Solución:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Sistema automático de ligas de fuerza. La app detecta RPs y los asciende, gamificando el esfuerzo y generando motivación, con bloqueos antifraude incluidos.</p>
                </div>
              </div>
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 mt-6 relative overflow-hidden">
                 {/* Decoración simulando el nivel */}
                 <div className="absolute right-[-20px] top-[-20px] text-8xl opacity-10">💎</div>
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-white text-sm font-bold">Liga Diamante</span>
                   <span className="text-emerald-400 text-xs font-mono">+12.5% PR</span>
                 </div>
                 <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                   <div className="w-3/4 bg-emerald-500 h-full"></div>
                 </div>
              </div>
            </div>

            {/* 4. Retención */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-purple-500/50">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">4. Radar Anti-Abandono</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">El Problema:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Te enterás de que perdiste un cliente el día que te deja de transferir la cuota. Para ese momento, ya es irrecuperable.</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-500">La Solución:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Radar inteligente que analiza el progreso de tus clientes. Identifica estancamientos e inactividad semanas antes, permitiéndote enviar mensajes precisos de reactivación.</p>
                </div>
              </div>
            </div>

            {/* 5. Backoffice Masivo */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 hover:border-yellow-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-yellow-500/50">
                <CheckCircle2 className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">5. Asignación Masiva de Rutinas</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">El Problema:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Escribir rutinas por WhatsApp, copiar y pegar mensajes, o armar decenas de PDFs individuales te roba horas de tu semana que no estás cobrando.</p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-yellow-500">La Solución:</span>
                  <p className="text-white/60 text-sm mt-1 leading-relaxed">Crea plantillas modulares una sola vez y asígnalas a decenas de alumnos con un clic. Elimina por completo las horas operativas sin facturación.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section (Integrado con el estilo oscuro) */}
      <section id="pricing" className="relative z-10 py-24 bg-[#080808] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Planes diseñados para escalar</h2>
            <p className="text-white/40">Comienza gratis. Paga solo cuando tu negocio crezca.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1 */}
            <a 
              href={WHATSAPP_LINK} 
              className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-emerald-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden flex flex-col cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
              <h3 className="text-lg font-medium text-white/70 mb-2">Plan Inicial</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-bold text-white">$1.500</span>
                <span className="text-white/40 text-sm">ARS / mes</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-white/60">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-base text-white">Hasta <strong>1 alumno</strong></span>
                </li>
                <li className="flex items-center gap-3 opacity-60">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Acceso total a todas las funciones</span>
                </li>
              </ul>
              <div className="w-full py-3 bg-white/5 group-hover:bg-emerald-500/20 border border-white/10 group-hover:border-emerald-500/30 text-white text-center rounded-lg transition-colors text-sm font-medium">
                Elegir Inicial
              </div>
            </a>

            {/* Plan 2 */}
            <a 
              href={WHATSAPP_LINK} 
              className="bg-[#161616] rounded-2xl p-8 border border-emerald-500/30 relative flex flex-col shadow-2xl shadow-emerald-900/10 md:-translate-y-4 hover:-translate-y-6 transition-all group cursor-pointer"
            >
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all"></div>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-black px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase z-10">
                Más Popular
              </div>
              <h3 className="text-lg font-medium text-emerald-400 mb-2 relative z-10">Plan Pro</h3>
              <div className="flex items-baseline gap-2 mb-8 relative z-10">
                <span className="text-4xl font-bold text-white">$12.000</span>
                <span className="text-white/40 text-sm">ARS / mes</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-white/60 relative z-10">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-base text-white">Hasta <strong>10 alumnos</strong></span>
                </li>
                <li className="flex items-center gap-3 opacity-60">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Acceso total a todas las funciones</span>
                </li>
              </ul>
              <div className="w-full py-3 bg-emerald-500 group-hover:bg-emerald-400 text-black text-center font-bold rounded-lg transition-colors text-sm relative z-10 shadow-lg shadow-emerald-500/20">
                Elegir Pro
              </div>
            </a>

            {/* Plan 3 */}
            <a 
              href={WHATSAPP_LINK} 
              className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-emerald-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden flex flex-col cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
              <h3 className="text-lg font-medium text-white/70 mb-2">Plan Premium</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-bold text-white">$50.000</span>
                <span className="text-white/40 text-sm">ARS / mes</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-white/60">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-base text-white">Hasta <strong>50 alumnos</strong></span>
                </li>
                <li className="flex items-center gap-3 opacity-60">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Acceso total a todas las funciones</span>
                </li>
              </ul>
              <div className="w-full py-3 bg-white/5 group-hover:bg-emerald-500/20 border border-white/10 group-hover:border-emerald-500/30 text-white text-center rounded-lg transition-colors text-sm font-medium">
                Elegir Premium
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="border-t border-white/5 py-12 text-center text-white/30 text-sm bg-[#050505]">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/logo.png" alt="Syncro" className="w-5 h-5 opacity-50 grayscale mix-blend-screen" />
          <span className="font-semibold text-white/50">Syncro</span>
        </div>
        <p>© 2026 Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
