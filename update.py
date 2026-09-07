with open("pwa/src/views/SuperAdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """                            {coach.en_periodo_prueba && (
                              <div className="w-full mt-2 border-t border-gray-700 pt-2">
                                <label className="text-[10px] text-gray-300 block mb-1 font-medium">Días de prueba restantes:</label>
                                <input 
                                  type="number"
                                  min="0"
                                  placeholder="Ej: 14"
                                  defaultValue={(() => {
                                    if (!coach.fecha_fin_prueba) return "";
                                    const diff = Math.ceil((new Date(coach.fecha_fin_prueba) - new Date()) / (1000 * 60 * 60 * 24));
                                    return diff > 0 ? diff : 0;
                                  })()}
                                  onBlur={(e) => {
                                    const days = parseInt(e.target.value);
                                    if (!isNaN(days)) {
                                      const date = new Date();
                                      date.setDate(date.getDate() + days);
                                      updateCoach(coach.id_usuario, { fecha_fin_prueba: date.toISOString() });
                                    } else if (e.target.value === "") {
                                      updateCoach(coach.id_usuario, { fecha_fin_prueba: null });
                                    }
                                  }}
                                  className="w-full bg-gray-800 border border-gray-600 text-[11px] rounded p-1.5 text-white focus:border-emerald-500"
                                />
                                <p className="text-[9px] text-gray-500 mt-1 leading-tight">Ingresá el número de días. La fecha exacta de corte se calculará sola.</p>
                              </div>
                            )}"""

new_block = """                            {coach.en_periodo_prueba ? (
                              <div className="w-full mt-2 border-t border-gray-700 pt-2">
                                <label className="text-[10px] text-gray-300 block mb-1 font-medium">Días de prueba restantes:</label>
                                <input 
                                  type="number"
                                  min="0"
                                  placeholder="Ej: 14"
                                  defaultValue={(() => {
                                    if (!coach.fecha_fin_prueba) return "";
                                    const diff = Math.ceil((new Date(coach.fecha_fin_prueba) - new Date()) / (1000 * 60 * 60 * 24));
                                    return diff > 0 ? diff : 0;
                                  })()}
                                  onBlur={(e) => {
                                    const days = parseInt(e.target.value);
                                    if (!isNaN(days)) {
                                      const date = new Date();
                                      date.setDate(date.getDate() + days);
                                      updateCoach(coach.id_usuario, { fecha_fin_prueba: date.toISOString() });
                                    } else if (e.target.value === "") {
                                      updateCoach(coach.id_usuario, { fecha_fin_prueba: null });
                                    }
                                  }}
                                  className="w-full bg-gray-800 border border-gray-600 text-[11px] rounded p-1.5 text-white focus:border-emerald-500"
                                />
                                <p className="text-[9px] text-gray-500 mt-1 leading-tight">Ingresá el número de días. La fecha exacta de corte se calculará sola.</p>
                              </div>
                            ) : (
                              <div className="w-full mt-2 border-t border-gray-700 pt-2">
                                <label className="text-[10px] text-gray-300 block mb-1 font-medium">Fecha de pago (Vencimiento):</label>
                                <input 
                                  type="date"
                                  defaultValue={coach.fecha_vencimiento ? coach.fecha_vencimiento.split('T')[0] : ''}
                                  onBlur={(e) => {
                                    if (e.target.value) {
                                      updateCoach(coach.id_usuario, { fecha_vencimiento: new Date(e.target.value).toISOString() });
                                    } else {
                                      updateCoach(coach.id_usuario, { fecha_vencimiento: null });
                                    }
                                  }}
                                  className="w-full bg-gray-800 border border-gray-600 text-[11px] rounded p-1.5 text-white focus:border-emerald-500"
                                />
                                <div className={`mt-2 text-[10px] flex items-center gap-1 font-medium ${coach.pago_mes_registrado ? 'text-emerald-400' : 'text-orange-400'}`}>
                                  {coach.pago_mes_registrado ? '✅ Mes Pagado' : '⚠️ Mes Pendiente'}
                                </div>
                              </div>
                            )}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("pwa/src/views/SuperAdminPanel.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated SuperAdminPanel.jsx")
else:
    print("Block not found!")
