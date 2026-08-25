import sys

with open('src/views/SuperAdminPanel.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if '<div className="font-medium text-white">{coach.email}</div>' in line:
        pass # We will replace the next line instead
    if '<div className="text-xs text-gray-500">{coach.nombre || "Sin nombre"} • {coach.total_alumnos}/{coach.limite_alumnos} Alumnos</div>' in line:
        new_lines[-1] = line.replace('className="text-xs text-gray-500"', 'className="text-xs text-gray-500 mb-1"')
        badge_code = '''                        {(() => {
                           if (!coach.en_periodo_prueba) return null;
                           if (!coach.fecha_fin_prueba) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">Prueba Activa</div>;
                           
                           const diffTime = new Date(coach.fecha_fin_prueba) - new Date();
                           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                           
                           if (diffDays > 0) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">Prueba: Quedan {diffDays} días</div>;
                           if (diffDays === 0) return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400">Prueba: Vence Hoy</div>;
                           return <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">Prueba: Vencida ({Math.abs(diffDays)}d)</div>;
                        })()}
'''
        new_lines.append(badge_code)

    if '<option value="suspendido">Suspendido</option>' in line:
        pass
    if '</select>' in line and i > 200 and i < 210:
        # Check if it's the right select
        if 'value="suspendido"' in lines[i-1]:
            controls_code = '''                        <div className="flex flex-col gap-1 items-start bg-gray-900/50 p-2 rounded border border-gray-700 mt-2">
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
                            <input 
                              type="date"
                              value={coach.fecha_fin_prueba ? coach.fecha_fin_prueba.split('T')[0] : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCoach(coach.id_usuario, { fecha_fin_prueba: val ? new Date(val).toISOString() : null });
                              }}
                              className="w-full bg-gray-800 border border-gray-600 text-[10px] rounded p-1 text-gray-300 focus:border-emerald-500"
                            />
                          )}
                        </div>
'''
            new_lines.append(controls_code)

with open('src/views/SuperAdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
