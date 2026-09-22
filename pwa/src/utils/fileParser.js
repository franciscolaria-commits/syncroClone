/**
 * fileParser.js - Parser heuristico para importacion de rutinas
 * Soporta: Excel (.xlsx/.xls), CSV, Word (.docx), PDF
 */

const COLUMN_ALIASES = {
  ejercicio: [
    'ejercicio', 'exercise', 'nombre ejercicio', 'nombre del ejercicio',
    'nombre', 'ex', 'mov', 'movimiento', 'activity', 'ejercicios',
    'exercises', 'movimientos', 'actividad', 'musculo', 'muscle'
  ],
  dia: [
    'dia', 'day', 'bloque', 'block', 'jornada', 'grupo', 'session',
    'sesion', 'dia entrenamiento', 'dia de entrenamiento',
    'grupo muscular', 'muscle group', 'split'
  ],
  series: [
    'series', 'sets', 's', 'nro series', 'n series', 'numero de series',
    'cant series', 'cantidad de series', 'num sets'
  ],
  reps: [
    'repeticiones', 'reps', 'rep', 'reps objetivo', 'r',
    'repeticion', 'repeticiones objetivo', 'objetivo reps',
    'repetitions', 'reps goal', 'reps target'
  ],
  peso: [
    'peso', 'weight', 'kg', 'carga', 'load', 'w',
    'peso kg', 'peso usado', 'peso real', 'peso trabajo',
    'working weight', 'load kg', 'weight kg'
  ],
  rir: [
    'rir', 'rpe', 'esfuerzo', 'intensidad', 'tempo',
    'repeticiones en reserva', 'reps in reserve', 'effort'
  ],
};

function normalizeHeader(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectColumnType(header) {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const normAlias = normalizeHeader(alias);
      if (norm === normAlias) return canonical;
      if (norm.includes(normAlias) && normAlias.length >= 3) return canonical;
      if (normAlias.includes(norm) && norm.length >= 2) return canonical;
    }
  }
  return null;
}

export function detectColumns(headers) {
  const columnMap = {};
  const used = new Set();
  headers.forEach((header, idx) => {
    const canonical = detectColumnType(header);
    if (canonical && !used.has(canonical)) {
      columnMap[idx] = canonical;
      used.add(canonical);
    }
  });
  return columnMap;
}

export function normalizeData(headers, rows, columnMap) {
  const fieldIndex = {};
  for (const [idx, canonical] of Object.entries(columnMap)) {
    fieldIndex[canonical] = parseInt(idx);
  }

  const diasMap = new Map();

  for (const row of rows) {
    if (!row || row.every(cell => !cell && cell !== 0)) continue;
    const getCell = (field) => {
      const idx = fieldIndex[field];
      if (idx === undefined) return null;
      const val = row[idx];
      return val !== undefined && val !== null && val !== '' ? val : null;
    };

    const ejercicioRaw = getCell('ejercicio');
    if (!ejercicioRaw) continue;
    const ejercicioNombre = String(ejercicioRaw).trim();
    if (!ejercicioNombre) continue;

    const diaRaw = getCell('dia');
    const diaNombre = diaRaw ? String(diaRaw).trim() : 'Dia 1';
    const seriesRaw = getCell('series');
    const series = seriesRaw ? Math.max(1, parseInt(seriesRaw) || 3) : 3;
    const repsRaw = getCell('reps');
    const repsStr = repsRaw !== null ? String(repsRaw).trim() : '10';
    const repsNum = parseInt(repsStr.split('-')[0]) || 10;
    const pesoRaw = getCell('peso');
    const peso = pesoRaw !== null ? parseFloat(String(pesoRaw).replace(',', '.')) || 0 : 0;
    const rirRaw = getCell('rir');
    const rir = rirRaw !== null ? parseInt(rirRaw) || null : null;

    if (!diasMap.has(diaNombre)) diasMap.set(diaNombre, new Map());
    const diaExercicios = diasMap.get(diaNombre);

    if (!diaExercicios.has(ejercicioNombre)) {
      diaExercicios.set(ejercicioNombre, {
        nombre_ejercicio: ejercicioNombre,
        series,
        reps_objetivo: repsStr,
        peso_sugerido: peso,
        rir,
        historial: []
      });
    }

    const exData = diaExercicios.get(ejercicioNombre);
    if (peso > 0 && repsNum > 0) {
      const setsToCreate = series || 1;
      for (let i = 0; i < setsToCreate; i++) {
        exData.historial.push({ peso_usado: peso, reps_logradas: repsNum });
      }
    }
    if (peso > exData.peso_sugerido) exData.peso_sugerido = peso;
  }

  const dias = [];
  let diaOrden = 1;
  for (const [diaNombre, ejerciciosMap] of diasMap) {
    dias.push({ nombre_dia: diaNombre || `Dia ${diaOrden}`, ejercicios: Array.from(ejerciciosMap.values()) });
    diaOrden++;
  }
  return { dias };
}

export async function parseExcel(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawData || rawData.length < 2) throw new Error('El archivo Excel esta vacio o no tiene datos suficientes.');
  const headers = rawData[0].map(h => String(h || '').trim());
  const rows = rawData.slice(1);
  return { headers, rows };
}

export async function parseCsv(file) {
  const Papa = await import('papaparse');
  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length < 2) { reject(new Error('El archivo CSV esta vacio.')); return; }
        const headers = results.data[0].map(h => String(h || '').trim());
        const rows = results.data.slice(1);
        resolve({ headers, rows });
      },
      error: (err) => reject(new Error(`Error al parsear CSV: ${err.message}`))
    });
  });
}

export async function parseDocx(file) {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const html = result.value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (!tables.length) throw new Error('No se encontraron tablas en el archivo Word. Los datos deben estar en formato de tabla.');

  let bestTable = null; let maxCols = 0;
  for (const table of tables) {
    const firstRow = table.querySelector('tr');
    if (!firstRow) continue;
    const cols = firstRow.querySelectorAll('td, th').length;
    if (cols > maxCols) { maxCols = cols; bestTable = table; }
  }
  if (!bestTable) throw new Error('No se encontro una tabla valida en el archivo Word.');

  const tableRows = bestTable.querySelectorAll('tr');
  const allRows = Array.from(tableRows).map(tr =>
    Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
  );
  if (allRows.length < 2) throw new Error('La tabla del archivo Word tiene muy pocas filas.');
  return { headers: allRows[0], rows: allRows.slice(1) };
}

export async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let allLines = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lineMap = new Map();
    for (const item of textContent.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], text: item.str });
    }
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = lineMap.get(y).sort((a, b) => a.x - b.x);
      const lineText = items.map(i => i.text.trim()).filter(Boolean).join('\t');
      if (lineText.trim()) allLines.push(lineText);
    }
  }

  if (allLines.length < 2) throw new Error('No se pudo extraer texto del PDF. Verifica que tenga texto seleccionable (no una imagen escaneada).');

  const rows = allLines.map(line => line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(Boolean));
  let maxCols = 0; let headerRowIdx = 0;
  rows.forEach((row, idx) => { if (row.length > maxCols) { maxCols = row.length; headerRowIdx = idx; } });
  if (maxCols < 2) throw new Error('No se encontro una estructura de tabla clara en el PDF.');

  return { headers: rows[headerRowIdx], rows: rows.slice(headerRowIdx + 1) };
}

export async function parseFile(file) {
  const name = file.name.toLowerCase();
  let result; let fileType;

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    result = await parseExcel(file); fileType = 'Excel';
  } else if (name.endsWith('.csv')) {
    result = await parseCsv(file); fileType = 'CSV';
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    result = await parseDocx(file); fileType = 'Word';
  } else if (name.endsWith('.pdf')) {
    result = await parsePdf(file); fileType = 'PDF';
  } else {
    throw new Error('Formato no soportado. Usa Excel (.xlsx), CSV, Word (.docx) o PDF.');
  }

  const { headers, rows } = result;
  const columnMap = detectColumns(headers);
  const detectedFields = new Set(Object.values(columnMap));

  if (!detectedFields.has('ejercicio')) {
    throw new Error(
      `No se detecto una columna de ejercicios. Encabezados encontrados: ${headers.join(', ')}. ` +
      `Asegurate de tener una columna llamada: ejercicio, exercise, nombre, movimiento.`
    );
  }
  if (!detectedFields.has('reps')) {
    throw new Error(
      `No se detecto una columna de repeticiones. Encabezados encontrados: ${headers.join(', ')}. ` +
      `Asegurate de tener una columna llamada: reps, repeticiones, rep.`
    );
  }

  const normalizedData = normalizeData(headers, rows, columnMap);
  return { headers, rows, columnMap, normalizedData, fileType, totalRows: rows.length };
}
