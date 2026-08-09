import React, { useState } from 'react';
import { 
  Users, QrCode, Link as LinkIcon, Mail, Dumbbell, ClipboardList, 
  CheckCircle, DollarSign, Settings, RefreshCcw, Handshake, AlertCircle,
  ChevronDown, ChevronUp, Check, MousePointerClick
} from 'lucide-react';

export default function TutorialPanel() {
  const [openSections, setOpenSections] = useState({
    alumnos: true,
    rutinas: false,
    finanzas: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-4xl mx-auto">
      <div className="glass-card rounded-2xl p-6 shadow-lg border border-zinc-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <MousePointerClick className="text-blue-500 w-6 h-6" />
          Cómo Usar Syncro
        </h2>
        <p className="text-sm text-zinc-400">
          Bienvenido a la guía rápida. Aquí aprenderás a sacar el máximo provecho a la plataforma para gestionar a tus alumnos, crear rutinas y llevar el control de tus finanzas.
        </p>
      </div>

      {/* SECCIÓN 1: ALUMNOS */}
      <div className="glass-card rounded-2xl shadow-lg border border-zinc-800 overflow-hidden">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors"
          onClick={() => toggleSection('alumnos')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">1. Vincular Alumnos</h3>
              <p className="text-xs text-zinc-500">Formas de conectar a tus alumnos con tu cuenta</p>
            </div>
          </div>
          {openSections.alumnos ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
        </div>
        
        {openSections.alumnos && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 flex flex-col gap-6">
            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300">
                <strong className="text-white">¡Importante para entrenadores nuevos!</strong> Para poder ver las opciones de registro y vinculación para tus alumnos, primero debes tocar el botón <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs mx-1">Generar Mi Enlace</span> en la pestaña de Alumnos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-zinc-200 text-sm">QR de Registro</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  En la pestaña de <strong>Alumnos</strong>, encontrarás un QR de registro. Al escanearlo con el celular, el alumno es llevado a la pantalla de creación de cuenta y se vincula automáticamente.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-bold text-zinc-200 text-sm">Link Mágico</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Copia el Link Mágico desde la sección <strong>Alumnos</strong> y envíalo por WhatsApp o Instagram. Al hacer clic, el alumno entrará a la app y quedará vinculado al instante.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-orange-400" />
                  <h4 className="font-bold text-zinc-200 text-sm">Vinculación por Email</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  El alumno puede registrarse normalmente y, cuando la app le pregunte por su entrenador, solo debe ingresar <strong>tu correo electrónico</strong> (el que usás para iniciar sesión).
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-zinc-200 text-sm">QR de Inicio Rápido</h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Para los alumnos que ya tienen su cuenta, podés mostrarles el <strong>QR de Login</strong>. Al escanearlo, irán directo a la pantalla de iniciar sesión sin perder tiempo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: RUTINAS */}
      <div className="glass-card rounded-2xl shadow-lg border border-zinc-800 overflow-hidden">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors"
          onClick={() => toggleSection('rutinas')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">2. Crear y Asignar Rutinas</h3>
              <p className="text-xs text-zinc-500">Flujo de trabajo para armar planes de entrenamiento</p>
            </div>
          </div>
          {openSections.rutinas ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
        </div>
        
        {openSections.rutinas && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20">
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-zinc-200 mb-1 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-zinc-400" /> Ejercicios (Opcional)
                  </h4>
                  <p className="text-sm text-zinc-400">
                    La plataforma ya cuenta con ejercicios predeterminados. Si necesitás agregar uno específico tuyo (con tu propio video o GIF), podés crearlo desde la pestaña <strong>Ejercicios</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-zinc-200 mb-1 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-zinc-400" /> Crear una Rutina
                  </h4>
                  <p className="text-sm text-zinc-400">
                    En el menú superior (o lateral), hace clic en el botón <strong className="text-indigo-400">Crear Rutina</strong>. Podrás ponerle nombre a la rutina e ir agregando días y los ejercicios correspondientes en cada día, seleccionar con qué frecuencia realizar la rutina y hasta el descanso entre series.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-zinc-200 mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-zinc-400" /> Asignar al Alumno
                  </h4>
                  <p className="text-sm text-zinc-400">
                    Una vez creada la rutina, podés asignarla a tus alumnos directamente desde la pestaña <strong>Mis Rutinas</strong>.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-zinc-400">
                    <li>Tocá en "Opciones de la rutina" y luego <strong>Asignación Masiva</strong> para dársela a uno o varios alumnos a la vez.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* SECCIÓN 3: FINANZAS */}
      <div className="glass-card rounded-2xl shadow-lg border border-zinc-800 overflow-hidden mb-8">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors"
          onClick={() => toggleSection('finanzas')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">3. Control de Finanzas</h3>
              <p className="text-xs text-zinc-500">Gestión de pagos, cobros y vencimientos</p>
            </div>
          </div>
          {openSections.finanzas ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
        </div>
        
        {openSections.finanzas && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/20 flex flex-col gap-6">
            
            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-5">
              <h4 className="font-bold text-white flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-zinc-400" /> Configuración Principal (Sección Perfil)
              </h4>
              <p className="text-sm text-zinc-400 mb-4">
                En tu <strong className="text-blue-400">Perfil</strong>, podés configurar cómo se comportan los nuevos alumnos:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200 block mb-1">Estado Inicial</span>
                  <p className="text-xs text-zinc-500">Podés hacer que entren <strong>Activos</strong> directo a la app, o que entren <strong>Suspendidos</strong> y no puedan hacer nada hasta que vos los habilites (ideal si cobrás por adelantado).</p>
                </div>
                <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200 block mb-1">Tipos de Vencimiento</span>
                  <ul className="text-xs text-zinc-500 space-y-1 list-disc pl-4">
                    <li><strong>Individual:</strong> Vence 30 días exactos después de que pagan.</li>
                    <li><strong>Fijo para todos:</strong> Ej. Todos pagan el día 10.</li>
                    <li><strong>Día distinto:</strong> Cada alumno tiene su propio día fijo en el mes.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-5">
              <h4 className="font-bold text-white flex items-center gap-2 mb-3">
                <RefreshCcw className="w-4 h-4 text-zinc-400" /> El Panel de Finanzas
              </h4>
              <p className="text-sm text-zinc-400 mb-4">
                Aquí verás la lista de alumnos según su estado (Al Día, Pendientes o Suspendidos). 
              </p>
              
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> 
                  <span><strong>Marcar Pagado:</strong> Al tocar el botón verde, registrás el pago. El sistema le suma un mes a su vencimiento o acomoda la fecha automáticamente según tus reglas.</span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> 
                  <span><strong>Anular Pago:</strong> Si te equivocaste, podés anular el pago registrado de este mes y volver al alumno a estado "Pendiente".</span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> 
                  <span><strong>Cambiar Día de Cobro:</strong> Si configuraste "Día distinto por alumno", verás un <strong className="text-emerald-400">icono de un lápiz</strong> al lado del monto para asignarle o cambiarle el día exacto de pago (del 1 al 31).</span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> 
                  <span><strong>Suspender/Reactivar:</strong> Con el botón de suspender/reactivar podés bloquear el acceso de un alumno a la app o devolverle el acceso.</span>
                </li>
              </ul>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
