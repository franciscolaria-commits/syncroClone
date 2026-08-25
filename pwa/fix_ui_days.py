import sys

with open('src/views/SuperAdminPanel.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                          {coach.en_periodo_prueba && (
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
                          )}'''

new_block = '''                          {coach.en_periodo_prueba && (
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
                          )}'''

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("old_block not found")

with open('src/views/SuperAdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
