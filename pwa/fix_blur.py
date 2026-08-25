import sys

with open('src/views/SuperAdminPanel.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                              <input 
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
                              />'''

new_block = '''                              <input 
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
                              />'''

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("old_block not found")

with open('src/views/SuperAdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
