// ============================================================
//  UTILIDADES
// ============================================================

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// Normaliza para comparación: trim, lowercase, sin tildes.
function normalizeStr(s) {
  if (s === null || s === undefined) return '';
  return String(s).trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Devuelve { match, dist } si hay un candidato dentro de maxDist, o null.
function bestMatch(input, candidates, maxDist) {
  const normInput = normalizeStr(input);
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(normInput, normalizeStr(c));
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist <= (maxDist !== undefined ? maxDist : 2)
    ? { match: best, dist: bestDist }
    : null;
}

// True si la celda en la posición fechaColIndex contiene una fecha válida.
function isDataRow(rowValues, fechaColIndex) {
  const v = rowValues[fechaColIndex];
  return v instanceof Date;
}

// Resuelve el nombre canónico de una columna por nombre exacto o fuzzy.
function headerToCanonical(name) {
  if (!name && name !== 0) return null;
  const trimmed = String(name).trim();
  if (trimmed in COLUMN_ALIASES) return COLUMN_ALIASES[trimmed];
  // Fallback fuzzy (manejo de variantes con tildes perdidas, etc.)
  for (const [alias, canonical] of Object.entries(COLUMN_ALIASES)) {
    if (normalizeStr(alias) === normalizeStr(trimmed)) return canonical;
  }
  return null; // columna desconocida → descartar
}

function aplicarEstiloHeader(range) {
  range
    .setBackground('#1e3a5f')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function aplicarValidaciones(sheet, dataRows) {
  if (dataRows < 1) return;
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const master = ss.getSheetByName(MASTER_SHEET);
  const startRow = 2;

  // Programa → rango de la hoja maestra (o inline si no existe master)
  if (master) {
    const totalProg = Object.keys(PROGRAMAS_CONDUCTORES).length;
    const progRange = master.getRange(2, 1, totalProg, 1);
    sheet.getRange(startRow, COL.PROGRAMA, dataRows)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInRange(progRange, true)
          .setAllowInvalid(true)
          .setHelpText('Seleccioná un programa.')
          .build()
      );

    const totalProf = PROFESIONALES_LIST.length;
    const profRange = master.getRange(2, 3, totalProf, 1);
    sheet.getRange(startRow, COL.PROFESIONAL, dataRows)
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInRange(profRange, true)
          .setAllowInvalid(true)
          .setHelpText('Seleccioná un profesional.')
          .build()
      );
  }

  // Editor → inline
  sheet.getRange(startRow, COL.EDITOR, dataRows)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(EDITORES_LIST, true)
        .setAllowInvalid(true)
        .build()
    );

  // Tipo salida → inline
  sheet.getRange(startRow, COL.TIPO, dataRows)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(TIPOS_SALIDA, true)
        .setAllowInvalid(true)
        .build()
    );

  // Grabado → checkbox
  sheet.getRange(startRow, COL.GRABADO, dataRows)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build()
    );
}

function aplicarFormatoDatos(sheet, dataRows) {
  if (dataRows < 1) return;
  const startRow = 2;

  sheet.getRange(startRow, COL.FECHA, dataRows).setNumberFormat('dd/mm/yyyy');

  [COL.HORA, COL.DIA, COL.GRABADO, COL.TIPO, COL.IMPACTO].forEach(col => {
    sheet.getRange(startRow, col, dataRows).setHorizontalAlignment('center');
  });

  // Alternado de colores en batch
  const bgs = [];
  for (let i = 0; i < dataRows; i++) {
    bgs.push(new Array(SCHEMA_HEADERS.length).fill(i % 2 === 0 ? '#f0f4f8' : '#ffffff'));
  }
  sheet.getRange(startRow, 1, dataRows, SCHEMA_HEADERS.length).setBackgrounds(bgs);
}
