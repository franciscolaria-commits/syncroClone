import sys

with open('src/views/SuperAdminPanel.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                          {coach.en_periodo_prueba && (
                            <input 
                              type="date"
                              value={coach.fecha_fin_prueba ? coach.fecha_fin_prueba.split("T")[0] : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCoach(coach.id_usuario, { fecha_fin_prueba: val ? new Date(val).toISOString() : null });
                              }}
                              className="w-full bg-gray-800 border border-gray-600 text-[10px] rounded p-1 text-gray-300 focus:border-emerald-500 mt-1"
                            />
                          )}'''

new_block = '''                          {coach.en_periodo_prueba && (
                            <div className="w-full mt-2 border-t border-gray-700 pt-2">
                              <label className="text-[10px] text-gray-400 block mb-1">Finaliza el (opcional):</label>
                              <input 
                                type="date"
                                value={coach.fecha_fin_prueba ? coach.fecha_fin_prueba.split("T")[0] : ""}
                                onChange={(e) => {
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

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("old_block not found")

with open('src/views/SuperAdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
