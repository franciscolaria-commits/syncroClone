import sys

with open('views/StudentProgress.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for config
state_line = "const [chartData, setChartData] = useState([]);"
new_state_line = "const [chartData, setChartData] = useState([]);\n  const [evalFreq, setEvalFreq] = useState('');"

fetch_line = "setChartData(res.data.history || []);"
new_fetch_line = "setChartData(res.data.history || []);\n        setEvalFreq(res.data.frecuencia_evaluacion_dias || '');"

# Insert UI in EVOLUCIONES
evals_block = '''      {/* EVOLUCIONES */}
      {studentId && (
        <div className="lg:col-span-12 border border-zinc-800 bg-zinc-950 p-6 md:p-10 mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-4">EVALUACIONES Y PROGRESO</h2>
          <StudentEvaluations providedStudentId={studentId} />
        </div>
      )}'''

new_evals_block = '''      {/* EVOLUCIONES */}
      {studentId && (
        <div className="lg:col-span-12 border border-zinc-800 bg-zinc-950 p-6 md:p-10 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">EVALUACIONES Y PROGRESO</h2>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <label className="text-xs text-zinc-400 font-bold uppercase">Evaluar cada (días):</label>
              <input 
                type="number" 
                value={evalFreq} 
                onChange={(e) => setEvalFreq(e.target.value)}
                onBlur={async () => {
                  try {
                    await api.put(/api/v1/students//evaluations/config, {
                      frecuencia_evaluacion_dias: evalFreq ? parseInt(evalFreq) : null
                    });
                  } catch(e) {}
                }}
                className="bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs w-20 outline-none focus:border-emerald-500" 
                placeholder="Ej. 30"
              />
            </div>
          </div>
          <StudentEvaluations providedStudentId={studentId} />
        </div>
      )}'''

if state_line in content:
    content = content.replace(state_line, new_state_line)
if fetch_line in content:
    content = content.replace(fetch_line, new_fetch_line)
if evals_block in content:
    content = content.replace(evals_block, new_evals_block)

with open('views/StudentProgress.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
