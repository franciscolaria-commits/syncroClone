import sys
import codecs
import re

filepath = 'src/views/StudentEvaluations.jsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# 1. Add state for selected record
content = content.replace(
    "const [uploading, setUploading] = useState(false);",
    "const [uploading, setUploading] = useState(false);\n  const [selectedRecord, setSelectedRecord] = useState(null);"
)

# 2. Add onClick to tr for physical
content = content.replace(
    '<tr key={ev.id_evaluacion} className="hover:bg-zinc-900 border-b border-zinc-800">',
    '<tr key={ev.id_evaluacion} className="hover:bg-zinc-900 border-b border-zinc-800 cursor-pointer" onClick={() => setSelectedRecord({type: \'fisico\', data: ev})}>'
)

# 3. Add onClick to tr for body
content = content.replace(
    '<tr key={ev.id_composicion} className="hover:bg-zinc-900 border-b border-zinc-800">',
    '<tr key={ev.id_composicion} className="hover:bg-zinc-900 border-b border-zinc-800 cursor-pointer" onClick={() => setSelectedRecord({type: \'cuerpo\', data: ev})}>'
)

# 4. Make sure delete button click doesn't trigger row click
content = content.replace(
    '<button onClick={() => deleteItem(ev.id_evaluacion)}>',
    '<button onClick={(e) => { e.stopPropagation(); deleteItem(ev.id_evaluacion); }}>'
)
content = content.replace(
    '<button onClick={() => deleteItem(ev.id_composicion)}>',
    '<button onClick={(e) => { e.stopPropagation(); deleteItem(ev.id_composicion); }}>'
)

# 5. Add Modal component at the end of the return statement
modal_code = """
      {/* MODAL DE DETALLES */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setSelectedRecord(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><x size={24} /></button>
            <h3 className="font-bold text-xl text-emerald-400 mb-4 uppercase tracking-wider border-b border-zinc-800 pb-2">
              {selectedRecord.type === 'fisico' ? 'Detalles Evaluación Física' : 'Detalles Composición Corporal'}
            </h3>
            
            <div className="text-sm text-zinc-300 mb-6">
              <span className="font-bold text-white">Fecha:</span> {new Date(selectedRecord.data.fecha).toLocaleDateString()}
            </div>

            {selectedRecord.type === 'fisico' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Fuerza 1RM</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Sentadilla:</span> {selectedRecord.data.rm_sentadilla || '-'} kg</li>
                    <li><span className="text-zinc-400">Banco:</span> {selectedRecord.data.rm_banco || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso Muerto:</span> {selectedRecord.data.rm_peso_muerto || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Fuerza 3RM</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Sentadilla:</span> {selectedRecord.data.rm3_sentadilla || '-'} kg</li>
                    <li><span className="text-zinc-400">Banco:</span> {selectedRecord.data.rm3_banco || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso Muerto:</span> {selectedRecord.data.rm3_peso_muerto || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Cargas</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Peso en RIR3:</span> {selectedRecord.data.peso_rir3 || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso en RIR5:</span> {selectedRecord.data.peso_rir5 || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Saltos</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">SJ:</span> {selectedRecord.data.sj_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">CMJ:</span> {selectedRecord.data.cmj_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Abalakov:</span> {selectedRecord.data.abalakov_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Potencia CMJ:</span> {selectedRecord.data.cmj_potencia_w || '-'} W</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Resistencia / Otros</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Flexibilidad:</span> {selectedRecord.data.flexibilidad_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Push-ups 45s:</span> {selectedRecord.data.push_ups_45s || '-'}</li>
                    <li><span className="text-zinc-400">Sit-ups 45s:</span> {selectedRecord.data.sit_ups_45s || '-'}</li>
                    <li><span className="text-zinc-400">Test Cooper:</span> {selectedRecord.data.cooper_m || '-'} m</li>
                    <li><span className="text-zinc-400">Plancha:</span> {selectedRecord.data.plancha_s || '-'} s</li>
                    <li><span className="text-zinc-400">Dominadas:</span> {selectedRecord.data.dominadas_reps || '-'}</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedRecord.type === 'cuerpo' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Índices Generales</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Peso:</span> {selectedRecord.data.peso || '-'} kg</li>
                    <li><span className="text-zinc-400">% Grasa:</span> {selectedRecord.data.porcentaje_grasa || '-'} %</li>
                    <li><span className="text-zinc-400">% Músculo:</span> {selectedRecord.data.porcentaje_musculo || '-'} %</li>
                    <li><span className="text-zinc-400">% Agua:</span> {selectedRecord.data.porcentaje_agua || '-'} %</li>
                    <li><span className="text-zinc-400">Masa Ósea:</span> {selectedRecord.data.masa_osea || '-'} kg</li>
                    <li><span className="text-zinc-400">BMI:</span> {selectedRecord.data.bmi || '-'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Perímetros (cm)</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Pecho:</span> {selectedRecord.data.perimetro_pecho || '-'}</li>
                    <li><span className="text-zinc-400">Cintura:</span> {selectedRecord.data.perimetro_cintura || '-'}</li>
                    <li><span className="text-zinc-400">Cadera:</span> {selectedRecord.data.perimetro_cadera || '-'}</li>
                    <li><span className="text-zinc-400">Brazo Izquierdo:</span> {selectedRecord.data.perimetro_brazo_i || '-'}</li>
                    <li><span className="text-zinc-400">Brazo Derecho:</span> {selectedRecord.data.perimetro_brazo_d || '-'}</li>
                    <li><span className="text-zinc-400">Pierna Izquierda:</span> {selectedRecord.data.perimetro_pierna_i || '-'}</li>
                    <li><span className="text-zinc-400">Pierna Derecha:</span> {selectedRecord.data.perimetro_pierna_d || '-'}</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-zinc-800 text-right">
              <button onClick={() => setSelectedRecord(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded font-bold uppercase tracking-widest text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace(
    "</div>\n  );\n};",
    modal_code + "\n    </div>\n  );\n};"
)

# We also need an icon <X> for the modal close button, let's make sure it exists or just use an 'X' text
# Wait, I used <x size={24} /> which should be <X size={24} /> from lucide-react. Let's fix that.
content = content.replace("<x size={24} />", "<X size={24} />")

if "X," not in content and "{ X" not in content and " X " not in content:
    content = content.replace("import { Camera, Activity, FileText, Upload, Plus, Trash2, CheckCircle2 } from 'lucide-react';", "import { Camera, Activity, FileText, Upload, Plus, Trash2, CheckCircle2, X } from 'lucide-react';")


with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Added detail modal")
