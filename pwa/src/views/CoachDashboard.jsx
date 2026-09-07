import React, { useState, useEffect, useRef } from 'react';
import { api, logout } from '../services/api.js';
import { useModal } from '../components/ModalProvider.jsx';
import WorkoutBuilder from './WorkoutBuilder.jsx';
import StudentProgress from './StudentProgress.jsx';
import FinancesPanel from '../components/FinancesPanel.jsx';
import TutorialPanel from '../components/TutorialPanel.jsx';
import { Menu, X, Copy, Download, ChevronDown, ChevronUp } from "lucide-react";

export default function CoachDashboard() {
  const [activePanel, setActivePanel] = useState('students');
  const [esConPeso, setEsConPeso] = useState(true);
  const [isBuildingRoutine, setIsBuildingRoutine] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [email, setEmail] = useState('');
  const [students, setStudents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [profile, setProfile] = useState({});
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [audits, setAudits] = useState([]);
  const [attendanceAlerts, setAttendanceAlerts] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);
  const [assignMenuOpenId, setAssignMenuOpenId] = useState(null);
  const [selectedStudentsForAssign, setSelectedStudentsForAssign] = useState([]);
  const modal = useModal();

  useEffect(() => {
    const userRaw = localStorage.getItem("fitness_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      setEmail(user.email);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stdData = await api.get("/api/v1/coaches/students");
      setStudents(stdData);
      
      const invData = await api.get("/api/v1/coaches/invitations");
      setInvitations(invData);
      
      const exData = await api.get("/api/v1/exercises");
      setExercises(exData);
      
      const rutData = await api.get("/api/v1/routines");
      setRoutines(rutData);

      const profData = await api.get("/api/v1/coaches/profile");
      setProfile(profData);
      
      const audData = await api.get("/api/v1/coaches/audits/pending");
      setAudits(audData);

      const alertsData = await api.get("/api/v1/coaches/audits/attendance_alerts");
      setAttendanceAlerts(alertsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveAudit = async (id, action) => {
    if (!(await modal.confirm(`¿Seguro que deseas ${action} este récord?`))) return;
    setLoadingAction(`audit-${id}-${action}`);
    try {
      await api.post(`/api/v1/coaches/audits/${id}/resolve`, { action });
      await modal.alert(`Récord ${action} exitosamente.`);
      loadData();
    } catch (err) {
      await modal.alert("Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    const nombre = e.target.nombre.value.trim();
    const descripcion = e.target.descripcion.value.trim();
    const url_media = e.target.url_media.value.trim();
    const categoria = e.target.categoria.value;
    const tipo_banda = !esConPeso ? (e.target.tipo_banda.value !== 'ninguna' ? e.target.tipo_banda.value : null) : null;
    const fileInput = e.target.gif_file;
    
    setLoadingAction('create_exercise');
    try {
      let url_gif = undefined;
      
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        // Solicitar firma a la API
        const presignedRes = await api.post("/api/v1/storage/presigned", {
          filename: file.name,
          content_type: file.type
        });
        
        // Subir directamente a Cloudflare R2 usando fetch PUT nativo
        const uploadRes = await fetch(presignedRes.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });
        
        if (!uploadRes.ok) throw new Error("Fallo la subida a Cloudflare R2");
        url_gif = presignedRes.public_url;
      }
      
      await api.post("/api/v1/exercises/custom", { 
        nombre, descripcion, url_media, categoria, url_gif, 
        es_con_peso: esConPeso, tipo_banda 
      });
      await modal.alert("Ejercicio creado exitosamente.");
      e.target.reset();
      setEsConPeso(true);
      loadData();
    } catch (error) {
      await modal.alert(`Error al crear ejercicio: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOverrideMedia = async (id_ejercicio) => {
    const url = await modal.prompt("Ingresa la URL de YouTube para este ejercicio global (Solo lo verán tus alumnos):");
    if (!url) return; 
    try {
      await api.post(`/api/v1/exercises/${id_ejercicio}/media`, { url_media: url.trim() });
      await modal.alert("Video asignado exitosamente al ejercicio global.");
      loadData();
    } catch (err) {
      await modal.alert("Error: " + err.message);
    }
  };

  const handleEditCustomExercise = async (ejercicio) => {
    const nombre = await modal.prompt("Nuevo nombre del ejercicio:");
    if (nombre === null) return;
    const url = await modal.prompt("Nueva URL de YouTube para el ejercicio:");
    if (url === null) return;
    
    try {
      await api.put(`/api/v1/exercises/${ejercicio.id_ejercicio}`, { 
        nombre: nombre.trim() || undefined,
        url_media: url.trim() || undefined
      });
      await modal.alert("Ejercicio modificado exitosamente.");
      loadData();
    } catch (err) {
      await modal.alert("Error: " + err.message);
    }
  };

  const handleDeleteCustomExercise = async (id_ejercicio) => {
    if (!(await modal.confirm("¿Estás seguro de eliminar este ejercicio personalizado? Esta acción no se puede deshacer."))) return;
    try {
      await api.delete(`/api/v1/exercises/${id_ejercicio}`);
      await modal.alert("Ejercicio eliminado exitosamente.");
      loadData();
    } catch (err) {
      await modal.alert("Error al eliminar: Es posible que esté en uso en alguna rutina.");
    }
  };

  const handleDeactivateStudent = async (id) => {
    if (!(await modal.confirm("¿Estás seguro de dar de baja a este alumno?"))) return;
    try {
      await api.delete(`/api/v1/coaches/students/${id}`);
      await modal.alert("Alumno dado de baja con éxito.");
      loadData();
    } catch (error) {
      await modal.alert(`Error: ${error.message}`);
    }
  };

  const handleReactivateStudent = async (id) => {
    let dia_vencimiento_personalizado = null;
    
    // Si la config es fijo_por_alumno y el alumno no tiene fecha, pedimos el día
    if (profile?.config_vencimiento_tipo === "fijo_por_alumno") {
       const student = students.find(s => s.id_usuario === id);
       if (student && !student.fecha_vencimiento_pago) {
         const diaStr = window.prompt("Configuración: Día distinto por alumno.\n\nIngresa el DÍA DEL MES (1-31) en que este alumno debe pagar siempre:");
         if (!diaStr) {
            await modal.alert("Debes ingresar un día para poder activar a este alumno.");
            return;
         }
         const dia = parseInt(diaStr);
         if (isNaN(dia) || dia < 1 || dia > 31) {
            await modal.alert("Día inválido. Debe ser un número entre 1 y 31.");
            return;
         }
         dia_vencimiento_personalizado = dia;
       }
    }
    
    try {
      await api.patch(`/api/v1/coaches/students/${id}/reactivate`, { dia_vencimiento_personalizado });
      await modal.alert("Alumno reactivado con éxito.");
      loadData();
    } catch (error) {
      await modal.alert(`Error: ${error.message}`);
    }
  };

  const handleHardDeleteStudent = async (id) => {
    if (!(await modal.confirm("¿ESTÁS SEGURO? Esta acción borrará permanentemente todo el historial del alumno y no se puede deshacer."))) return;
    try {
      await api.delete(`/api/v1/coaches/students/${id}/hard`);
      await modal.alert("Alumno eliminado definitivamente.");
      loadData();
    } catch (error) {
      await modal.alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateClasificacion = async (id) => {
    const clas = await modal.prompt("Ingresa la clasificación para el alumno (ej: Principiante, Competición):");
    if (clas === null) return;
    try {
      await api.put(`/api/v1/coaches/students/${id}`, { clasificacion: clas.trim() || null });
      loadData();
    } catch (error) {
      await modal.alert(`Error: ${error.message}`);
    }
  };

  const handleUpdatePaymentDate = async (id) => {
    const diaStr = window.prompt("Ingresa el nuevo DÍA DEL MES (1-31) en que este alumno debe pagar siempre:");
    if (!diaStr) return;
    const dia = parseInt(diaStr);
    if (isNaN(dia) || dia < 1 || dia > 31) {
       await modal.alert("Día inválido. Debe ser un número entre 1 y 31.");
       return;
    }
    try {
      await api.patch(`/api/v1/coaches/students/${id}/payment_date`, { dia_vencimiento_personalizado: dia });
      loadData();
    } catch (error) {
      await modal.alert(`Error al actualizar el día de pago: ${error.message}`);
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    setLoadingAction('create_invitation');
    try {
      const data = await api.post("/api/v1/coaches/invitations", {});
      await modal.alert(`¡Código generado con éxito!\nCódigo UUIDv4: ${data.codigo_unico}`);
      e.target.reset();
      loadData();
    } catch (error) {
      await modal.alert(`Error: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4 md:p-8 relative">
      <header className="glass-card rounded-2xl p-4 flex items-center justify-between shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">COACH HUB</h1>
            <p className="text-xs text-zinc-400 truncate max-w-xs font-mono">{email}</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => { setActivePanel('students'); setSelectedStudentId(null); }} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'students' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>Alumnos</button>
          <button onClick={() => setActivePanel('exercises')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'exercises' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>Ejercicios</button>
          <button onClick={() => setActivePanel('routines')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'routines' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>Mis Rutinas</button>
          <button onClick={() => setActivePanel('finances')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'finances' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>Finanzas</button>
          <button onClick={() => setActivePanel('audits')} className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'audits' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
            Auditoría
            {audits.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-pulse">{audits.length}</span>
            )}
          </button>
          <button onClick={() => setActivePanel('tutorial')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'tutorial' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'} ml-2`}>Cómo usar</button>
          <button onClick={() => { setEditingRoutine(null); setIsBuildingRoutine(true); }} className="px-3 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 ml-2">Crear Rutina</button>
          <button onClick={() => setActivePanel('profile')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activePanel === 'profile' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'} ml-2`}>Perfil</button>
          <button onClick={logout} className="px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10 ml-2">Salir</button>
        </nav>

        {/* Hamburger icon for mobile */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-zinc-400 hover:text-white p-2">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[80px] left-4 right-4 z-50">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 shadow-xl">
            <button onClick={() => { setActivePanel('students'); setSelectedStudentId(null); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'students' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Alumnos</button>
            <button onClick={() => { setActivePanel('exercises'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'exercises' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Ejercicios</button>
            <button onClick={() => { setActivePanel('routines'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'routines' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Mis Rutinas</button>
            <button onClick={() => { setActivePanel('finances'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'finances' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Finanzas</button>
            <button onClick={() => { setActivePanel('audits'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all flex justify-between items-center ${activePanel === 'audits' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
              Auditoría {audits.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{audits.length}</span>}
            </button>
            <button onClick={() => { setActivePanel('tutorial'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'tutorial' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Cómo usar</button>
            <button onClick={() => { setEditingRoutine(null); setIsBuildingRoutine(true); setIsMobileMenuOpen(false); }} className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white">Crear Rutina</button>
            <button onClick={() => { setActivePanel('profile'); setIsMobileMenuOpen(false); }} className={`w-full text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${activePanel === 'profile' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>Perfil</button>
            <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full text-left py-3 px-4 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10">Salir</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {activePanel === 'students' && (
          selectedStudentId ? (
            <div className="flex flex-col gap-4 w-full">
              <button onClick={() => setSelectedStudentId(null)} className="self-start px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all border border-zinc-700/50 flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Volver a Mis Alumnos
              </button>
              <StudentProgress studentId={selectedStudentId} />
            </div>
          ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 shadow-lg md:col-span-1 flex flex-col gap-4 order-2 md:order-1">
              <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setIsInviteOpen(!isInviteOpen)}
              >
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Formas de invitar a tus alumnos</h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Tus alumnos quedarán vinculados a tu cuenta automáticamente (los códigos no expiran).</p>
                </div>
                {isInviteOpen ? <ChevronUp className="text-zinc-400 flex-shrink-0 ml-2" /> : <ChevronDown className="text-zinc-400 flex-shrink-0 ml-2" />}
              </div>
              
              {isInviteOpen && (
                <div className="flex flex-col gap-5 border border-zinc-800 bg-zinc-900/30 p-4 rounded-xl animate-in fade-in duration-300">
                {invitations.length === 0 ? (
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 italic mb-3">No tienes códigos generados.</p>
                    <form onSubmit={handleCreateInvitation}>
                      <button type="submit" disabled={loadingAction === 'create_invitation'} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-xs disabled:opacity-50">
                        {loadingAction === 'create_invitation' ? 'Generando...' : 'Generar Mi Enlace'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                      {/* QR Registro */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-zinc-300">1. QR para Registrarse (Alumnos Nuevos)</span>
                        <p className="text-[11px] text-zinc-500">Muestra este QR para que el alumno cree su cuenta y se vincule a ti automáticamente.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/60">
                          <div className="bg-white p-2 rounded-xl w-28 h-28 flex-shrink-0 shadow-lg">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + "/login?coachCode=" + invitations[0].codigo_unico)}`} 
                              alt="QR Registro" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + "/login?coachCode=" + invitations[0].codigo_unico)}`);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `QR_Registro_Coach.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (e) {
                                modal.alert("Error al descargar el QR.");
                              }
                            }}
                            className="w-full sm:w-auto py-2.5 px-5 bg-zinc-800/80 hover:bg-blue-600 text-zinc-300 hover:text-white rounded-full transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2 border border-zinc-700/50 hover:border-transparent active:scale-95"
                          >
                            <Download size={14} /> Descargar QR
                          </button>
                        </div>
                      </div>

                      {/* QR Login */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-zinc-300">2. QR para Iniciar Sesión (Alumnos Activos)</span>
                        <p className="text-[11px] text-zinc-500">Para alumnos que ya tienen cuenta. Escanean este QR y entran directo.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/60">
                          <div className="bg-white p-2 rounded-xl w-28 h-28 flex-shrink-0 shadow-lg">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin)}`} 
                              alt="QR Login" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin)}`);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `QR_Login_Syncro.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (e) {
                                modal.alert("Error al descargar el QR.");
                              }
                            }}
                            className="w-full sm:w-auto py-2.5 px-5 bg-zinc-800/80 hover:bg-emerald-600 text-zinc-300 hover:text-white rounded-full transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2 border border-zinc-700/50 hover:border-transparent active:scale-95"
                          >
                            <Download size={14} /> Descargar QR
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-xs font-bold text-zinc-300">3. Link Mágico</span>
                      <p className="text-[11px] text-zinc-500">Envíalo por WhatsApp o redes sociales.</p>
                      <div className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
                        <p className="text-[10px] font-mono truncate text-zinc-400 pr-2">
                          {window.location.origin}/login?coachCode={invitations[0].codigo_unico.substring(0, 8)}...
                        </p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + "/login?coachCode=" + invitations[0].codigo_unico);
                            modal.alert("¡Enlace copiado al portapapeles!");
                          }}
                          className="text-zinc-500 hover:text-white transition-colors"
                          title="Copiar Enlace"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-xs font-bold text-zinc-300">4. Con tu Email</span>
                      <p className="text-[11px] text-zinc-500">El alumno se registra en {window.location.origin} y en el campo de vinculación escribe tu correo:</p>
                      <p className="text-xs font-mono font-bold text-blue-400 bg-blue-900/20 px-2 py-1.5 rounded text-center">
                        {profile?.usuario?.email}
                      </p>
                    </div>

                    {/* Códigos antiguos / Historial */}
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-2">Historial de Códigos UUID</h3>
                      <p className="text-[10px] text-zinc-500 mb-2">Tus códigos antiguos generados previamente, por si los necesitas.</p>
                      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                        {invitations.map(inv => (
                          <div key={inv.id_invitacion} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                            <p className="text-[10px] font-mono truncate text-zinc-400 pr-2">{inv.codigo_unico}</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(inv.codigo_unico);
                                modal.alert("¡Código copiado al portapapeles!");
                              }}
                              className="text-zinc-500 hover:text-white transition-colors"
                              title="Copiar Código UUID"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                </div>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 shadow-lg md:col-span-2 flex flex-col gap-6 order-1 md:order-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div 
                  className="flex items-center justify-between cursor-pointer sm:cursor-auto"
                  onClick={() => setIsStudentsOpen(!isStudentsOpen)}
                >
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    Mis Alumnos
                    <span className="text-sm font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">{students.length}</span>
                  </h2>
                  {isStudentsOpen ? <ChevronUp className="text-zinc-400 sm:hidden ml-2" /> : <ChevronDown className="text-zinc-400 sm:hidden ml-2" />}
                </div>
                {isStudentsOpen && (
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre, correo o etiqueta..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
                  />
                )}
              </div>
              
              {isStudentsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                {students.filter(alumno => {
                  const search = searchTerm.toLowerCase();
                  const nameEmailMatch = alumno.usuario.email.toLowerCase().includes(search);
                  const tagMatch = alumno.clasificacion && alumno.clasificacion.toLowerCase().includes(search);
                  return nameEmailMatch || tagMatch;
                }).length === 0 ? <p className="col-span-2 text-center text-zinc-500 text-sm">No se encontraron alumnos.</p> : students.filter(alumno => {
                  const search = searchTerm.toLowerCase();
                  const nameEmailMatch = alumno.usuario.email.toLowerCase().includes(search);
                  const tagMatch = alumno.clasificacion && alumno.clasificacion.toLowerCase().includes(search);
                  return nameEmailMatch || tagMatch;
                }).map(alumno => (
                  <div key={alumno.id_usuario} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${alumno.estado_activo ? 'bg-zinc-900/60 border-zinc-800/40' : 'bg-red-950/10 border-red-900/40 opacity-75'}`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-100">{alumno.usuario.email.split('@')[0]}</h3>
                        {!alumno.estado_activo && <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Suspendido</span>}
                      </div>
                      <p className="text-[10px] text-zinc-500">{alumno.usuario.email}</p>
                      
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                          Clasificación: 
                          <span className={alumno.clasificacion ? "text-amber-400 font-bold" : "text-zinc-600 italic"}>{alumno.clasificacion || "Sin asignar"}</span>
                          <button onClick={() => handleUpdateClasificacion(alumno.id_usuario)} className="text-zinc-500 hover:text-blue-400 ml-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        </p>
                        <p className="text-xs text-zinc-400 font-medium">Objetivo: <span className="text-blue-400">{alumno.objetivo || "No definido"}</span></p>
                        <p className="text-xs text-zinc-400 font-medium">Rutina: <span className={alumno.rutina_nombre ? "text-emerald-400" : "text-zinc-500"}>{alumno.rutina_nombre || "Ninguna asignada"}</span></p>
                        
                        {profile?.config_vencimiento_tipo === "fijo_por_alumno" && (
                          <p className="text-xs text-zinc-400 font-medium flex items-center gap-2 mt-1 border-t border-zinc-800 pt-1">
                            Día de pago: 
                            <span className="text-emerald-400 font-bold">
                              {alumno.fecha_vencimiento_pago ? new Date(alumno.fecha_vencimiento_pago).getDate() : "No asignado"}
                            </span>
                            <button onClick={() => handleUpdatePaymentDate(alumno.id_usuario)} className="text-zinc-500 hover:text-emerald-400 ml-auto" title="Editar día de pago">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      {alumno.estado_activo ? (
                        <>
                          <button onClick={() => setSelectedStudentId(alumno.id_usuario)} className="flex-1 py-2 px-3 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors border border-indigo-500/20">Progreso</button>
                          <button onClick={() => handleDeactivateStudent(alumno.id_usuario)} className="flex-1 py-2 px-3 rounded-lg text-xs bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-500/10 font-semibold transition-colors">Suspender</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleReactivateStudent(alumno.id_usuario)} className="flex-1 py-2 px-3 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors">Reactivar</button>
                          <button onClick={() => handleHardDeleteStudent(alumno.id_usuario)} className="flex-1 py-2 px-3 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">Eliminar Def.</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </section>
          )
        )}
        
        {activePanel === 'audits' && (
          <section className="glass-card rounded-2xl p-6 shadow-lg flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">⚠️ Red Flags (Auditoría)</h2>
              <p className="text-xs text-zinc-400 mt-1">Récords sospechosos o de nivel Élite que requieren tu validación manual.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {audits.length === 0 ? <p className="text-zinc-500 text-sm">No hay auditorías pendientes.</p> : audits.map(audit => (
                <div key={audit.id_log} className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row justify-between gap-4 items-center">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Alumno: <span className="text-blue-400">{audit.alumno_nombre}</span></h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Reclama <span className="text-emerald-400 font-bold">{audit.e1rm_logrado}kg</span> (e1RM) en <span className="text-white font-semibold">{audit.ejercicio_nombre}</span>.
                    </p>
                    <p className="text-xs text-amber-500/80 mt-1">Alcanza nivel: <span className="font-bold">{audit.nivel_alcanzado} {audit.subnivel_alcanzado}</span></p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button disabled={loadingAction === `audit-${audit.id_log}-aprobar`} onClick={() => handleResolveAudit(audit.id_log, 'aprobar')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50">
                      {loadingAction === `audit-${audit.id_log}-aprobar` ? 'Cargando...' : 'Aprobar'}
                    </button>
                    <button disabled={loadingAction === `audit-${audit.id_log}-rechazar`} onClick={() => handleResolveAudit(audit.id_log, 'rechazar')} className="flex-1 sm:flex-none px-4 py-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs rounded-lg transition-all border border-red-500/30 disabled:opacity-50">
                      {loadingAction === `audit-${audit.id_log}-rechazar` ? 'Cargando...' : 'Rechazar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-6">
              <h2 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-1">ðŸš¨ Alertas de Baja Asistencia</h2>
              <p className="text-xs text-zinc-400 mb-4">Alumnos que asistieron menos del 50% de su objetivo la semana pasada.</p>
              
              <div className="grid grid-cols-1 gap-4">
                {attendanceAlerts.length === 0 ? <p className="text-zinc-500 text-sm">No hay alertas de asistencia.</p> : attendanceAlerts.map(alert => {
                  const weekDate = new Date(alert.semana);
                  const dateStr = `${weekDate.getDate().toString().padStart(2, '0')}/${(weekDate.getMonth() + 1).toString().padStart(2, '0')}`;
                  
                  return (
                    <div key={alert.id_alumno} className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row justify-between gap-4 items-center">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-200">Alumno: <span className="text-blue-400">{alert.alumno_nombre}</span></h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Semana del {dateStr}: Asistió <span className="text-red-400 font-bold">{alert.asistencias}</span> vez/veces, pero su objetivo era <span className="text-white font-semibold">{alert.frecuencia_objetivo}</span>.
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => { setActivePanel('students'); setSelectedStudentId(alert.id_alumno); }} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg transition-all border border-zinc-700/50">
                          Ver Progreso
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        
        {activePanel === 'exercises' && (
          <section className="glass-card rounded-2xl p-6 shadow-lg flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Catálogo de Ejercicios</h2>
                <p className="text-xs text-zinc-400 mt-1">Ejercicios globales y tus ejercicios personalizados.</p>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/40 p-4 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Crear Ejercicio Personalizado</h3>
              <form onSubmit={handleCreateExercise} className="flex flex-col gap-3">
                <input type="text" name="nombre" placeholder="Nombre del Ejercicio (Ej. Remo Pendlay)" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200" />
                <select name="categoria" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 outline-none">
                  <option value="Pecho">Pecho</option>
                  <option value="Espalda">Espalda</option>
                  <option value="Piernas">Piernas</option>
                  <option value="Hombros">Hombros</option>
                  <option value="Brazos">Brazos</option>
                  <option value="Core">Core</option>
                  <option value="General">General</option>
                </select>
                <textarea name="descripcion" placeholder="Instrucciones breves..." required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 h-20 resize-none"></textarea>
                <input type="url" name="url_media" placeholder="URL de YouTube (Opcional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200" />
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-bold">Subir GIF Demostrativo (Opcional)</label>
                  <input type="file" name="gif_file" accept="image/gif" className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="es_con_peso" checked={esConPeso} onChange={(e) => setEsConPeso(e.target.checked)} className="w-4 h-4 text-emerald-600 bg-zinc-900 border-zinc-700 rounded focus:ring-emerald-500" />
                  <label htmlFor="es_con_peso" className="text-sm text-zinc-200">Ejercicio con peso libre/máquina</label>
                </div>
                
                {!esConPeso && (
                  <select name="tipo_banda" className="w-full bg-zinc-950 border border-emerald-800/50 rounded-lg px-4 py-2 text-sm text-emerald-100 outline-none mt-1">
                    <option value="ninguna">Sin banda (solo peso corporal)</option>
                    <option value="liviana">Requiere Banda Liviana</option>
                    <option value="media">Requiere Banda Media</option>
                    <option value="fuerte">Requiere Banda Fuerte</option>
                  </select>
                )}

                <button type="submit" disabled={loadingAction === 'create_exercise'} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-widest text-white transition-all disabled:opacity-50">
                  {loadingAction === 'create_exercise' ? 'Procesando...' : 'Añadir al Catálogo'}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
               {exercises.map(exe => (
                 <div key={exe.id_ejercicio} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/40 flex flex-col justify-between items-start relative overflow-hidden gap-3">
                   {exe.id_entrenador && (
                     <div className="absolute top-0 right-0 bg-emerald-600/20 text-emerald-500 text-[9px] font-black uppercase px-2 py-1 border-b border-l border-emerald-500/20 rounded-bl-lg">
                       Personalizado
                     </div>
                   )}
                   <div className="flex gap-4 w-full">
                      <div className="pr-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-zinc-200">{exe.nombre}</h3>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">{exe.categoria || 'General'}</span>
                          {exe.es_con_peso === false && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/20">
                              {exe.tipo_banda ? `BANDA ${exe.tipo_banda}` : 'SIN PESO'}
                            </span>
                          )}
                        </div>
                       <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{exe.descripcion}</p>
                     </div>
                   </div>
                   {!exe.id_entrenador ? (
                     <button onClick={() => handleOverrideMedia(exe.id_ejercicio)} className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg font-bold border border-zinc-700/50 transition-colors">
                       {exe.url_media ? 'Editar mi Video ðŸŽ¥' : 'Añadir mi Video ðŸŽ¥'}
                     </button>
                   ) : (
                     <div className="flex gap-2 w-full mt-2">
                       <button onClick={() => handleEditCustomExercise(exe)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-lg font-bold border border-zinc-700/50 transition-colors">
                         Editar
                       </button>
                       <button onClick={() => handleDeleteCustomExercise(exe.id_ejercicio)} className="flex-1 bg-red-900/40 hover:bg-red-800/60 text-red-300 text-xs py-2 rounded-lg font-bold border border-red-900/50 transition-colors">
                         Eliminar
                       </button>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </section>
        )}

        {activePanel === 'routines' && (
          <section className="glass-card rounded-2xl p-6 shadow-lg flex flex-col gap-6">
            <h2 className="text-lg font-bold text-zinc-100">Mis Rutinas Activas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {routines.map(rut => (
                 <div key={rut.id_rutina} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/40 flex flex-col gap-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="text-sm font-semibold text-zinc-200">{rut.nombre_rutina}</h3>
                       <p className="text-xs text-blue-400 mt-1 font-mono">v{rut.version_id}</p>
                     </div>
                     <div className="flex gap-2">
                       <button 
                         onClick={() => { setEditingRoutine(rut); setIsBuildingRoutine(true); }}
                         className="px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-xs"
                       >
                         Editar
                       </button>
                       <button 
                         onClick={async () => {
                           if (!(await modal.confirm(`¿Duplicar la rutina "${rut.nombre_rutina}"?`))) return;
                           try {
                             await api.post(`/api/v1/routines/${rut.id_rutina}/duplicate`);
                             await modal.alert("Rutina duplicada exitosamente.");
                             loadData();
                           } catch(e) { await modal.alert(e.message); }
                         }}
                         className="px-2 py-1 bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-800/60 transition-colors rounded text-xs font-medium"
                       >
                         Duplicar
                       </button>
                     </div>
                   </div>
                   
                   <div className="mt-2 border-t border-zinc-800/50 pt-3 relative">
                      <button 
                        onClick={() => {
                          if (assignMenuOpenId === rut.id_rutina) {
                            setAssignMenuOpenId(null);
                          } else {
                            setAssignMenuOpenId(rut.id_rutina);
                            setSelectedStudentsForAssign([]);
                          }
                        }}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded p-2 text-xs text-zinc-200 font-bold flex justify-between items-center transition-colors"
                      >
                        Asignar a Alumnos
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${assignMenuOpenId === rut.id_rutina ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {assignMenuOpenId === rut.id_rutina && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-10 flex flex-col overflow-hidden">
                          <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
                            {students.length === 0 ? <p className="text-xs text-zinc-500 p-2">No tienes alumnos.</p> : students.map(s => (
                              <label key={s.id_usuario} className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                                <input 
                                  type="checkbox"
                                  className="rounded bg-zinc-950 border-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                                  checked={selectedStudentsForAssign.includes(s.id_usuario)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentsForAssign([...selectedStudentsForAssign, s.id_usuario]);
                                    } else {
                                      setSelectedStudentsForAssign(selectedStudentsForAssign.filter(id => id !== s.id_usuario));
                                    }
                                  }}
                                />
                                <span className="text-xs text-zinc-300 truncate">{s.usuario.email}</span>
                              </label>
                            ))}
                          </div>
                          <div className="p-2 border-t border-zinc-800 bg-zinc-950/50">
                            <button
                              disabled={selectedStudentsForAssign.length === 0 || loadingAction === `assign-${rut.id_rutina}`}
                              onClick={async () => {
                                setLoadingAction(`assign-${rut.id_rutina}`);
                                try {
                                  await api.post(`/api/v1/routines/${rut.id_rutina}/assign-bulk`, { id_alumnos: selectedStudentsForAssign });
                                  await modal.alert("Rutina asignada exitosamente.");
                                  setAssignMenuOpenId(null);
                                } catch (err) {
                                  await modal.alert(err.message);
                                } finally {
                                  setLoadingAction(null);
                                }
                              }}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                            >
                              {loadingAction === `assign-${rut.id_rutina}` ? 'Procesando...' : `Confirmar (${selectedStudentsForAssign.length})`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               ))}
            </div>
          </section>
        )}

        {activePanel === 'finances' && (
          <FinancesPanel students={students} api={api} loadStudents={loadData} modal={modal} profile={profile} />
        )}

        {activePanel === 'tutorial' && (
          <TutorialPanel />
        )}

        {activePanel === 'profile' && (
          <section className="glass-card rounded-2xl p-6 shadow-lg max-w-xl mx-auto w-full flex flex-col gap-6">
            <h2 className="text-lg font-bold text-zinc-100">Mi Perfil Profesional</h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
               <div className="relative h-24 w-24 rounded-full border-2 border-blue-500 bg-zinc-950 overflow-hidden flex items-center justify-center shadow-lg shrink-0">
                 {profile.url_foto_perfil ? <img src={profile.url_foto_perfil} className="h-full w-full object-cover" /> : <span className="text-xs text-zinc-500 text-center">Sin Foto</span>}
               </div>
               <div className="flex flex-col gap-2 w-full">
                 <p className="text-xs text-zinc-400 font-semibold">Foto en Cloudflare R2</p>
                 <label className="cursor-pointer py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-center border border-zinc-700/60 block transition-colors">
                   Subir Nueva Foto
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={async (e) => {
                       const file = e.target.files[0];
                       if (!file) return;
                       if (file.size > 5 * 1024 * 1024) {
                         await modal.alert("El archivo es demasiado grande. Máximo 5MB.");
                         return;
                       }
                       const formData = new FormData();
                       formData.append('file', file);
                       try {
                         await api.post('/api/v1/coaches/profile/image', formData, {
                           headers: { 'Content-Type': 'multipart/form-data' }
                         });
                         await modal.alert("Foto subida exitosamente.");
                         loadData();
                       } catch (error) {
                         await modal.alert("Error al subir foto: " + error.message);
                       }
                     }} 
                   />
                 </label>
               </div>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const nombre = e.target.nombre.value.trim() || null;
                const especialidad = e.target.especialidad.value.trim() || null;
                const biografia = e.target.biografia.value.trim() || null;
                const aniosRaw = e.target.anios.value.trim();
                const anios_experiencia = aniosRaw ? parseInt(aniosRaw) : null;
                const tipo_cobro_alumnos = e.target.tipo_cobro.value || null;
                const precioRaw = e.target.precio_cobro.value.trim();
                const precio_cobro_alumnos = precioRaw ? parseFloat(precioRaw) : null;
                
                const config_estado_alumno_default = e.target.config_estado_alumno_default.value;
                const config_vencimiento_tipo = e.target.config_vencimiento_tipo.value;
                const configVencDiaRaw = e.target.config_vencimiento_dia.value.trim();
                const config_vencimiento_dia = configVencDiaRaw ? parseInt(configVencDiaRaw) : null;
                
                try {
                  await api.put('/api/v1/coaches/profile', { 
                    nombre, especialidad, biografia, anios_experiencia, 
                    tipo_cobro_alumnos, precio_cobro_alumnos,
                    config_estado_alumno_default, config_vencimiento_tipo, config_vencimiento_dia
                  });
                  await modal.alert("Perfil actualizado correctamente.");
                  loadData();
                } catch (error) {
                  await modal.alert("Error al actualizar perfil: " + error.message);
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-semibold">Nombre Completo</label>
                <input name="nombre" defaultValue={profile.nombre || ""} placeholder="Ej. Juan Pérez" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs text-zinc-400 font-semibold">Años de Experiencia</label>
                  <input name="anios" type="number" min="0" defaultValue={profile.anios_experiencia || ""} placeholder="Ej. 5" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs text-zinc-400 font-semibold">Especialidad</label>
                  <input name="especialidad" defaultValue={profile.especialidad || ""} placeholder="Ej. Hipertrofia y Fuerza" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              
              <div className="p-4 border border-zinc-800 bg-zinc-900/50 rounded-xl flex flex-col gap-4">
                 <h3 className="text-sm font-bold text-emerald-400">Configuración Financiera (Alumnos)</h3>
                 <p className="text-xs text-zinc-500">Define cómo cobras a tus alumnos para que el panel financiero calcule tus ingresos esperados.</p>
                 <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex flex-col gap-1 w-full">
                     <label className="text-xs text-zinc-400 font-semibold">Modelo de Cobro</label>
                     <select name="tipo_cobro" defaultValue={profile.tipo_cobro_alumnos || "por_alumno"} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
                       <option value="por_alumno">Mensualidad por Alumno</option>
                       <option value="fijo">Ingreso Fijo Global</option>
                     </select>
                   </div>
                   <div className="flex flex-col gap-1 w-full">
                     <label className="text-xs text-zinc-400 font-semibold">Tarifa ($)</label>
                     <input name="precio_cobro" type="number" step="0.01" min="0" defaultValue={profile.precio_cobro_alumnos || ""} placeholder="Ej. 1500" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
                   </div>
                 </div>
              </div>

              <div className="p-4 border border-zinc-800 bg-zinc-900/50 rounded-xl flex flex-col gap-4">
                 <h3 className="text-sm font-bold text-blue-400">Reglas Automáticas de Alumnos</h3>
                 <p className="text-xs text-zinc-500">Configura qué pasa cuando un alumno nuevo ingresa y cómo se calculan sus vencimientos.</p>
                 <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex flex-col gap-1 w-full">
                     <label className="text-xs text-zinc-400 font-semibold">Estado inicial por defecto</label>
                     <select 
                       name="config_estado_alumno_default" 
                       defaultValue={profile.config_estado_alumno_default || "activo"} 
                       className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                     >
                       <option value="activo">Activo (Puede usar la app al instante)</option>
                       <option value="suspendido">Suspendido (Debes activarlo manualmente)</option>
                     </select>
                   </div>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4 mt-2">
                   <div className="flex flex-col gap-1 w-full">
                     <label className="text-xs text-zinc-400 font-semibold">Cálculo de Vencimiento de Pago</label>
                     <select 
                       name="config_vencimiento_tipo" 
                       defaultValue={profile.config_vencimiento_tipo || "individual"} 
                       className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                     >
                       <option value="individual">Individual (30 días desde que paga o se registra)</option>
                       <option value="fijo">Fijo para todos (Un día específico del mes)</option>
                       <option value="fijo_por_alumno">
                         Día distinto por alumno
                       </option>
                     </select>
                   </div>
                   <div className="flex flex-col gap-1 w-full">
                     <label className="text-xs text-zinc-400 font-semibold">Día de vencimiento (si es fijo)</label>
                     <input 
                       name="config_vencimiento_dia" 
                       type="number" 
                       min="1" max="31" 
                       defaultValue={profile.config_vencimiento_dia || ""} 
                       placeholder="Ej. 10" 
                       className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" 
                     />
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-semibold">Biografía / Descripción</label>
                <textarea name="biografia" defaultValue={profile.biografia || ""} placeholder="Cuéntale a tus alumnos sobre ti..." className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white h-24 resize-none" />
              </div>
              <button type="submit" className="w-full py-3 mt-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-500/20">
                Guardar Cambios
              </button>
            </form>
          </section>
        )}
      </div>

      {isBuildingRoutine && (
        <WorkoutBuilder 
          initialData={editingRoutine}
          onClose={() => { setIsBuildingRoutine(false); setEditingRoutine(null); }} 
          onSaveSuccess={() => { setIsBuildingRoutine(false); setEditingRoutine(null); loadData(); }} 
        />
      )}
    </div>
  );
}

