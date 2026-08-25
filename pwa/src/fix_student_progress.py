import sys

with open('views/StudentProgress.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "import { CartesianChart } from '../components/CartesianChart';"
new_import_line = import_line + "\nimport StudentEvaluations from './StudentEvaluations';"

insert_point = "      {/* MAIN LAYOUT */}"
new_insert_point = '''      {/* EVOLUCIONES */}
      {studentId && (
        <div className="lg:col-span-12 border border-zinc-800 bg-zinc-950 p-6 md:p-10 mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-4">EVALUACIONES Y PROGRESO</h2>
          <StudentEvaluations providedStudentId={studentId} />
        </div>
      )}

      {/* MAIN LAYOUT */}'''

if insert_point in content:
    content = content.replace(insert_point, new_insert_point)
if import_line in content:
    content = content.replace(import_line, new_import_line)

with open('views/StudentProgress.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
