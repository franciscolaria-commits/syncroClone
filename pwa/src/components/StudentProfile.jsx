import React, { useState } from 'react';
import { useModal } from './ModalProvider.jsx';
import { api, logout } from '../services/api.js';
import { 
  User, Mail, Phone, Calendar, Dumbbell, Target, Shield, 
  Trash2, Lock, Eye, EyeOff, Save, AlertTriangle, CheckCircle2, 
  X, UserCheck, Clock, Award
} from 'lucide-react';

export default function StudentProfile({ profile, onProfileUpdated, onOpenAttendances }) {
  const modal = useModal();

  // Estados de datos personales
  const [telefono, setTelefono] = useState(profile?.usuario?.telefono || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(
    profile?.fecha_nacimiento ? String(profile.fecha_nacimiento).substring(0, 10) : ''
  );
  const [peso, setPeso] = useState(
    profile?.peso_corporal_actual !== null && profile?.peso_corporal_actual !== undefined 
      ? profile.peso_corporal_actual 
      : ''
  );
  const [objetivo, setObjetivo] = useState(profile?.objetivo || '');
  const [isSaving, setIsSaving] = useState(false);

  // Estados de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Estados de eliminación de cuenta
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split('-');
    if (parts.length < 3) return null;
    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age < 120 ? age : null;
  };

  const calculatedAge = calculateAge(fechaNacimiento);

  const PRESET_GOALS = [
    "Hipertrofia (Aumento de masa muscular)",
    "Pérdida de Grasa y Definición",
    "Fuerza Máxima / Powerlifting",
    "Rendimiento Deportivo / Acondicionamiento",
    "Salud, Movilidad y Bienestar",
  ];

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        telefono: telefono.trim() ? telefono.trim() : null,
        fecha_nacimiento: fechaNacimiento || null,
        peso_corporal_actual: peso !== '' ? parseFloat(peso) : null,
        objetivo: objetivo.trim() ? objetivo.trim() : null,
      };

      await api.put('/api/v1/students/me/profile', payload);
      await modal.alert("Tus datos personales fueron actualizados correctamente.");
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      await modal.alert("Error al actualizar perfil: " + (err.message || 'Error del servidor'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      await modal.alert("Debes ingresar tu contraseña actual.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      await modal.alert("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      await modal.alert("La confirmación de la nueva contraseña no coincide.");
      return;
    }

    setIsChangingPass(true);
    try {
      await api.put('/api/v1/students/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await modal.alert("¡Contraseña actualizada con éxito! Recuerda utilizarla la próxima vez que inicies sesión.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      await modal.alert("Error al cambiar contraseña: " + (err.message || 'Error del servidor'));
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR MI CUENTA') {
      await modal.alert("Debes escribir exactamente 'ELIMINAR MI CUENTA' para confirmar.");
      return;
    }
    if (!deletePassword) {
      await modal.alert("Debes ingresar tu contraseña para verificar tu identidad.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete('/api/v1/students/me/account', {
        data: { password: deletePassword }
      });
      setIsDeleteModalOpen(false);
      await modal.alert("Tu cuenta y todos tus datos fueron eliminados de forma definitiva.");
      logout();
    } catch (err) {
      await modal.alert("No se pudo eliminar la cuenta: " + (err.message || 'Error del servidor'));
      setIsDeleting(false);
    }
  };

  const userEmail = profile?.usuario?.email || 'No disponible';
  const coachName = profile?.entrenador?.nombre || profile?.entrenador?.usuario?.email || 'Entrenador vinculado';
  const coachEmail = profile?.entrenador?.usuario?.email;
  const isGymMode = profile?.entrenador?.tipo_cuenta === 'gimnasio';
  const isClassPack = profile?.tipo_membresia === 'por_clases' || profile?.entrenador?.gym_tipo_cobro === 'por_clases';

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* ── HEADER / BANNER DE PERFIL ────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-white">
                <User className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
              </div>
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xl md:text-2xl font-black text-white tracking-tight break-all">
                  {userEmail}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Alumno
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>Entrenador: <strong className="text-zinc-200">{coachName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Estado de Cuenta</p>
                <p className="text-xs font-bold text-zinc-200">
                  {profile?.bloqueado_por_pago ? 'Pago Pendiente' : profile?.estado_activo !== false ? 'Activa y al día' : 'Suspendida'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Membresía</p>
                <p className="text-xs font-bold text-zinc-200">
                  {isClassPack ? `${profile?.clases_restantes || 0} Clases Restantes` : 'Pase Libre'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── COLUMNA PRINCIPAL: DATOS PERSONALES Y FÍSICOS (8 COLS) ── */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Card: Datos Personales y Físicos */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight">Datos Personales y Físicos</h3>
                <p className="text-xs text-zinc-400">Administra los datos de tu ficha personal y de entrenamiento.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Teléfono (WhatsApp) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      Teléfono (WhatsApp)
                    </label>
                    <span className="text-[11px] text-zinc-500 font-medium">Opcional</span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej. +54 9 11 1234-5678"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
                    />
                    {telefono && (
                      <button
                        type="button"
                        onClick={() => setTelefono('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                        title="Eliminar teléfono"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Se utilizará para que tu entrenador te envíe recordatorios de entrenamiento y pagos.
                  </p>
                </div>

                {/* Fecha de Nacimiento */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Fecha de Nacimiento
                    </label>
                    {calculatedAge !== null && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {calculatedAge} años
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Permite a tu entrenador planificar cargas adaptadas a tu edad biológica.
                  </p>
                </div>

              </div>

              {/* Peso Corporal Actual */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                    Peso Corporal Actual (kg)
                  </label>
                  {profile?.fecha_ultimo_peso && (
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Último pesaje: {new Date(profile.fecha_ultimo_peso).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="350"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="Ej. 75.5"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    KG
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Al modificarlo se actualizará automáticamente tu fecha de registro de peso corporal.
                </p>
              </div>

              {/* Objetivo de Entrenamiento */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  Objetivo Principal
                </label>
                
                {/* Botones de selección rápida */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_GOALS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setObjetivo(preset)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        objetivo === preset
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="relative mt-1">
                  <input
                    type="text"
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    placeholder="O escribe tu objetivo personalizado..."
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
                  />
                  {objetivo && (
                    <button
                      type="button"
                      onClick={() => setObjetivo('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                      title="Limpiar objetivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botón Guardar Cambios */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Guardando...' : 'Guardar Datos Personales'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Card: Seguridad (Cambiar Contraseña) */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800/80">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight">Seguridad de la Cuenta</h3>
                <p className="text-xs text-zinc-400">Actualiza tu contraseña para mantener tu cuenta protegida.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  {isChangingPass ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isChangingPass ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* ── COLUMNA LATERAL: INFORMACIÓN Y ZONA DE PELIGRO (4 COLS) ── */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Card: Tu Entrenador y Membresía */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-800">
              <Award className="w-4 h-4 text-emerald-400" />
              Membresía & Entrenador
            </h4>

            <div className="flex flex-col gap-4 text-xs">
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Entrenador Responsable</p>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">{coachName}</p>
                {coachEmail && <p className="text-[11px] text-zinc-500">{coachEmail}</p>}
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Tipo de Plan</p>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">
                  {isClassPack ? 'Paquete por Clases' : 'Pase Libre Mensual'}
                </p>
                {isClassPack && (
                  <p className="text-[11px] text-amber-400 font-semibold mt-1">
                    {profile?.clases_restantes || 0} clases restantes de {profile?.clases_compradas || 0}
                  </p>
                )}
              </div>

              {profile?.fecha_vencimiento_pago && (
                <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Próximo Vencimiento</p>
                  <p className="text-sm font-bold text-zinc-200 mt-0.5">
                    {new Date(profile.fecha_vencimiento_pago).toLocaleDateString()}
                  </p>
                </div>
              )}

              {onOpenAttendances && isGymMode && (
                <button
                  type="button"
                  onClick={onOpenAttendances}
                  className="w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Historial de Asistencias</span>
                </button>
              )}
            </div>
          </div>

          {/* Card: Zona de Peligro (Eliminar Cuenta) */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Zona de Peligro</h4>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Si decides darte de baja, puedes eliminar tu cuenta de forma definitiva. Se borrarán permanentemente todos tus entrenamientos, marcas personales, evaluaciones físicas y datos de acceso.
            </p>

            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText('');
                setDeletePassword('');
                setIsDeleteModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Mi Cuenta</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── MODAL DE CONFIRMACIÓN: ELIMINAR CUENTA DEFINITIVAMENTE ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mb-2">
              ¿Eliminar cuenta definitivamente?
            </h3>

            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Esta acción es <strong className="text-red-400">permanente e irreversible</strong>. Se eliminarán de inmediato todas tus rutinas, sesiones realizadas, historial de fuerza y evaluaciones corporales.
            </p>

            <div className="flex flex-col gap-4 text-xs">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-semibold">
                  Escribe <strong className="text-white select-all">ELIMINAR MI CUENTA</strong> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR MI CUENTA"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 font-semibold">
                  Ingresa tu contraseña actual para verificar tu identidad:
                </label>
                <div className="relative">
                  <input
                    type={showDeletePass ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePass(!showDeletePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showDeletePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR MI CUENTA' || !deletePassword}
                onClick={handleDeleteAccount}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? 'Borrando...' : 'Confirmar Baja'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
