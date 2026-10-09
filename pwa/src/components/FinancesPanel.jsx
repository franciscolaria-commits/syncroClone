import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, Ban, CheckCircle, MessageCircle, BarChart2, TrendingUp, Users, Dumbbell, Ticket } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function FinancesPanel({ students, api, loadStudents, modal, profile, gymConfig }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [filter, setFilter] = useState('todos'); // todos, pagados, pendientes, vencen_2_dias, vencen_hoy, vencidos
  const [chartMonths, setChartMonths] = useState(6);
  const [reloadModal, setReloadModal] = useState({ isOpen: false, studentId: null, defaultPkgId: null });

  const isGymMode = gymConfig?.tipo_cuenta === 'gimnasio';
  const gymTipoCobro = gymConfig?.gym_tipo_cobro || '';

  const monthYearString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const displayMonthYear = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadFinances();
  }, [currentDate]);

  const loadFinances = async () => {
    setLoading(true);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        api.get(`/api/v1/coaches/payments?anio_mes=${monthYearString}`),
        api.get(`/api/v1/coaches/finances/summary`)
      ]);
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleToggleSuspend = async (studentId, currentStatus) => {
    const action = currentStatus ? "suspender" : "restaurar";
    if (!(await modal.confirm(`¿Estás seguro de que deseas ${action} el acceso de este alumno?`))) return;
    
    let dia_vencimiento_personalizado = null;
    
    if (!currentStatus && profile?.config_vencimiento_tipo === "fijo_por_alumno") {
      const student = payments.find(p => p.id_alumno === studentId);
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
      await api.patch(`/api/v1/coaches/students/${studentId}/suspend`, { 
          estado_activo: !currentStatus,
          dia_vencimiento_personalizado
      });
      await loadStudents();
      await loadFinances();
      await modal.alert(`Acceso del alumno ${!currentStatus ? 'restaurado' : 'suspendido'} exitosamente.`);
    } catch (e) {
      await modal.alert("Error al actualizar el estado del alumno.");
    }
  };

  const handleUpdatePaymentDate = async (studentId) => {
    const diaStr = window.prompt("Ingresa el nuevo DÍA DEL MES (1-31) en que este alumno debe pagar siempre:");
    if (!diaStr) return;
    const dia = parseInt(diaStr);
    if (isNaN(dia) || dia < 1 || dia > 31) {
       await modal.alert("Día inválido. Debe ser un número entre 1 y 31.");
       return;
    }
    try {
      await api.patch(`/api/v1/coaches/students/${studentId}/payment_date`, { dia_vencimiento_personalizado: dia });
      await loadStudents();
      await loadFinances();
    } catch (error) {
      await modal.alert(`Error al actualizar el día de pago: ${error.message}`);
    }
  };

  const handleMarkPaid = async (studentId) => {
    const student = payments?.find(p => p.id_alumno === studentId);
    
    let expectedAmount = null;
    if (isGymMode && student) {
      if (student.tipo_membresia === 'pase_libre') {
        expectedAmount = gymConfig?.gym_monto_pase_libre || 0;
      } else if (student.tipo_membresia === 'por_clases') {
        const pkg = gymConfig?.gym_paquetes_clases?.find(pkg => pkg.id === student.gym_paquete_id);
        if (pkg) expectedAmount = pkg.precio || 0;
      }
    }

    const isPaid = await modal.confirm("¿Confirmas que el alumno ya realizó el pago?");
    if (!isPaid) return;
    
    let amount = null;
    if (isGymMode && expectedAmount !== null && expectedAmount > 0) {
      amount = expectedAmount;
    } else {
      const amountStr = window.prompt("Opcional: Ingresa el monto pagado (ej: 1500)", "");
      if (amountStr !== null && amountStr.trim() !== "") {
          amount = parseFloat(amountStr);
          if (isNaN(amount)) amount = null;
      }
    }

    try {
      await api.post(`/api/v1/coaches/payments`, {
        id_alumno: studentId,
        anio_mes: monthYearString,
        monto: amount,
        metodo_pago: null,
        notas: null
      });
      await loadFinances();
    } catch (e) {
      await modal.alert("Error al registrar el pago.");
    }
  };

  const handleReloadClasses = async (studentId, gym_paquete_id) => {
    if (isGymMode) {
      if (gymConfig?.gym_paquetes_clases?.length > 0) {
        const student = payments?.find(p => p.id_alumno === studentId);
        const pkgId = gym_paquete_id || student?.gym_paquete_id;
        setReloadModal({ isOpen: true, studentId, defaultPkgId: pkgId });
      } else {
        await modal.alert("Debes crear al menos un paquete de clases en la sección Perfil para poder asignar clases.");
      }
      return;
    }

    // Fallback logic for non-gym
    const student = payments?.find(p => p.id_alumno === studentId);
    let defaultClases = "8";
    const clasesStr = window.prompt("¿Cuántas clases deseas recargar?", defaultClases);
    if (!clasesStr) return;
    const clases = parseInt(clasesStr);
    if (isNaN(clases) || clases <= 0) {
      await modal.alert("Cantidad inválida.");
      return;
    }
    
    const registrarPago = await modal.confirm("¿Deseas registrar un pago por esta recarga de clases?");
    if (registrarPago) {
      const amountStr = window.prompt("Ingresa el monto cobrado (opcional):", "");
      let amount = null;
      if (amountStr !== null && amountStr.trim() !== "") {
          amount = parseFloat(amountStr);
          if (isNaN(amount)) amount = null;
      }
      try {
        await api.post(`/api/v1/coaches/payments`, {
          id_alumno: studentId,
          anio_mes: monthYearString,
          monto: amount,
          metodo_pago: null,
          notas: `Recarga de ${clases} clases`
        });
      } catch (e) {}
    }

    try {
      await api.post(`/api/v1/coaches/students/${studentId}/reload_classes`, { clases });
      await loadFinances();
      await modal.alert(`Se recargaron ${clases} clases exitosamente.`);
    } catch (e) {
      await modal.alert("Error al recargar clases.");
    }
  };

  const handleConfirmReloadPackage = async (pkgId) => {
    const studentId = reloadModal.studentId;
    const pkg = gymConfig.gym_paquetes_clases.find(p => p.id === pkgId);
    setReloadModal({ isOpen: false });

    if (!pkg) return;

    const registrarPago = await modal.confirm(`¿Deseas registrar un pago automático de $${pkg.precio} por este paquete de ${pkg.clases} clases?`);
    if (registrarPago) {
      try {
        await api.post(`/api/v1/coaches/payments`, {
          id_alumno: studentId,
          anio_mes: monthYearString,
          monto: pkg.precio,
          metodo_pago: null,
          notas: `Recarga: paquete de ${pkg.clases} clases`
        });
      } catch (e) {
        console.error(e);
      }
    }

    try {
      await api.post(`/api/v1/coaches/students/${studentId}/reload_classes`, { 
        clases: pkg.clases,
        gym_paquete_id: pkg.id
      });
      await loadFinances();
      await modal.alert(`El alumno ahora tiene ${pkg.clases} clases y su paquete fue actualizado.`);
    } catch (e) {
      await modal.alert("Error al asignar paquete.");
    }
  };

  const handleRevertPayment = async (pagoId) => {
    if (!(await modal.confirm("¿Estás seguro de anular este pago?"))) return;
    try {
      await api.delete(`/api/v1/coaches/payments/${pagoId}`);
      await loadFinances();
    } catch (e) {
      await modal.alert("Error al anular el pago.");
    }
  };

  const handleSendWhatsApp = async (student) => {
    if (!student.telefono_alumno) {
      await modal.alert("El alumno no ha registrado su número de WhatsApp en su perfil.");
      return;
    }
    const message = `Hola ${student.nombre_alumno}, te recuerdo que tu pago mensual de ${displayMonthYear} está pendiente. ¡Saludos!`;
    const encodedMessage = encodeURIComponent(message);
    const wurl = `https://wa.me/${student.telefono_alumno}?text=${encodedMessage}`;
    window.open(wurl, '_blank');
  };

  const safePayments = Array.isArray(payments) ? payments : [];
  
  const filteredPayments = safePayments.filter(p => {
    if (filter === 'pagados') return p.pagado;
    if (filter === 'pendientes') return !p.pagado;
    if (filter === 'vencen_2_dias') return !p.pagado && p.dias_para_vencer === 2;
    if (filter === 'vencen_hoy') return !p.pagado && p.dias_para_vencer === 0;
    if (filter === 'vencidos') return !p.pagado && p.dias_para_vencer !== null && p.dias_para_vencer < 0;
    if (filter === 'pase_libre') return p.tipo_membresia === 'pase_libre';
    if (filter === 'por_clases') return p.tipo_membresia === 'por_clases';
    if (filter.startsWith('pkg_')) {
      const pkgId = filter.split('_')[1];
      return p.tipo_membresia === 'por_clases' && p.gym_paquete_id === pkgId;
    }
    return true; // todos
  });

  // Gym mode KPIs
  const gymStudentsPaseLibre = safePayments.filter(p => p.tipo_membresia === 'pase_libre');
  const gymStudentsPorClases = safePayments.filter(p => p.tipo_membresia === 'por_clases');
  const gymStudentsSinClases = gymStudentsPorClases.filter(p => (p.clases_restantes || 0) <= 2);

  const chartData = summary ? [...summary.historial].reverse().slice(-chartMonths) : [];

  return (
    <div className="space-y-6">

      {/* === GYM MODE SUMMARY PANELS === */}
      {isGymMode && (gymTipoCobro === 'ambos' || gymTipoCobro === 'pase_libre' || gymTipoCobro === 'por_clases') && (
        <section className="glass-card rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-amber-400" /> Panel Modo Gimnasio
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

            {/* Pase Libre card */}
            {(gymTipoCobro === 'pase_libre' || gymTipoCobro === 'ambos') && (
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Ticket className="w-14 h-14 text-emerald-400" /></div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Pase Libre</p>
                <h3 className="text-3xl font-black text-white">{safePayments.filter(p => p.tipo_membresia === 'pase_libre').length}</h3>
                <p className="text-emerald-200/60 text-xs">alumnos activos</p>
                {gymConfig?.gym_monto_pase_libre && (
                  <p className="text-emerald-400 font-bold text-sm mt-1">
                    Esperado: ${(safePayments.filter(p => p.tipo_membresia === 'pase_libre').length * gymConfig.gym_monto_pase_libre).toLocaleString('es-AR')} / mes
                  </p>
                )}
              </div>
            )}

            {/* Por Clases cards (dinámicos) */}
            {(gymTipoCobro === 'por_clases' || gymTipoCobro === 'ambos') && gymConfig?.gym_paquetes_clases?.map(pkg => {
              const studentsInPkg = safePayments.filter(p => p.tipo_membresia === 'por_clases' && p.gym_paquete_id === pkg.id);
              const studentsSinClases = studentsInPkg.filter(p => (p.clases_restantes || 0) <= 2);
              return (
                <div key={pkg.id} className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Dumbbell className="w-14 h-14 text-amber-400" /></div>
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">{pkg.clases} Clases</p>
                  <h3 className="text-3xl font-black text-white">{studentsInPkg.length}</h3>
                  <p className="text-amber-200/60 text-xs">alumnos en este paquete</p>
                  <p className="text-amber-400 font-bold text-sm mt-1">
                    Esperado: ${(studentsInPkg.length * (pkg.precio || 0)).toLocaleString('es-AR')} / mes
                  </p>
                  {studentsSinClases.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded-lg w-fit">
                      <AlertCircle className="w-3 h-3" /> {studentsSinClases.length} por recargar
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total Alumnos Gym */}
            <div className="p-5 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-14 h-14 text-zinc-400" /></div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total Alumnos Gym</p>
              <h3 className="text-3xl font-black text-white">{safePayments.filter(p => p.tipo_membresia === 'pase_libre' || p.tipo_membresia === 'por_clases').length}</h3>
              <p className="text-zinc-500 text-xs">registrados en este gimnasio</p>
            </div>
          </div>
{/* Gym filter tabs */}
          {(gymTipoCobro === 'ambos' || gymTipoCobro === 'por_clases' || gymTipoCobro === 'pase_libre') && (
            <div className="flex gap-2 border-b border-zinc-800 pb-4 overflow-x-auto no-scrollbar">
              <button onClick={() => setFilter('todos')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${filter === 'todos' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                Todos
              </button>
              {(gymTipoCobro === 'pase_libre' || gymTipoCobro === 'ambos') && (
                <button onClick={() => setFilter('pase_libre')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${filter === 'pase_libre' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                  Pase Libre
                </button>
              )}
              {(gymTipoCobro === 'por_clases' || gymTipoCobro === 'ambos') && gymConfig?.gym_paquetes_clases?.map(pkg => (
                <button key={pkg.id} onClick={() => setFilter(`pkg_${pkg.id}`)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${filter === `pkg_${pkg.id}` ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                  {pkg.clases} Clases
                </button>
              ))}
            </div>
          )}
          </section>
      )}

      {/* KPIs */}
      {summary && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isGymMode ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign className="w-16 h-16 text-emerald-500"/></div>
             <p className="text-zinc-400 text-sm font-medium z-10">Ingresos del Mes</p>
             <h3 className="text-3xl font-black text-emerald-400 z-10">${summary.ingreso_real_mes}</h3>
          </div>
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20"><TrendingUp className="w-16 h-16 text-orange-500"/></div>
             <p className="text-zinc-400 text-sm font-medium z-10">Pendiente de Cobro</p>
             <h3 className="text-3xl font-black text-orange-400 z-10">${summary.deuda_pendiente !== null ? summary.deuda_pendiente : '---'}</h3>
             {summary.deuda_pendiente === null && <p className="text-xs text-zinc-500">Configura tu tarifa en Perfil</p>}
          </div>
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20"><CheckCircle className="w-16 h-16 text-emerald-500"/></div>
             <p className="text-zinc-400 text-sm font-medium z-10">Alumnos Pagados</p>
             <h3 className="text-3xl font-black text-zinc-100 z-10">{summary.alumnos_pagados}</h3>
          </div>
          {!isGymMode && (
            <div className="glass-card p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20"><Users className="w-16 h-16 text-zinc-500"/></div>
               <p className="text-zinc-400 text-sm font-medium z-10">Total Alumnos</p>
               <h3 className="text-3xl font-black text-zinc-100 z-10">{summary.cant_alumnos}</h3>
            </div>
          )}
        </div>
      )}

      {/* Gráfico */}
      {summary && summary.historial && summary.historial.length > 0 && (
        <section className="glass-card rounded-2xl p-6 shadow-lg flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-500" /> Historial de Ingresos
            </h2>
            <select 
              value={chartMonths} 
              onChange={(e) => setChartMonths(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:border-emerald-500 outline-none"
            >
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="mes" stroke="#71717a" tick={{fill: '#71717a', fontSize: 12}} />
                <YAxis stroke="#71717a" tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                  formatter={(value) => [`$${value}`, 'Ingresos']}
                />
                <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Tabla y Controles */}
      <section className="glass-card rounded-2xl p-6 shadow-lg flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handlePrevMonth} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-lg font-bold text-white capitalize min-w-[140px] text-center">
              {displayMonthYear}
            </div>
            <button onClick={handleNextMonth} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-6">Estado de Pagos del Mes</h2>
                
        {/* Tabs de Filtro */}
        {!isGymMode && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFilter('todos')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'todos' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Todos</button>
            <button onClick={() => setFilter('pagados')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pagados' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Pagados</button>
            <button onClick={() => setFilter('pendientes')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pendientes' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Pendientes</button>
            <button onClick={() => setFilter('vencen_2_dias')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'vencen_2_dias' ? 'bg-yellow-500/20 text-yellow-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Vencen en 2 días</button>
            <button onClick={() => setFilter('vencen_hoy')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'vencen_hoy' ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Vencen Hoy</button>
            <button onClick={() => setFilter('vencidos')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'vencidos' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>Vencidos</button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-zinc-500">Cargando pagos...</div>
        ) : (
          <div className="flex flex-col">
            {/* Cabecera (sólo desktop) */}
            <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-zinc-900/50 text-xs uppercase text-zinc-500 rounded-t-lg">
              <div>Alumno</div>
              <div>Estado</div>
              <div>Monto</div>
              <div className="text-right">Acciones</div>
            </div>
            
            <div className="flex flex-col gap-3 md:gap-0 md:divide-y md:divide-zinc-800 mt-2 md:mt-0">
              {filteredPayments.map(p => (
                <div key={p.id_alumno} className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 bg-zinc-900/40 md:bg-transparent hover:bg-zinc-800/50 rounded-xl md:rounded-none transition-colors items-start md:items-center border border-zinc-800/50 md:border-none">
                  {/* Alumno */}
                  <div className="flex flex-col gap-1 w-full">
                    <span className="font-medium text-zinc-100">{p.nombre_alumno}</span>
                        <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
                      {p.pagado ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Pagado
                        </span>
                      ) : (
                        <span className="text-red-400">Pendiente</span>
                      )}
                      
                      {!p.pagado && p.dias_para_vencer !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.dias_para_vencer < 0 ? 'bg-red-500/20 text-red-400' : 
                          p.dias_para_vencer === 0 ? 'bg-orange-500/20 text-orange-400' : 
                          p.dias_para_vencer <= 2 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {p.dias_para_vencer < 0 ? `Vencido hace ${Math.abs(p.dias_para_vencer)} días` : 
                           p.dias_para_vencer === 0 ? 'Vence hoy' : 
                           `Vence en ${p.dias_para_vencer} días`}
                        </span>
                      )}
                      
                      {p.bloqueado_por_pago && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 font-bold border border-red-500/50">
                          BLOQUEADO
                        </span>
                      )}

                      {/* Gym mode membership badge */}
                      {isGymMode && p.tipo_membresia && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          p.tipo_membresia === 'pase_libre' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {p.tipo_membresia === 'pase_libre' ? 'Pase Libre' : 'Por Clases'}
                        </span>
                      )}
                    </div>
                    
                    {/* Detalles Adicionales */}
                    <div className="flex flex-col gap-0.5 mt-1">
                      {p.tipo_membresia === 'por_clases' && (
                        <span className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1">
                          Clases Restantes: {p.clases_restantes || 0}
                          {(p.clases_restantes || 0) <= 2 && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full ml-1 text-[10px]">¡POCAS!</span>}
                        </span>
                      )}
                      {p.pagado && p.pago?.fecha_pago && (
                        <span className="text-xs text-zinc-500">
                          Pagó el {new Date(p.pago.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      )}
                      {profile?.config_vencimiento_tipo === "fijo_por_alumno" && p.fecha_vencimiento_pago && (
                        <span className="text-xs text-zinc-500">
                          Vence los días {new Date(p.fecha_vencimiento_pago).getUTCDate()} de cada mes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-between w-full md:w-auto">
                    <span className="text-zinc-500 text-xs uppercase md:hidden">Estado:</span>
                    {!p.estado_activo ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Suspendido
                       </span>
                    ) : p.pagado ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                         Pendiente
                      </span>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="flex items-center justify-between w-full md:w-auto">
                    <span className="text-zinc-500 text-xs uppercase md:hidden">Monto:</span>
                    <div className="font-medium text-emerald-400 flex items-center gap-2">
                      {p.pago?.monto ? `$${p.pago.monto}` : (p.pagado ? 'Sí' : '-')}
                      
                      {profile?.config_vencimiento_tipo === "fijo_por_alumno" && (
                        <button 
                          onClick={() => handleUpdatePaymentDate(p.id_alumno)} 
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-md transition-colors ml-2" 
                          title="Editar día de pago"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t border-zinc-800/50 md:border-none">
                    <button
                      onClick={() => handleSendWhatsApp(p)}
                      className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                      title="Enviar WhatsApp de recordatorio"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    {p.tipo_membresia === 'por_clases' && (
                      <button onClick={() => handleReloadClasses(p.id_alumno, p.gym_paquete_id)} className="px-3 py-2 text-sm bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg transition-colors font-medium" title="Recargar Clases">
                        + Clases
                      </button>
                    )}
                    {!p.pagado ? (
                      <button onClick={() => handleMarkPaid(p.id_alumno)} className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors" title="Marcar Pagado">
                        <DollarSign className="w-5 h-5" />
                      </button>
                    ) : (
                      <button onClick={() => handleRevertPayment(p.pago.id_pago)} className="px-3 py-2 text-sm bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors font-medium" title="Anular Pago">
                         Anular
                      </button>
                    )}
                    <button onClick={() => handleToggleSuspend(p.id_alumno, p.estado_activo)} className={`p-2 rounded-lg transition-colors ml-auto md:ml-0 ${p.estado_activo ? 'bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'}`} title={p.estado_activo ? "Suspender Alumno" : "Reactivar Alumno"}>
                      {p.estado_activo ? <Ban className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
              {filteredPayments.length === 0 && (
                <div className="p-8 text-center text-zinc-500 bg-zinc-900/20 rounded-xl">
                  No hay alumnos en esta categoría.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* MODAL DE SELECCIÓN DE PAQUETE (GYM MODE) */}
      {reloadModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 font-sans text-zinc-200">
           <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 flex flex-col gap-6 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div>
                <h3 className="text-xl font-bold text-white">Seleccionar Paquete</h3>
                <p className="text-sm text-zinc-400 mt-1">Elige el paquete que el alumno desea comprar o recargar.</p>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                {gymConfig?.gym_paquetes_clases?.map(pkg => (
                  <button 
                    key={pkg.id} 
                    onClick={() => handleConfirmReloadPackage(pkg.id)}
                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${pkg.id === reloadModal.defaultPkgId ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600'}`}
                  >
                    <div className="flex flex-col text-left">
                       <span className="font-bold text-amber-400">{pkg.clases} Clases</span>
                       <span className="text-xs text-zinc-400 mt-0.5">{pkg.id === reloadModal.defaultPkgId ? 'Paquete actual' : 'Cambiar a este paquete'}</span>
                    </div>
                    <span className="font-bold text-white text-lg">${pkg.precio}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-2">
                 <button onClick={() => setReloadModal({isOpen: false})} className="px-4 py-2 text-sm font-bold tracking-widest uppercase text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
