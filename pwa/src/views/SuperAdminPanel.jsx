import React, { useState, useEffect } from "react";
import { api, logout } from "../services/api";
import { LogOut, Users, Settings, Activity, DollarSign, BarChart2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState('coaches');
  const [coaches, setCoaches] = useState([]);
  const [finances, setFinances] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCoachForPay, setSelectedCoachForPay] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("transferencia");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'coaches') {
        const data = await api.get("/api/v1/admin/coaches");
        setCoaches(data);
      } else {
        const data = await api.get("/api/v1/admin/finances");
        setFinances(data);
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes("Acceso denegado")) {
         alert("No eres SuperAdmin");
         window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCoach = async (coachId, updates) => {
    try {
      const updated = await api.put(`/api/v1/admin/coaches/${coachId}`, updates);
      setCoaches(coaches.map(c => c.id_usuario === coachId ? updated : c));
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  };

  const deleteCoach = async (coachId) => {
    if (!window.confirm("Â¿EstÃ¡s seguro de que deseas borrar (soft-delete) a este entrenador? Sus alumnos quedarÃ¡n inaccesibles.")) return;
    try {
      await api.delete(`/api/v1/admin/coaches/${coachId}`);
      setCoaches(coaches.filter(c => c.id_usuario !== coachId));
    } catch (err) {
      alert("Error al borrar: " + err.message);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!selectedCoachForPay || !payAmount) return;
    
    setSubmittingPay(true);
    try {
      await api.post(`/api/v1/admin/coaches/${selectedCoachForPay.id_usuario}/pagos`, {
        monto: parseFloat(payAmount),
        metodo_pago: payMethod,
        notas: payNotes
      });
      alert("Pago registrado exitosamente");
      setShowPayModal(false);
      fetchData(); // Refresh list to update badge
    } catch (err) {
      alert("Error al registrar pago: " + err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  const openPayModal = (coach) => {
    setSelectedCoachForPay(coach);
    setPayAmount(coach.deuda_estimada_mes.toString());
    setPayMethod("transferencia");
    setPayNotes("");
    setShowPayModal(true);
  };

  if (loading && coaches.length === 0 && !finances) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-10">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold text-white">Panel SuperAdmin</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
              <button 
                onClick={() => setActiveTab('coaches')}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'coaches' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center gap-2"><Users className="w-4 h-4"/> Entrenadores</div>
              </button>
              <button 
                onClick={() => setActiveTab('finances')}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'finances' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Finanzas</div>
              </button>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* TAB ENTRENADORES */}
        {activeTab === 'coaches' && (
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                GestiÃ³n de Entrenadores B2B
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-900/50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-4">Coach</th>
                    <th className="px-4 py-4 text-center">Modelo de Pago</th>
                    <th className="px-4 py-4 text-center">Estimado Mes</th>
                    <th className="px-4 py-4 text-center">Estado Financiero</th>
                    <th className="px-4 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {coaches.map(coach => (
                    <tr key={coach.id_usuario} className="hover:bg-gray-750">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{coach.email}</div>
                        <div className="text-xs text-gray-500 mb-1">{coach.nombre || "Sin nombre"} • {coach.total_alumnos}/{coach.limite_alumnos} Alumnos</div>
                        {(() => {
                           if (!coach.en_periodo_prueba) return null;
                           if (!coach.fecha_fin_prueba) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">Prueba Activa</div>;
                           
                           const diffTime = new Date(coach.fecha_fin_prueba) - new Date();
                           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                           
                           if (diffDays > 0) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">Prueba: Quedan {diffDays} días</div>;
                           if (diffDays === 0) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400">Prueba: Vence Hoy</div>;
                           return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">Prueba: Vencida ({Math.abs(diffDays)}d)</div>;
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 items-center">
                          <select
                            value={coach.modelo_pago}
                            onChange={(e) => updateCoach(coach.id_usuario, { modelo_pago: e.target.value })}
                            className="bg-gray-900 border border-gray-600 text-xs rounded block w-full p-1.5 focus:border-emerald-500"
                          >
                            <option value="por_alumno">Por Alumno</option>
                            <option value="fijo">Monto Fijo</option>
                          </select>
                          {coach.modelo_pago === 'fijo' && (
                            <input
                              type="number"
                              placeholder="$ Fijo"
                              defaultValue={coach.monto_fijo || ""}
                              onBlur={(e) => updateCoach(coach.id_usuario, { monto_fijo: parseFloat(e.target.value) || 0 })}
                              className="bg-gray-900 border border-gray-600 text-xs rounded block w-full p-1.5 text-center focus:border-emerald-500"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-emerald-400 font-bold text-lg">${coach.deuda_estimada_mes}</div>
                        {coach.pago_mes_registrado ? (
                          <div className="text-xs text-emerald-500 flex items-center justify-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/> Pagado</div>
                        ) : (
                          <div className="text-xs text-orange-400 flex items-center justify-center gap-1 mt-1"><XCircle className="w-3 h-3"/> Pendiente</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <select
                          value={coach.estado_financiero}
                          onChange={(e) => updateCoach(coach.id_usuario, { estado_financiero: e.target.value })}
                          className={`bg-gray-900 border text-xs rounded block w-full p-1.5 mb-2 ${
                            coach.estado_financiero === "activo" 
                              ? "border-emerald-500/30 text-emerald-400" 
                              : "border-red-500/30 text-red-400"
                          }`}
                        >
                          <option value="activo">Activo</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                        <div className="flex flex-col gap-1 items-start bg-gray-900/50 p-2 rounded border border-gray-700">
                          <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer w-full text-left">
                            <input 
                              type="checkbox" 
                              checked={coach.en_periodo_prueba || false}
                              onChange={(e) => updateCoach(coach.id_usuario, { en_periodo_prueba: e.target.checked })}
                              className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
                            />
                            Periodo Prueba
                          </label>
                          {coach.en_periodo_prueba && (
                            <div className="w-full mt-2 border-t border-gray-700 pt-2">
                              <label className="text-[10px] text-gray-400 block mb-1">Finaliza el (opcional):</label>
                              <input 
                                type="date"
                                defaultValue={coach.fecha_fin_prueba ? coach.fecha_fin_prueba.split("T")[0] : ""}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (val !== undefined) {
                                      try {
                                          updateCoach(coach.id_usuario, { fecha_fin_prueba: val ? new Date(val).toISOString() : null });
                                      } catch (err) {}
                                  }
                                }}
                                className="w-full bg-gray-800 border border-gray-600 text-[11px] rounded p-1.5 text-gray-300 focus:border-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                           <button 
                             onClick={() => openPayModal(coach)}
                             disabled={coach.pago_mes_registrado}
                             className={`p-2 rounded-lg transition-colors ${coach.pago_mes_registrado ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'}`}
                             title="Registrar Pago"
                           >
                             <DollarSign className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteCoach(coach.id_usuario)}
                             className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40 transition-colors"
                             title="Borrar Entrenador"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {coaches.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No hay entrenadores registrados o activos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB FINANZAS */}
        {activeTab === 'finances' && finances && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Entrenadores Activos</div>
                <div className="text-3xl font-black text-white">{finances.kpis.total_entrenadores}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="text-gray-400 text-sm font-medium mb-1">Alumnos Globales</div>
                <div className="text-3xl font-black text-emerald-400">{finances.kpis.total_alumnos_plataforma}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                <div className="text-gray-400 text-sm font-medium mb-1">Recaudado (Mes)</div>
                <div className="text-3xl font-black text-emerald-400">${finances.kpis.ingreso_real_mes.toLocaleString()}</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                <div className="text-gray-400 text-sm font-medium mb-1">Pendiente de Cobro</div>
                <div className="text-3xl font-black text-orange-400">${finances.kpis.deuda_pendiente.toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
              <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-500" />
                Historial de Ingresos Mensuales
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finances.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="mes" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
                    <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                      itemStyle={{ color: '#34D399', fontWeight: 'bold' }}
                      formatter={(value) => [`$${value}`, 'Ingresos']}
                    />
                    <Bar dataKey="ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {finances.chart_data.length === 0 && (
                <div className="text-center text-gray-500 mt-4">No hay datos histÃ³ricos suficientes.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Registrar Pago */}
      {showPayModal && selectedCoachForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Registrar Pago Mensual
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-400">Entrenador:</p>
                <p className="text-base font-semibold text-white">{selectedCoachForPay.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg">
                  Deuda Estimada: ${selectedCoachForPay.deuda_estimada_mes}
                </div>
              </div>
              
              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Monto Pagado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">MÃ©todo de Pago</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cripto">Cripto (USDT)</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Notas Adicionales (Opcional)</label>
                  <textarea
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    rows="2"
                    placeholder="Comprobante #12345..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  ></textarea>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {submittingPay ? "Registrando..." : "Confirmar Pago"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


