/**
 * multiStudentParser.js
 * Detecta bloques de alumnos dentro de un archivo (Excel/CSV/Word/PDF)
 * sin usar IA — solo heurística de estructura + matcheo parcial por tokens/bigrams.
 *
 * Prioridad de detección:
 *   1. Nombre de hoja (cada hoja = un alumno)
 *   2. Columna con alias 'alumno/cliente/athlete/student/name/nombre'
 *   3. Fila separadora (una celda con texto, resto vacías)
 */

// -------------------------------------------------------
// ALIAS para detectar columna de alumno
// -------------------------------------------------------
const STUDENT_COL_ALIASES = [
  'alumno','cliente','athlete','student','name','nombre',
  'atleta','member','miembro','participante','persona','jugador',
];

function normalizeStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isStudentColumnHeader(header) {
  const norm = normalizeStr(header);
  return STUDENT_COL_ALIASES.some(alias => norm === alias || norm.includes(alias));
}

/**
 * Dado un array de filas (arrays de valores), detecta la columna de alumno.
 * Retorna el índice de columna o -1.
 */
function findStudentColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    if (isStudentColumnHeader(headers[i])) return i;
  }
  return -1;
}

/**
 * Detecta si una fila es un "separador de alumno":
 * - Exactamente una celda no vacía, el resto vacías
 * - La celda tiene texto de longitud razonable (3-60 chars)
 */
function isSeparatorRow(row) {
  const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
  if (nonEmpty.length !== 1) return false;
  const text = String(nonEmpty[0]).trim();
  return text.length >= 2 && text.length <= 60;
}

// -------------------------------------------------------
// DETECCIÓN PRINCIPAL DE BLOQUES DE ALUMNOS
// -------------------------------------------------------

/**
 * Dado un objeto workbook de SheetJS, intenta detectar bloques de alumnos.
 * Retorna: [{ studentName, rows, headers, detectionMethod }]
 */
export function detectStudentBlocksFromWorkbook(workbook) {
  const XLSX = workbook._xlsxLib; // se pasa la lib junto al workbook

  // ---- MÉTODO 1: múltiples hojas ----
  if (workbook.SheetNames && workbook.SheetNames.length > 1) {
    const blocks = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rawData || rawData.length < 2) continue;
      blocks.push({
        studentName: sheetName.trim(),
        headers: rawData[0].map(h => String(h || '').trim()),
        rows: rawData.slice(1),
        detectionMethod: 'sheet',
      });
    }
    if (blocks.length > 1) return blocks;
  }

  // ---- Obtener datos de la primera hoja ----
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawData || rawData.length < 2) return [];

  const headers = rawData[0].map(h => String(h || '').trim());
  const dataRows = rawData.slice(1);

  // ---- MÉTODO 2: columna de alumno ----
  const studentColIdx = findStudentColumnIndex(headers);
  if (studentColIdx >= 0) {
    const studentMap = new Map();
    for (const row of dataRows) {
      const nameRaw = row[studentColIdx];
      if (!nameRaw || String(nameRaw).trim() === '') continue;
      const name = String(nameRaw).trim();
      if (!studentMap.has(name)) studentMap.set(name, []);
      studentMap.get(name).push(row);
    }
    if (studentMap.size > 1) {
      return Array.from(studentMap.entries()).map(([name, rows]) => ({
        studentName: name,
        headers,
        rows,
        detectionMethod: 'column',
      }));
    }
  }

  // ---- MÉTODO 3: filas separadoras ----
  const blocks = [];
  let currentName = null;
  let currentRows = [];

  for (const row of dataRows) {
    if (isSeparatorRow(row)) {
      // Guardar bloque anterior
      if (currentName && currentRows.length > 0) {
        blocks.push({ studentName: currentName, headers, rows: currentRows, detectionMethod: 'block' });
      }
      // Extraer nombre del separador
      const nonEmpty = row.filter(c => String(c).trim() !== '');
      currentName = String(nonEmpty[0]).replace(/^[-=*\s]+|[-=*\s]+$/g, '').trim();
      currentRows = [];
    } else {
      if (currentName) currentRows.push(row);
    }
  }
  if (currentName && currentRows.length > 0) {
    blocks.push({ studentName: currentName, headers, rows: currentRows, detectionMethod: 'block' });
  }

  if (blocks.length > 1) return blocks;

  // ---- FALLBACK: archivo de un solo alumno (sin nombre detectado) ----
  return [{
    studentName: '',
    headers,
    rows: dataRows,
    detectionMethod: 'single',
  }];
}

// -------------------------------------------------------
// MATCHEO HEURÍSTICO alumno archivo → alumno plataforma
// -------------------------------------------------------

/**
 * Calcula score de similitud entre un string del archivo y un alumno de la plataforma.
 * Score: 0-100. Se sugiere match si score >= 40.
 *
 * @param {string} fileStr  - Nombre/texto del alumno en el archivo
 * @param {object} student  - { id_usuario, email, nombre? }
 * @returns {number}        - Score 0-100
 */
export function matchScore(fileStr, student) {
  if (!fileStr || !student) return 0;

  const norm = s => String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const fileNorm = norm(fileStr);

  // Campos del alumno a comparar
  const emailLocal = norm((student.email || '').split('@')[0]);
  const emailFull  = norm(student.email || '');
  const nombre     = norm(student.nombre || student.usuario?.nombre || '');

  let best = 0;

  for (const target of [emailLocal, emailFull, nombre].filter(Boolean)) {
    if (!target) continue;

    // 1. Substring directo
    if (target.includes(fileNorm) || fileNorm.includes(target)) {
      best = Math.max(best, 100);
      continue;
    }

    // 2. Matcheo por tokens (palabras de ≥3 chars)
    const fileTokens  = fileNorm.split(/\s+/).filter(t => t.length >= 3);
    const targetTokens = target.split(/[\s._-]+/).filter(t => t.length >= 3);
    if (fileTokens.length > 0 && targetTokens.length > 0) {
      const matched = fileTokens.filter(ft =>
        targetTokens.some(tt => tt.includes(ft) || ft.includes(tt))
      );
      const tokenScore = (matched.length / Math.max(fileTokens.length, targetTokens.length)) * 100;
      best = Math.max(best, tokenScore);
    }

    // 3. Bigrams (Dice coefficient)
    function bigrams(s) {
      const b = [];
      for (let i = 0; i < s.length - 1; i++) b.push(s.slice(i, i + 2));
      return b;
    }
    const fb = bigrams(fileNorm);
    const tb = bigrams(target);
    if (fb.length > 0 && tb.length > 0) {
      const common = fb.filter(b => tb.includes(b)).length;
      const dice = (2 * common / (fb.length + tb.length)) * 100;
      best = Math.max(best, dice);
    }
  }

  return Math.round(best);
}

/**
 * Para cada bloque detectado, calcula scores contra todos los alumnos
 * y devuelve los mejores candidatos.
 *
 * @param {Array} blocks    - Output de detectStudentBlocksFromWorkbook
 * @param {Array} students  - Lista de alumnos del entrenador [{id_usuario, email, ...}]
 * @returns {Array} matchResults - [{block, bestMatch, candidates, needsManual}]
 */
export function matchStudentsToBlocks(blocks, students) {
  return blocks.map(block => {
    if (!block.studentName || block.detectionMethod === 'single') {
      return { block, bestMatch: null, candidates: [], needsManual: true };
    }

    const scored = students
      .map(s => ({ student: s, score: matchScore(block.studentName, s) }))
      .filter(r => r.score >= 40)
      .sort((a, b) => b.score - a.score);

    const bestMatch = scored.length > 0 ? scored[0] : null;
    const needsManual = !bestMatch || bestMatch.score < 60;

    return {
      block,
      bestMatch: bestMatch?.student ?? null,
      bestScore: bestMatch?.score ?? 0,
      candidates: scored.slice(0, 5), // top 5 candidatos
      needsManual,
    };
  });
}
