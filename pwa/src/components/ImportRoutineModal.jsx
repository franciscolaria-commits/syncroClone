import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { parseFile, detectColumns, normalizeData } from '../utils/fileParser.js';

// ============================================================
// ICONS
// ============================================================
const IconUpload = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const IconX = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconWarn = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

const FIELD_LABELS = {
  ejercicio: { label: 'Ejercicio', color: 'emerald' },
  dia: { label: 'Dia', color: 'blue' },
  series: { label: 'Series', color: 'violet' },
  reps: { label: 'Reps', color: 'amber' },
  peso: { label: 'Peso (kg)', color: 'orange' },
  rir: { label: 'RIR/RPE', color: 'rose' },
};

const colorMap = {
  emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  violet: 'bg-violet-500/20 border-violet-500/50 text-violet-400',
  amber: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  rose: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
};

// ============================================================
// STEP INDICATOR
// ============================================================
function StepIndicator({ step }) {
  const steps = ['Seleccion', 'Analisis', 'Preview', 'Resultado'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors
            ${step === i + 1 ? 'bg-emerald-500 border-emerald-500 text-black' :
              step > i + 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
              'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
          >
            {step > i + 1 ? <IconCheck /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px ${step > i + 1 ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// MAIN MODAL
// ============================================================
export default function ImportRoutineModal({ onClose, students }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [routineName, setRoutineName] = useState('');
  const [asignarAlumno, setAsignarAlumno] = useState(true);
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState(3);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [editableDias, setEditableDias] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ---- Mutacion de importacion ----
  const importMutation = useMutation({
    mutationFn: (payload) => api.post('/api/v1/coaches/import_routine', payload),
    onSuccess: (data) => {
      setImportResult(data);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['coachStudents'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
    onError: (err) => {
      setImportResult({ error: err.message });
      setStep(4);
    }
  });

  // ---- Drag & Drop ----
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setParseError(''); }
  };

  // ---- Parseo del archivo ----
  const handleAnalyze = useCallback(async () => {
    if (!file || !selectedStudentId) return;
    setIsParsing(true);
    setParseError('');
    try {
      const result = await parseFile(file);
      setParseResult(result);
      // Inicializar editableDias como copia profunda del resultado
      setEditableDias(JSON.parse(JSON.stringify(result.normalizedData.dias)));
      // Auto nombre de rutina
      if (!routineName) {
        setRoutineName(`Rutina importada - ${file.name.replace(/\.[^/.]+$/, '')}`);
      }
      setStep(3);
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  }, [file, selectedStudentId, routineName]);

  // ---- Edicion de preview ----
  const updateEjercicioField = (diaIdx, exIdx, field, value) => {
    setEditableDias(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[diaIdx].ejercicios[exIdx][field] = value;
      return next;
    });
  };

  const removeEjercicio = (diaIdx, exIdx) => {
    setEditableDias(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[diaIdx].ejercicios.splice(exIdx, 1);
      if (next[diaIdx].ejercicios.length === 0) next.splice(diaIdx, 1);
      return next;
    });
  };

  // ---- Confirmar importacion ----
  const handleConfirm = () => {
    const payload = {
      id_alumno: selectedStudentId,
      nombre_rutina: routineName || 'Rutina Importada',
      frecuencia_semanal: frecuenciaSemanal,
      asignar_al_alumno: asignarAlumno,
      dias: editableDias.map(dia => ({
        nombre_dia: dia.nombre_dia,
        ejercicios: dia.ejercicios.map(ex => ({
          nombre_ejercicio: ex.nombre_ejercicio,
          series: parseInt(ex.series) || 3,
          reps_objetivo: String(ex.reps_objetivo || '10'),
          peso_sugerido: parseFloat(ex.peso_sugerido) || 0,
          rir: ex.rir !== null && ex.rir !== '' ? parseInt(ex.rir) : null,
          historial: ex.historial || []
        }))
      })).filter(d => d.ejercicios.length > 0)
    };
    importMutation.mutate(payload);
  };

  // ============================================================
  // RENDER STEPS
  // ============================================================

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          1. Selecciona el alumno
        </label>
        <select
          value={selectedStudentId}
          onChange={e => setSelectedStudentId(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl outline-none font-medium focus:border-emerald-500 transition-colors"
        >
          <option value="">-- Seleccionar alumno --</option>
          {(students || []).map(s => (
            <option key={s.id_usuario} value={s.id_usuario}>
              {s.usuario?.email || s.id_usuario}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
          2. Sube el archivo de la rutina
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
            ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'}`}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx,.doc,.pdf" className="hidden"
            onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setParseError(''); } }} />
          <IconUpload />
          {file ? (
            <>
              <p className="text-emerald-400 font-bold text-sm">{file.name}</p>
              <p className="text-zinc-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <p className="text-zinc-400 font-medium text-sm">Arrastra el archivo aqui o haz click para seleccionar</p>
              <p className="text-zinc-600 text-xs">Formatos: Excel (.xlsx), CSV, Word (.docx), PDF</p>
            </>
          )}
        </div>
        {parseError && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
            <IconWarn />
            <p className="text-red-400 text-xs">{parseError}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={!selectedStudentId || !file}
        className="w-full bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition-colors uppercase tracking-widest text-sm"
      >
        Continuar
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Archivo seleccionado</p>
        <p className="text-white font-bold">{file?.name}</p>
      </div>
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300">
        El sistema analizara los encabezados de tu archivo y detectara automaticamente columnas de ejercicios, 
        series, repeticiones, peso y dias. Si algo no se detecta correctamente, podras corregirlo en el siguiente paso.
      </div>
      {isParsing && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Analizando archivo...</p>
        </div>
      )}
      {parseError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
          <IconWarn />
          <div>
            <p className="text-red-400 text-sm font-bold mb-1">Error al analizar el archivo</p>
            <p className="text-red-300 text-xs">{parseError}</p>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm">
          Atras
        </button>
        <button onClick={handleAnalyze} disabled={isParsing}
          className="flex-1 bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
          {isParsing ? 'Analizando...' : 'Analizar Archivo'}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (!parseResult) return null;
    const { columnMap, fileType, totalRows } = parseResult;
    const detectedFields = Object.values(columnMap);
    const totalEjercicios = editableDias.reduce((acc, d) => acc + d.ejercicios.length, 0);
    const totalSetsHistorial = editableDias.reduce((acc, d) => acc + d.ejercicios.reduce((a, e) => a + (e.historial?.length || 0), 0), 0);

    return (
      <div className="space-y-5">
        {/* Deteccion de columnas */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">
            Columnas detectadas en {fileType} ({totalRows} filas procesadas)
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FIELD_LABELS).map(([field, { label, color }]) => {
              const detected = detectedFields.includes(field);
              return (
                <span key={field} className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1 ${detected ? colorMap[color] : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                  {detected ? <IconCheck /> : <IconX />} {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Dias', value: editableDias.length },
            { label: 'Ejercicios', value: totalEjercicios },
            { label: 'Sets historial', value: totalSetsHistorial }
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Config rutina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Nombre de la rutina</label>
            <input value={routineName} onChange={e => setRoutineName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none font-medium focus:border-emerald-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Frecuencia semanal</label>
            <select value={frecuenciaSemanal} onChange={e => setFrecuenciaSemanal(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none font-medium focus:border-emerald-500 text-sm">
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} dias/semana</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-10 h-6 rounded-full transition-colors ${asignarAlumno ? 'bg-emerald-500' : 'bg-zinc-700'} relative`}
            onClick={() => setAsignarAlumno(!asignarAlumno)}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${asignarAlumno ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-zinc-300 font-medium">Asignar rutina al alumno inmediatamente</span>
        </label>

        {/* Preview editable por dias */}
        <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
          {editableDias.map((dia, diaIdx) => (
            <div key={diaIdx} className="border border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between">
                <input value={dia.nombre_dia}
                  onChange={e => setEditableDias(prev => { const n = JSON.parse(JSON.stringify(prev)); n[diaIdx].nombre_dia = e.target.value; return n; })}
                  className="bg-transparent text-white font-bold text-sm uppercase tracking-widest outline-none" />
                <span className="text-xs text-zinc-500">{dia.ejercicios.length} ejercicios</span>
              </div>
              <div className="divide-y divide-zinc-900">
                {dia.ejercicios.map((ex, exIdx) => (
                  <div key={exIdx} className="px-4 py-2 flex items-center gap-3 bg-zinc-900/50 flex-wrap">
                    <input value={ex.nombre_ejercicio}
                      onChange={e => updateEjercicioField(diaIdx, exIdx, 'nombre_ejercicio', e.target.value)}
                      className="flex-1 min-w-32 bg-zinc-950 border border-zinc-800 text-white p-1.5 rounded-lg text-sm outline-none focus:border-emerald-500" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={ex.series}
                        onChange={e => updateEjercicioField(diaIdx, exIdx, 'series', e.target.value)}
                        className="w-12 bg-zinc-950 border border-zinc-800 text-white p-1.5 rounded-lg text-sm outline-none text-center" title="Series" />
                      <span className="text-zinc-600 text-xs">x</span>
                      <input value={ex.reps_objetivo}
                        onChange={e => updateEjercicioField(diaIdx, exIdx, 'reps_objetivo', e.target.value)}
                        className="w-14 bg-zinc-950 border border-zinc-800 text-white p-1.5 rounded-lg text-sm outline-none text-center" title="Reps" />
                      <span className="text-zinc-600 text-xs">@</span>
                      <input type="number" value={ex.peso_sugerido}
                        onChange={e => updateEjercicioField(diaIdx, exIdx, 'peso_sugerido', e.target.value)}
                        className="w-14 bg-zinc-950 border border-zinc-800 text-white p-1.5 rounded-lg text-sm outline-none text-center" title="Peso kg" />
                      <span className="text-zinc-600 text-xs">kg</span>
                    </div>
                    <span className="text-xs text-zinc-600">{ex.historial?.length || 0} sets hist.</span>
                    <button onClick={() => removeEjercicio(diaIdx, exIdx)}
                      className="text-red-500 hover:text-red-400 transition-colors ml-auto">
                      <IconX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(2)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm">
            Atras
          </button>
          <button onClick={handleConfirm}
            disabled={editableDias.length === 0 || importMutation.isPending}
            className="flex-1 bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
            {importMutation.isPending ? 'Importando...' : 'Confirmar Importacion'}
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="flex flex-col items-center gap-6 py-4">
      {importResult?.error ? (
        <>
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
            <IconX />
          </div>
          <h3 className="text-xl font-black text-white">Error en la importacion</h3>
          <p className="text-red-400 text-sm text-center">{importResult.error}</p>
          <button onClick={() => setStep(3)} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl text-sm">
            Volver a intentar
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
            <IconCheck />
          </div>
          <h3 className="text-xl font-black text-white">Importacion exitosa!</h3>
          <div className="w-full grid grid-cols-2 gap-3">
            {[
              { label: 'Rutina creada', value: importResult?.nombre_rutina },
              { label: 'Dias', value: importResult?.dias_creados },
              { label: 'Ejercicios nuevos', value: importResult?.ejercicios_creados?.length },
              { label: 'Ejercicios reutilizados', value: importResult?.ejercicios_reutilizados?.length },
              { label: 'Sesiones de historial', value: importResult?.sesiones_historial_creadas },
              { label: 'Asignada al alumno', value: importResult?.asignada_al_alumno ? 'Si' : 'No' }
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
                <p className="text-white font-bold text-sm mt-0.5">{value ?? '-'}</p>
              </div>
            ))}
          </div>
          {importResult?.ejercicios_creados?.length > 0 && (
            <div className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Ejercicios creados nuevos</p>
              <div className="flex flex-wrap gap-1">
                {importResult.ejercicios_creados.map(n => (
                  <span key={n} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl uppercase tracking-widest text-sm">
            Cerrar
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Importar Rutina</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Desde Excel, CSV, Word o PDF</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-xl">
            <IconX />
          </button>
        </div>
        <div className="p-6">
          <StepIndicator step={step} />
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
