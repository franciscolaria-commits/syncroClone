import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import { parseFile, normalizeData, detectColumns } from '../utils/fileParser.js';
import { detectStudentBlocksFromWorkbook, matchStudentsToBlocks } from '../utils/multiStudentParser.js';

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
const IconChevron = ({ dir }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dir === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
  </svg>
);
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
  blue:    'bg-blue-500/20 border-blue-500/50 text-blue-400',
  violet:  'bg-violet-500/20 border-violet-500/50 text-violet-400',
  amber:   'bg-amber-500/20 border-amber-500/50 text-amber-400',
  orange:  'bg-orange-500/20 border-orange-500/50 text-orange-400',
  rose:    'bg-rose-500/20 border-rose-500/50 text-rose-400',
};

// -------------------------------------------------------
// STEP INDICATOR
// -------------------------------------------------------
function StepIndicator({ step, steps }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors
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

// -------------------------------------------------------
// SCORE BADGE
// -------------------------------------------------------
function ScoreBadge({ score }) {
  const color = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';
  const label = score >= 70 ? 'Alta confianza' : score >= 40 ? 'Baja confianza' : 'Sin match';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
      ${color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' :
        color === 'amber'   ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' :
                              'bg-red-500/15 border-red-500/40 text-red-400'}`}>
      {score}% — {label}
    </span>
  );
}

// ============================================================
// MAIN MODAL
// ============================================================
export default function ImportRoutineModal({ onClose, students }) {
  const queryClient = useQueryClient();

  // MODE: 'single' | 'multi'
  const [mode, setMode] = useState('single');

  // ---- Estado compartido ----
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef(null);

  // ---- Estado modo SINGLE (flujo original) ----
  const [singleStep, setSingleStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [routineName, setRoutineName] = useState('');
  const [asignarAlumno, setAsignarAlumno] = useState(true);
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState(3);
  const [parseResult, setParseResult] = useState(null);
  const [editableDias, setEditableDias] = useState([]);
  const [importResult, setImportResult] = useState(null);

  // ---- Estado modo MULTI ----
  const [multiStep, setMultiStep] = useState(1);
  const [matchResults, setMatchResults] = useState([]); // [{block, bestMatch, candidates, needsManual}]
  const [wizardIdx, setWizardIdx] = useState(0);        // índice del alumno actual en el wizard
  const [wizardData, setWizardData] = useState([]);      // configuración por alumno [{studentId, routineName, asignar, frecuencia, skipped, editableDias}]
  const [multiResults, setMultiResults] = useState([]);  // resultados finales por alumno
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: (payload) => api.post('/api/v1/coaches/import_routine', payload),
  });

  // -------------------------------------------------------
  // DRAG & DROP
  // -------------------------------------------------------
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setParseError(''); }
  };

  // -------------------------------------------------------
  // UPLOAD ZONE (compartida)
  // -------------------------------------------------------
  const UploadZone = () => (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
        ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'}`}
    >
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.docx,.doc,.pdf" className="hidden"
        onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setParseError(''); } }} />
      <IconUpload />
      {file ? (
        <><p className="text-emerald-400 font-bold text-sm">{file.name}</p>
          <p className="text-zinc-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p></>
      ) : (
        <><p className="text-zinc-400 font-medium text-sm">Arrastra el archivo aqui o haz click para seleccionar</p>
          <p className="text-zinc-600 text-xs">Formatos: Excel (.xlsx), CSV, Word (.docx), PDF</p></>
      )}
    </div>
  );

  // ============================================================
  // MODO SINGLE — Flujo original
  // ============================================================

  const handleSingleAnalyze = useCallback(async () => {
    if (!file || !selectedStudentId) return;
    setIsParsing(true); setParseError('');
    try {
      const result = await parseFile(file);
      setParseResult(result);
      setEditableDias(JSON.parse(JSON.stringify(result.normalizedData.dias)));
      if (!routineName) setRoutineName(`Rutina importada - ${file.name.replace(/\.[^/.]+$/, '')}`);
      setSingleStep(3);
    } catch (err) { setParseError(err.message); }
    finally { setIsParsing(false); }
  }, [file, selectedStudentId, routineName]);

  const updateSingleEjercicio = (diaIdx, exIdx, field, value) => {
    setEditableDias(prev => { const n = JSON.parse(JSON.stringify(prev)); n[diaIdx].ejercicios[exIdx][field] = value; return n; });
  };
  const removeSingleEjercicio = (diaIdx, exIdx) => {
    setEditableDias(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      n[diaIdx].ejercicios.splice(exIdx, 1);
      if (n[diaIdx].ejercicios.length === 0) n.splice(diaIdx, 1);
      return n;
    });
  };

  const handleSingleConfirm = async () => {
    const payload = {
      id_alumno: selectedStudentId, nombre_rutina: routineName || 'Rutina Importada',
      frecuencia_semanal: frecuenciaSemanal, asignar_al_alumno: asignarAlumno,
      dias: editableDias.map(d => ({
        nombre_dia: d.nombre_dia,
        ejercicios: d.ejercicios.map(ex => ({
          nombre_ejercicio: ex.nombre_ejercicio, series: parseInt(ex.series) || 3,
          reps_objetivo: String(ex.reps_objetivo || '10'), peso_sugerido: parseFloat(ex.peso_sugerido) || 0,
          rir: ex.rir !== null && ex.rir !== '' ? parseInt(ex.rir) : null, historial: ex.historial || []
        }))
      })).filter(d => d.ejercicios.length > 0)
    };
    try {
      const data = await importMutation.mutateAsync(payload);
      setImportResult(data);
      setSingleStep(4);
      queryClient.invalidateQueries({ queryKey: ['coachStudents'] });
    } catch (err) { setImportResult({ error: err.message }); setSingleStep(4); }
  };

  // ============================================================
  // MODO MULTI — Parseo y detección de alumnos
  // ============================================================

  const handleMultiAnalyze = useCallback(async () => {
    if (!file) return;
    setIsParsing(true); setParseError('');
    try {
      const name = file.name.toLowerCase();
      let workbook = null;
      let blocks = [];

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'array' });
        workbook._xlsxLib = XLSX;
        blocks = detectStudentBlocksFromWorkbook(workbook);
      } else {
        // Para CSV/Word/PDF: parsear como antes y tratar como bloque único o detectar por separadores
        const { parseFile: pf } = await import('../utils/fileParser.js');
        const result = await pf(file);
        // Intentar detectar separadores en las rows
        const { headers, rows } = result;
        blocks = detectBlocksFromFlatRows(headers, rows);
      }

      if (blocks.length === 0) throw new Error('No se pudieron detectar datos en el archivo.');

      const matched = matchStudentsToBlocks(blocks, students);

      // Inicializar wizardData por cada bloque
      const initial = matched.map((mr, i) => ({
        blockIdx: i,
        studentId: mr.bestMatch?.id_usuario ?? '',
        routineName: `Rutina - ${mr.block.studentName || file.name.replace(/\.[^/.]+$/, '')}`,
        asignar: true,
        frecuencia: 3,
        skipped: false,
        editableDias: JSON.parse(JSON.stringify(
          normalizeData(mr.block.headers, mr.block.rows, detectColumns(mr.block.headers)).dias
        )),
      }));

      setMatchResults(matched);
      setWizardData(initial);
      setWizardIdx(0);
      setMultiStep(3);
    } catch (err) { setParseError(err.message); }
    finally { setIsParsing(false); }
  }, [file, students]);

  // Detección de bloques en filas planas (CSV/Word/PDF)
  function detectBlocksFromFlatRows(headers, rows) {
    const blocks = [];
    let currentName = null;
    let currentRows = [];
    for (const row of rows) {
      const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmpty.length === 1) {
        if (currentName && currentRows.length > 0) {
          blocks.push({ studentName: currentName, headers, rows: currentRows, detectionMethod: 'block' });
        }
        currentName = String(nonEmpty[0]).replace(/^[-=*\s]+|[-=*\s]+$/g, '').trim();
        currentRows = [];
      } else if (currentName) {
        currentRows.push(row);
      }
    }
    if (currentName && currentRows.length > 0) {
      blocks.push({ studentName: currentName, headers, rows: currentRows, detectionMethod: 'block' });
    }
    if (blocks.length === 0) {
      blocks.push({ studentName: '', headers, rows, detectionMethod: 'single' });
    }
    return blocks;
  }

  // -------------------------------------------------------
  // WIZARD: actualizar datos del alumno actual
  // -------------------------------------------------------
  const updateWizard = (field, value) => {
    setWizardData(prev => {
      const next = [...prev];
      next[wizardIdx] = { ...next[wizardIdx], [field]: value };
      return next;
    });
  };

  const updateWizardEjercicio = (diaIdx, exIdx, field, value) => {
    setWizardData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[wizardIdx].editableDias[diaIdx].ejercicios[exIdx][field] = value;
      return next;
    });
  };

  // -------------------------------------------------------
  // IMPORTAR TODOS (modo multi)
  // -------------------------------------------------------
  const handleMultiConfirm = async () => {
    setIsImporting(true);
    const results = [];
    for (const wd of wizardData) {
      if (wd.skipped || !wd.studentId) {
        results.push({ studentName: matchResults[wd.blockIdx]?.block?.studentName || '?', skipped: true, noStudent: !wd.studentId });
        continue;
      }
      try {
        const payload = {
          id_alumno: wd.studentId,
          nombre_rutina: wd.routineName || 'Rutina Importada',
          frecuencia_semanal: wd.frecuencia,
          asignar_al_alumno: wd.asignar,
          dias: wd.editableDias.map(d => ({
            nombre_dia: d.nombre_dia,
            ejercicios: d.ejercicios.map(ex => ({
              nombre_ejercicio: ex.nombre_ejercicio, series: parseInt(ex.series) || 3,
              reps_objetivo: String(ex.reps_objetivo || '10'), peso_sugerido: parseFloat(ex.peso_sugerido) || 0,
              rir: ex.rir !== null && ex.rir !== '' ? parseInt(ex.rir) : null, historial: ex.historial || []
            }))
          })).filter(d => d.ejercicios.length > 0)
        };
        const data = await api.post('/api/v1/coaches/import_routine', payload);
        results.push({ studentName: matchResults[wd.blockIdx]?.block?.studentName, success: true, data });
      } catch (err) {
        results.push({ studentName: matchResults[wd.blockIdx]?.block?.studentName, error: err.message });
      }
    }
    setMultiResults(results);
    setMultiStep(5);
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['coachStudents'] });
  };

  // ============================================================
  // RENDER — MODO SINGLE
  // ============================================================
  const renderSingleStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">1. Selecciona el alumno</label>
        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl outline-none font-medium focus:border-emerald-500 transition-colors">
          <option value="">-- Seleccionar alumno --</option>
          {(students || []).map(s => (
            <option key={s.id_usuario} value={s.id_usuario}>{s.usuario?.email || s.email || s.id_usuario}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">2. Sube el archivo</label>
        <UploadZone />
        {parseError && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2"><IconWarn /><p className="text-red-400 text-xs">{parseError}</p></div>}
      </div>
      <button onClick={() => setSingleStep(2)} disabled={!selectedStudentId || !file}
        className="w-full bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl uppercase tracking-widest text-sm">
        Continuar
      </button>
    </div>
  );

  const renderSingleStep2 = () => (
    <div className="space-y-5">
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Archivo</p>
        <p className="text-white font-bold">{file?.name}</p>
      </div>
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300">
        El sistema analizara los encabezados y detectara columnas automáticamente.
      </div>
      {isParsing && <div className="flex flex-col items-center gap-3 py-4"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/><p className="text-zinc-400 text-xs uppercase tracking-widest">Analizando...</p></div>}
      {parseError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2"><IconWarn /><p className="text-red-400 text-xs">{parseError}</p></div>}
      <div className="flex gap-3">
        <button onClick={() => setSingleStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm">Atras</button>
        <button onClick={handleSingleAnalyze} disabled={isParsing}
          className="flex-1 bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
          {isParsing ? 'Analizando...' : 'Analizar Archivo'}
        </button>
      </div>
    </div>
  );

  const renderSingleStep3 = () => {
    if (!parseResult) return null;
    const { columnMap, fileType, totalRows } = parseResult;
    const detectedFields = Object.values(columnMap);
    const totalEjercicios = editableDias.reduce((a, d) => a + d.ejercicios.length, 0);
    const totalHist = editableDias.reduce((a, d) => a + d.ejercicios.reduce((b, e) => b + (e.historial?.length || 0), 0), 0);
    return (
      <div className="space-y-4">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Columnas detectadas en {fileType} ({totalRows} filas)</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FIELD_LABELS).map(([f, { label, color }]) => {
              const detected = detectedFields.includes(f);
              return <span key={f} className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${detected ? colorMap[color] : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>{detected ? <IconCheck /> : <IconX />} {label}</span>;
            })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['Dias', editableDias.length], ['Ejercicios', totalEjercicios], ['Sets hist.', totalHist]].map(([l, v]) => (
            <div key={l} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-xl font-black text-white">{v}</p><p className="text-[10px] text-zinc-500 uppercase tracking-widest">{l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Nombre de la rutina</label>
            <input value={routineName} onChange={e => setRoutineName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none text-sm focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Frecuencia semanal</label>
            <select value={frecuenciaSemanal} onChange={e => setFrecuenciaSemanal(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none text-sm focus:border-emerald-500">
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} dias/semana</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-9 h-5 rounded-full transition-colors ${asignarAlumno ? 'bg-emerald-500' : 'bg-zinc-700'} relative`} onClick={() => setAsignarAlumno(!asignarAlumno)}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${asignarAlumno ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-zinc-300">Asignar rutina al alumno</span>
        </label>
        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
          {editableDias.map((dia, diaIdx) => (
            <div key={diaIdx} className="border border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-zinc-800 px-3 py-1.5 flex items-center justify-between">
                <input value={dia.nombre_dia} onChange={e => { const n = JSON.parse(JSON.stringify(editableDias)); n[diaIdx].nombre_dia = e.target.value; setEditableDias(n); }}
                  className="bg-transparent text-white font-bold text-xs uppercase tracking-widest outline-none" />
                <span className="text-[10px] text-zinc-500">{dia.ejercicios.length} ej.</span>
              </div>
              {dia.ejercicios.map((ex, exIdx) => (
                <div key={exIdx} className="px-3 py-1.5 flex items-center gap-2 bg-zinc-900/50 flex-wrap border-t border-zinc-900">
                  <input value={ex.nombre_ejercicio} onChange={e => updateSingleEjercicio(diaIdx, exIdx, 'nombre_ejercicio', e.target.value)}
                    className="flex-1 min-w-28 bg-zinc-950 border border-zinc-800 text-white p-1.5 rounded-lg text-xs outline-none focus:border-emerald-500" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={ex.series} onChange={e => updateSingleEjercicio(diaIdx, exIdx, 'series', e.target.value)}
                      className="w-10 bg-zinc-950 border border-zinc-800 text-white p-1 rounded-lg text-xs outline-none text-center" title="Series" />
                    <span className="text-zinc-600 text-[10px]">x</span>
                    <input value={ex.reps_objetivo} onChange={e => updateSingleEjercicio(diaIdx, exIdx, 'reps_objetivo', e.target.value)}
                      className="w-12 bg-zinc-950 border border-zinc-800 text-white p-1 rounded-lg text-xs outline-none text-center" title="Reps" />
                    <span className="text-zinc-600 text-[10px]">@</span>
                    <input type="number" value={ex.peso_sugerido} onChange={e => updateSingleEjercicio(diaIdx, exIdx, 'peso_sugerido', e.target.value)}
                      className="w-12 bg-zinc-950 border border-zinc-800 text-white p-1 rounded-lg text-xs outline-none text-center" title="Peso" />
                    <span className="text-zinc-600 text-[10px]">kg</span>
                  </div>
                  <button onClick={() => removeSingleEjercicio(diaIdx, exIdx)} className="text-red-500 hover:text-red-400"><IconX /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSingleStep(2)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm">Atras</button>
          <button onClick={handleSingleConfirm} disabled={editableDias.length === 0 || importMutation.isPending}
            className="flex-1 bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
            {importMutation.isPending ? 'Importando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    );
  };

  const renderSingleStep4 = () => (
    <div className="flex flex-col items-center gap-5 py-4">
      {importResult?.error ? (
        <><div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center"><IconX /></div>
          <h3 className="text-lg font-black text-white">Error en la importacion</h3>
          <p className="text-red-400 text-sm text-center">{importResult.error}</p>
          <button onClick={() => setSingleStep(3)} className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl text-sm">Volver</button></>
      ) : (
        <><div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center"><IconCheck /></div>
          <h3 className="text-lg font-black text-white">Importacion exitosa!</h3>
          <div className="w-full grid grid-cols-2 gap-2">
            {[['Rutina', importResult?.nombre_rutina], ['Dias', importResult?.dias_creados],
              ['Ej. nuevos', importResult?.ejercicios_creados?.length], ['Ej. reutilizados', importResult?.ejercicios_reutilizados?.length],
              ['Sesiones hist.', importResult?.sesiones_historial_creadas], ['Asignada', importResult?.asignada_al_alumno ? 'Si' : 'No']
            ].map(([l, v]) => (
              <div key={l} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{l}</p>
                <p className="text-white font-bold text-sm mt-0.5">{v ?? '-'}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl uppercase tracking-widest text-sm">Cerrar</button></>
      )}
    </div>
  );

  // ============================================================
  // RENDER — MODO MULTI
  // ============================================================
  const renderMultiStep1 = () => (
    <div className="space-y-5">
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-300 flex gap-3">
        <IconUsers />
        <span>El sistema detectara automaticamente los alumnos del archivo (por nombre de hoja, columna o bloques de filas).</span>
      </div>
      <UploadZone />
      {parseError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2"><IconWarn /><p className="text-red-400 text-xs">{parseError}</p></div>}
      <button onClick={() => setMultiStep(2)} disabled={!file}
        className="w-full bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-amber-400 text-black font-bold py-3 rounded-xl uppercase tracking-widest text-sm">
        Continuar
      </button>
    </div>
  );

  const renderMultiStep2 = () => (
    <div className="space-y-5">
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Archivo</p>
        <p className="text-white font-bold">{file?.name}</p>
      </div>
      {isParsing && <div className="flex flex-col items-center gap-3 py-6"><div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/><p className="text-zinc-400 text-xs uppercase tracking-widest">Detectando alumnos...</p></div>}
      {parseError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2"><IconWarn /><div><p className="text-red-400 text-sm font-bold mb-1">Error</p><p className="text-red-300 text-xs">{parseError}</p></div></div>}
      <div className="flex gap-3">
        <button onClick={() => setMultiStep(1)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm">Atras</button>
        <button onClick={handleMultiAnalyze} disabled={isParsing}
          className="flex-1 bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
          {isParsing ? 'Analizando...' : 'Detectar Alumnos'}
        </button>
      </div>
    </div>
  );

  const renderMultiStep3 = () => {
    if (matchResults.length === 0) return null;
    const current = matchResults[wizardIdx];
    const wd = wizardData[wizardIdx];
    if (!current || !wd) return null;
    const totalEj = wd.editableDias.reduce((a, d) => a + d.ejercicios.length, 0);
    const detectionLabel = { sheet: 'Hoja del archivo', column: 'Columna de alumno', block: 'Bloque de filas', single: 'Archivo completo' };

    return (
      <div className="space-y-4">
        {/* Navegacion wizard */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWizardIdx(i => Math.max(0, i - 1))} disabled={wizardIdx === 0}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors">
            <IconChevron dir="left" />
          </button>
          <div className="text-center">
            <p className="text-white font-black text-sm">Alumno {wizardIdx + 1} de {matchResults.length}</p>
            <p className="text-zinc-500 text-xs">{detectionLabel[current.block.detectionMethod]}</p>
          </div>
          <button onClick={() => setWizardIdx(i => Math.min(matchResults.length - 1, i + 1))} disabled={wizardIdx === matchResults.length - 1}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg transition-colors">
            <IconChevron dir="right" />
          </button>
        </div>

        {/* Skip toggle */}
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className={`w-9 h-5 rounded-full transition-colors ${wd.skipped ? 'bg-red-500' : 'bg-zinc-700'} relative`} onClick={() => updateWizard('skipped', !wd.skipped)}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${wd.skipped ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-zinc-300 font-medium">{wd.skipped ? 'Omitir este alumno (no se importará)' : 'Importar este alumno'}</span>
        </label>

        {!wd.skipped && (
          <>
            {/* Nombre detectado */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Nombre detectado en el archivo</p>
              <p className="text-amber-400 font-bold">{current.block.studentName || '(sin nombre detectado)'}</p>
            </div>

            {/* Match de alumno */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Asignar a alumno de la plataforma
              </label>
              {current.bestMatch && (
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <IconCheck />
                  <div className="flex-1">
                    <p className="text-emerald-400 text-xs font-bold">Match sugerido:</p>
                    <p className="text-white text-xs">{current.bestMatch.email || current.bestMatch.usuario?.email}</p>
                  </div>
                  <ScoreBadge score={current.bestScore} />
                </div>
              )}
              <select value={wd.studentId} onChange={e => updateWizard('studentId', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none text-sm focus:border-emerald-500">
                <option value="">-- Seleccionar alumno manualmente --</option>
                {(students || []).map(s => (
                  <option key={s.id_usuario} value={s.id_usuario}>{s.email || s.usuario?.email || s.id_usuario}</option>
                ))}
              </select>
              {!wd.studentId && (
                <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-400">
                  <span className="text-amber-400 font-bold">Aviso:</span> Si no asignás un alumno, los datos se importarán sin asignar y la rutina quedará guardada pero sin alumno vinculado. No es posible crear alumnos nuevos desde aquí — cada alumno debe registrarse primero en la plataforma.
                </div>
              )}
            </div>

            {/* Config rutina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Nombre de la rutina</label>
                <input value={wd.routineName} onChange={e => updateWizard('routineName', e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none text-sm focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Frecuencia semanal</label>
                <select value={wd.frecuencia} onChange={e => updateWizard('frecuencia', parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl outline-none text-sm">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} dias/semana</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors ${wd.asignar ? 'bg-emerald-500' : 'bg-zinc-700'} relative`} onClick={() => updateWizard('asignar', !wd.asignar)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${wd.asignar ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-zinc-300">Asignar rutina al alumno</span>
            </label>

            {/* Preview ejercicios (colapsable) */}
            <details className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 cursor-pointer hover:text-white">
                Ver ejercicios detectados ({totalEj}) →
              </summary>
              <div className="max-h-40 overflow-y-auto divide-y divide-zinc-900">
                {wd.editableDias.map((dia, diaIdx) => (
                  <div key={diaIdx}>
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-zinc-800">{dia.nombre_dia}</p>
                    {dia.ejercicios.map((ex, exIdx) => (
                      <div key={exIdx} className="px-3 py-1.5 flex items-center gap-2 flex-wrap">
                        <input value={ex.nombre_ejercicio} onChange={e => updateWizardEjercicio(diaIdx, exIdx, 'nombre_ejercicio', e.target.value)}
                          className="flex-1 min-w-24 bg-zinc-950 border border-zinc-800 text-white p-1 rounded text-[11px] outline-none focus:border-emerald-500" />
                        <span className="text-zinc-500 text-[10px]">{ex.series}x{ex.reps_objetivo} @{ex.peso_sugerido}kg</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => setMultiStep(2)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm">Atras</button>
          <div className="flex-1" />
          {wizardIdx < matchResults.length - 1 ? (
            <button onClick={() => setWizardIdx(i => i + 1)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2">
              Siguiente <IconChevron dir="right" />
            </button>
          ) : (
            <button onClick={() => setMultiStep(4)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2.5 px-5 rounded-xl text-sm uppercase tracking-widest">
              Ver resumen
            </button>
          )}
        </div>
      </div>
    );
  };

  // Paso 4 multi: resumen global antes de confirmar
  const renderMultiStep4 = () => {
    const toImport = wizardData.filter(wd => !wd.skipped);
    const skipped = wizardData.filter(wd => wd.skipped);
    return (
      <div className="space-y-4">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Resumen de importacion</p>
          <div className="space-y-2">
            {wizardData.map((wd, i) => {
              const mr = matchResults[i];
              const student = students.find(s => s.id_usuario === wd.studentId);
              const totalEj = wd.editableDias.reduce((a, d) => a + d.ejercicios.length, 0);
              return (
                <div key={i} className={`p-3 rounded-xl border ${wd.skipped ? 'border-zinc-800 bg-zinc-900/50 opacity-50' : 'border-zinc-700 bg-zinc-900'}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white font-bold text-sm">{mr?.block?.studentName || `Alumno ${i+1}`}</p>
                      {wd.skipped ? (
                        <p className="text-zinc-500 text-xs">Omitido</p>
                      ) : (
                        <p className="text-zinc-400 text-xs">{student?.email || student?.usuario?.email || 'Sin asignar'}</p>
                      )}
                    </div>
                    {!wd.skipped && (
                      <div className="text-right text-xs text-zinc-500">
                        <p>{wd.routineName}</p>
                        <p>{totalEj} ejercicios</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {toImport.length === 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
            Todos los alumnos fueron omitidos. No hay nada que importar.
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setMultiStep(3)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl text-sm">Atras</button>
          <button onClick={handleMultiConfirm} disabled={toImport.length === 0 || isImporting}
            className="flex-1 bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-widest">
            {isImporting ? (
              <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/>Importando...</span>
            ) : `Confirmar e Importar (${toImport.length} alumno${toImport.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    );
  };

  // Paso 5 multi: resultados finales
  const renderMultiStep5 = () => {
    const ok = multiResults.filter(r => r.success).length;
    const errored = multiResults.filter(r => r.error).length;
    const skipped = multiResults.filter(r => r.skipped).length;
    return (
      <div className="flex flex-col gap-4">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${ok > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {ok > 0 ? <IconCheck /> : <IconX />}
        </div>
        <h3 className="text-center text-lg font-black text-white">
          {ok > 0 ? `${ok} alumno${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''}` : 'Importación con errores'}
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Exitosos', ok, 'emerald'], ['Con error', errored, 'red'], ['Omitidos', skipped, 'zinc']].map(([l, v, c]) => (
            <div key={l} className={`p-3 rounded-xl border border-${c}-800 bg-${c}-900/30`}>
              <p className="text-xl font-black text-white">{v}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{l}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {multiResults.map((r, i) => (
            <div key={i} className={`p-2.5 rounded-xl border flex items-center gap-2 ${r.success ? 'border-emerald-800 bg-emerald-900/20' : r.error ? 'border-red-800 bg-red-900/20' : 'border-zinc-800 bg-zinc-900/30'}`}>
              <span className={r.success ? 'text-emerald-400' : r.error ? 'text-red-400' : 'text-zinc-500'}>
                {r.success ? <IconCheck /> : r.error ? <IconX /> : <IconWarn />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate">{r.studentName || `Alumno ${i+1}`}</p>
                {r.error && <p className="text-red-400 text-[10px] truncate">{r.error}</p>}
                {r.skipped && <p className="text-zinc-500 text-[10px]">Omitido</p>}
                {r.success && <p className="text-emerald-400 text-[10px]">{r.data?.nombre_rutina}</p>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl uppercase tracking-widest text-sm">Cerrar</button>
      </div>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  const singleSteps = ['Seleccion', 'Analisis', 'Preview', 'Resultado'];
  const multiSteps  = ['Archivo', 'Deteccion', 'Alumno a alumno', 'Resumen', 'Resultado'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Importar Rutina</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Desde Excel, CSV, Word o PDF</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-xl"><IconX /></button>
        </div>

        {/* MODE SELECTOR */}
        <div className="px-6 pt-5">
          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode('single'); setSingleStep(1); setParseError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${mode === 'single' ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
              Un alumno
              <span className="block text-[10px] font-normal normal-case tracking-normal mt-0.5 opacity-70">Archivo con datos de 1 solo alumno</span>
            </button>
            <button onClick={() => { setMode('multi'); setMultiStep(1); setParseError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${mode === 'multi' ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
              Multiples alumnos
              <span className="block text-[10px] font-normal normal-case tracking-normal mt-0.5 opacity-70">El archivo incluye varios alumnos</span>
            </button>
          </div>

          {/* STEP INDICATOR */}
          <StepIndicator step={mode === 'single' ? singleStep : multiStep} steps={mode === 'single' ? singleSteps : multiSteps} />

          {/* CONTENT */}
          <div className="pb-6">
            {mode === 'single' && singleStep === 1 && renderSingleStep1()}
            {mode === 'single' && singleStep === 2 && renderSingleStep2()}
            {mode === 'single' && singleStep === 3 && renderSingleStep3()}
            {mode === 'single' && singleStep === 4 && renderSingleStep4()}
            {mode === 'multi'  && multiStep === 1  && renderMultiStep1()}
            {mode === 'multi'  && multiStep === 2  && renderMultiStep2()}
            {mode === 'multi'  && multiStep === 3  && renderMultiStep3()}
            {mode === 'multi'  && multiStep === 4  && renderMultiStep4()}
            {mode === 'multi'  && multiStep === 5  && renderMultiStep5()}
          </div>
        </div>
      </div>
    </div>
  );
}
