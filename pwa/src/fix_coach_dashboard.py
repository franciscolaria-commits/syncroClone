import sys

with open('views/CoachDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "import { CartesianChart } from '../components/CartesianChart';"
# Let's see if we need new state
state_line = "const [stats, setStats] = useState(null);"
new_state_line = "const [stats, setStats] = useState(null);\n  const [pendingEvals, setPendingEvals] = useState([]);"

# Data fetch
fetch_call = "const statsRes = await api.get(\"/api/v1/coaches/me/stats\");"
new_fetch_call = '''const statsRes = await api.get("/api/v1/coaches/me/stats");
      try {
        const evalRes = await api.get("/api/v1/coaches/me/evaluations/pending");
        setPendingEvals(evalRes.data);
      } catch (err) {
        console.error("Error cargando evaluaciones pendientes");
      }'''

widget_insert_point = "{/* STATS WIDGETS */}"
new_widget_insert_point = '''{/* WIDGET EVALUACIONES PENDIENTES */}
            {pendingEvals.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
                <h3 className="text-red-500 font-bold mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> Alumnos Pendientes de Evaluación ({pendingEvals.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {pendingEvals.map(al => (
                    <div key={al.id_usuario} className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-red-500/20">
                      <span className="text-sm text-zinc-300 font-bold">{al.nombre}</span>
                      <div className="flex gap-4 items-center">
                        <span className="text-xs text-red-400">
                          {al.estado === 'vencido' ? (al.dias_restantes === -1 ? 'Nunca evaluado' : Vencido hace  días) : Vence en  días}
                        </span>
                        <button onClick={() => setSelectedStudent(students.find(s => s.id_usuario === al.id_usuario))} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition-colors font-bold uppercase">
                          Evaluar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* STATS WIDGETS */}'''

if state_line in content:
    content = content.replace(state_line, new_state_line)
if fetch_call in content:
    content = content.replace(fetch_call, new_fetch_call)
if widget_insert_point in content:
    content = content.replace(widget_insert_point, new_widget_insert_point)

with open('views/CoachDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
