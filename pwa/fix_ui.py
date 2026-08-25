import sys
with open('src/views/SuperAdminPanel.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{coach.email}</div>
                        <div className="text-xs text-gray-500">{coach.nombre || "Sin nombre"} • {coach.total_alumnos}/{coach.limite_alumnos} Alumnos</div>
                      </td>'''

new1 = '''                      <td className="px-4 py-4">
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
                      </td>'''

if old1 in content:
    content = content.replace(old1, new1)
else:
    print("old1 not found")

old2 = '''                      <td className="px-4 py-4 text-center">
                        <select
                          value={coach.estado_financiero}
                          onChange={(e) => updateCoach(coach.id_usuario, { estado_financiero: e.target.value })}
                          className={g-gray-900 border text-xs rounded block w-full p-1.5 }
                        >
                          <option value="activo">Activo</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                      </td>'''

new2 = '''                      <td className="px-4 py-4 text-center">
                        <select
                          value={coach.estado_financiero}
                          onChange={(e) => updateCoach(coach.id_usuario, { estado_financiero: e.target.value })}
                          className={g-gray-900 border text-xs rounded block w-full p-1.5 mb-2 }
                        >
                          <option value="activo">Activo</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                        <div className="flex flex-col gap-1 items-start bg-gray-900/50 p-2 rounded border border-gray-700">
                          <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={coach.en_periodo_prueba || false}
                              onChange={(e) => updateCoach(coach.id_usuario, { en_periodo_prueba: e.target.checked })}
                              className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
                            />
                            Periodo Prueba
                          </label>
                          {coach.en_periodo_prueba && (
                            <input 
                              type="date"
                              value={coach.fecha_fin_prueba ? coach.fecha_fin_prueba.split('T')[0] : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCoach(coach.id_usuario, { fecha_fin_prueba: val ? new Date(val).toISOString() : null });
                              }}
                              className="mt-1 w-full bg-gray-800 border border-gray-600 text-[10px] rounded p-1 text-gray-300 focus:border-emerald-500"
                            />
                          )}
                        </div>
                      </td>'''

if old2 in content:
    content = content.replace(old2, new2)
else:
    print("old2 not found")

with open('src/views/SuperAdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
