// ============================================================
//  DETECCIÓN DE INCONSISTENCIAS
// ============================================================

const COLOR_TYPO     = '#fff176'; // amarillo  — posible typo (dist ≤ 2)
const COLOR_CERCANO  = '#ffcc80'; // naranja   — nombre parecido pero más lejos (dist 3)
const COLOR_AUSENTE  = '#ef9a9a'; // rojo      — no existe en lista maestra
const COLOR_MISMATCH = '#ce93d8'; // violeta   — conductor no coincide con programa

function detectarInconsistencias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => !SKIP_SHEETS.includes(s.getName()));

  let total = 0;
  for (const sheet of sheets) {
    total += revisarHoja(sheet);
  }

  SpreadsheetApp.getUi().alert(
    `Revisión completa — ${total} inconsistencia(s) marcada(s).\n\n` +
    '🟡 Amarillo  = typo probable (corrección en comentario)\n' +
    '🟠 Naranja   = nombre similar, diferencia mayor\n' +
    '🔴 Rojo      = valor no encontrado en lista\n' +
    '🟣 Violeta   = conductor no coincide con el programa'
  );
}

function limpiarMarcas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => !SKIP_SHEETS.includes(s.getName()));

  for (const sheet of sheets) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    const rng = sheet.getRange(2, 1, lastRow - 1, SCHEMA_HEADERS.length);
    rng.setBackground(null);
    rng.clearNote();
  }

  SpreadsheetApp.getUi().alert('Marcas eliminadas en todas las hojas.');
}

// ── Revisión por hoja ──────────────────────────────────────

function revisarHoja(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  // Solo hojas ya normalizadas (headers exactos)
  const headers = sheet.getRange(1, 1, 1, SCHEMA_HEADERS.length).getValues()[0];
  const isNorm  = SCHEMA_HEADERS.every((h, i) => h === headers[i]);
  if (!isNorm) {
    Logger.log(`"${sheet.getName()}" no está normalizada, se omite.`);
    return 0;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, SCHEMA_HEADERS.length).getValues();
  let issues = 0;

  for (let r = 0; r < data.length; r++) {
    const row    = data[r];
    const shRow  = r + 2; // fila real en el sheet (1-based + 1 header)

    if (row.every(v => v === '' || v === null)) continue;

    const programa    = str(row[COL.PROGRAMA   - 1]);
    const conductor   = str(row[COL.CONDUCTOR  - 1]);
    const profesional = str(row[COL.PROFESIONAL - 1]);
    const editor      = str(row[COL.EDITOR     - 1]);
    const tipo        = str(row[COL.TIPO       - 1]).toLowerCase();
    const dia         = str(row[COL.DIA        - 1]);

    // 1. Programa
    if (programa) {
      issues += checkEnLista(sheet, shRow, COL.PROGRAMA, programa, Object.keys(PROGRAMAS_CONDUCTORES));
    }

    // 2. Conductor vs programa esperado (solo si el programa existe en master)
    if (programa && conductor && programa in PROGRAMAS_CONDUCTORES) {
      const esperado = PROGRAMAS_CONDUCTORES[programa];
      if (esperado && normalizeStr(conductor) !== normalizeStr(esperado)) {
        const dist = levenshtein(normalizeStr(conductor), normalizeStr(esperado));
        const cell = sheet.getRange(shRow, COL.CONDUCTOR);
        if (dist <= 3) {
          marcar(cell, COLOR_TYPO,
            `Typo probable: "${conductor}" → "${esperado}" (programa: "${programa}")`);
        } else {
          marcar(cell, COLOR_MISMATCH,
            `Conductor incorrecto: "${conductor}". Para "${programa}" se espera "${esperado}"`);
        }
        issues++;
      }
    }

    // 3. Profesional
    if (profesional) {
      issues += checkEnLista(sheet, shRow, COL.PROFESIONAL, profesional, PROFESIONALES_LIST);
    }

    // 4. Editor
    if (editor) {
      issues += checkEnLista(sheet, shRow, COL.EDITOR, editor, EDITORES_LIST);
    }

    // 5. Tipo de salida
    if (tipo && !TIPOS_SALIDA.includes(tipo)) {
      marcar(sheet.getRange(shRow, COL.TIPO), COLOR_AUSENTE,
        `Tipo inválido: "${tipo}". Valores válidos: ${TIPOS_SALIDA.join(', ')}`);
      issues++;
    }

    // 6. Día de la semana
    if (dia) {
      issues += checkEnLista(sheet, shRow, COL.DIA, dia, DIAS_VALIDOS);
    }
  }

  return issues;
}

// ── Helpers ────────────────────────────────────────────────

function str(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

// Retorna 0 (OK) o 1 (problema encontrado). Aplica color y nota.
function checkEnLista(sheet, row, col, valor, lista) {
  // Match exacto normalizado
  if (lista.some(c => normalizeStr(c) === normalizeStr(valor))) return 0;

  const m = bestMatch(valor, lista, 3);
  const cell = sheet.getRange(row, col);

  if (m && m.dist <= 2) {
    marcar(cell, COLOR_TYPO,
      `Typo probable: "${valor}" → "${m.match}" (dist: ${m.dist})`);
  } else if (m && m.dist === 3) {
    marcar(cell, COLOR_CERCANO,
      `"${valor}" no está en la lista. Más cercano: "${m.match}" (dist: ${m.dist})`);
  } else {
    marcar(cell, COLOR_AUSENTE,
      `"${valor}" no encontrado en la lista maestra.`);
  }
  return 1;
}

function marcar(cell, color, mensaje) {
  cell.setBackground(color);
  const nota = cell.getNote();
  cell.setNote(nota ? `${nota}\n⚠️ ${mensaje}` : `⚠️ ${mensaje}`);
}
