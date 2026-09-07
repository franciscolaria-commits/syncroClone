import re

with open("pwa/src/views/SuperAdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'(\{coach\.en_periodo_prueba && \(\s*<div className="w-full mt-2 border-t border-gray-700 pt-2">.*?</div>\s*\)\})', re.DOTALL)

match = pattern.search(content)
if match:
    old_block = match.group(1)
    new_block = old_block.replace('{coach.en_periodo_prueba && (', '{coach.en_periodo_prueba ? (')
    new_block = new_block.replace(')}', """) : (
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
                            )}""")
    
    content = content.replace(old_block, new_block)
    with open("pwa/src/views/SuperAdminPanel.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated successfully")
else:
    print("Regex not matched!")
