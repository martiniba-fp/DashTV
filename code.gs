// ============================================================
// DashTV — Framingham Pharma
// ============================================================

const SOURCE_SS_ID = '1g1obcWhLz30e0yjp35etFTrAAOIr0ML0omuDizc-teE';
const CACHE_TTL    = 300; // 5 min

// ── Menu ──────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('DashTV')
    .addItem('▶  Abrir Dashboard',       'openDashboard')
    .addSeparator()
    .addItem('⚙  Inicializar Hojas',     'initializeSheets')
    .addItem('↻  Actualizar Comparativo','updateComparativo')
    .addToUi();
}

// ── Web App ───────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('DashTV — Framingham')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function openDashboard() {
  const url  = ScriptApp.getService().getUrl();
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}','_blank');google.script.host.close();</script>`
  );
  SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo DashTV…');
}

// ── Month detection ───────────────────────────────────────
function getAvailableMonths() {
  try {
    return SpreadsheetApp.openById(SOURCE_SS_ID)
      .getSheets()
      .map(s => s.getName())
      .filter(n => /\d{4}/.test(n) && /grilla/i.test(n))
      .sort((a, b) => _parseSheetMonth(a) - _parseSheetMonth(b));
  } catch (e) {
    Logger.log('getAvailableMonths error: ' + e.message);
    return [];
  }
}

function _parseSheetMonth(name) {
  const M = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
    ene:0,abr:3,ago:7,dic:11
  };
  const yr = +((name.match(/\d{4}/) || ['2000'])[0]);
  const m  = M[name.toLowerCase().slice(0, 3)] ?? 0;
  return new Date(yr, m, 1).getTime();
}

// ── Utilities ─────────────────────────────────────────────
function _parseARS(v) {
  if (typeof v === 'number') return v;
  return parseFloat(
    String(v || 0)
      .replace(/[^0-9,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  ) || 0;
}

function _fmtDate(v) {
  if (!v) return '';
  try {
    if (v instanceof Date && !isNaN(v))
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  } catch (e) {}
  return String(v);
}

// ── Consolidado ───────────────────────────────────────────
function getConsolidadoData() {
  const cache = CacheService.getScriptCache();
  const hit   = cache.get('consol_v5');
  if (hit) return JSON.parse(hit);

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidado');
  const empty = { programaMap:{}, profMap:{}, budgetRows:[], totalSinADN:0, totalConADN:0 };
  if (!sh) return empty;

  const data = sh.getDataRange().getValues();
  const programaMap = {}, profMap = {}, budgetRows = [];
  let totalSinADN = 0, totalConADN = 0;

  data.forEach((row, i) => {
    const a = String(row[0] || '').trim();
    const b = String(row[1] || '').trim();
    const c = _parseARS(row[2]);
    const d = _parseARS(row[3]);
    const e = _parseARS(row[4]);
    const f = String(row[5] || '').trim();

    if (a === 'TOTAL' && !a.includes('ADN'))        { totalSinADN = e; return; }
    if (a.toUpperCase().includes('TOTAL CON ADN'))  { totalConADN = e; return; }

    // Program rows (rows 2-27 in sheet = i 1-26)
    if (a && !['Programas','TOTAL'].includes(a) && !a.startsWith('HAY') && i >= 1 && i <= 27) {
      programaMap[a] = { valorPrograma: c, estipulada: d, proyeccion: e, tipo: f, conductor: b };
      if (e > 0) budgetRows.push({ programa: a, conductor: b, valorPrograma: c, estipulada: d, proyeccion: e, tipo: f });
    }

    // Professional fee rows (from row 32 in sheet = i 31) — normalize to lowercase for case-insensitive lookup
    if (i >= 31 && b && b !== 'Profesional' && c > 0) profMap[b.trim().toLowerCase()] = c;
  });

  const result = { programaMap, profMap, budgetRows, totalSinADN, totalConADN };
  try { cache.put('consol_v5', JSON.stringify(result), CACHE_TTL); } catch (e) {}
  return result;
}

// ── Month data ────────────────────────────────────────────
// Fixed layout — header at row 3, data from row 4, columns start at C:
//   C(0)=Fecha  D(1)=Producto   E(2)=Profesional  F(3)=Programa
//   G(4)=Conductor  H(5)=¿Quien la edita?  I(6)=Grabado  J(7)=Nota o PNT
// "CRUDO SALIDAS PROFESIONALES" is found by name in row 3 (can be K or L).
const _SALIDA_KEYWORDS = ['crudo salidas', 'salida real', 'archivo', 'video'];

function getMonthData(sheetName) {
  if (!sheetName) return { rows: [] };

  const key   = 'mdv4_' + sheetName.replace(/\W+/g, '_');
  const cache = CacheService.getScriptCache();
  const hit   = cache.get(key);
  if (hit) return JSON.parse(hit);

  try {
    const srcSS = SpreadsheetApp.openById(SOURCE_SS_ID);
    const sh    = srcSS.getSheetByName(sheetName);
    if (!sh) return { rows: [], error: 'Hoja no encontrada: ' + sheetName };

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { rows: [] };

    // Read rows 1 and 2 together (one API call):
    //   row 1 = headers → find CRUDO SALIDAS column
    //   row 2 = either first data row (Jun) or blank (May) → detect data start
    const lastCol = sh.getLastColumn();
    const topRows = sh.getRange(1, 3, 2, Math.max(lastCol - 2, 10)).getValues();

    // Detect CRUDO SALIDAS column in header (row 1), scanning from offset 8 (col K) onwards
    let salidaOffset = -1;
    for (let i = 8; i < topRows[0].length; i++) {
      const v = String(topRows[0][i] || '').toLowerCase().trim();
      if (_SALIDA_KEYWORDS.some(k => v.includes(k))) { salidaOffset = i; break; }
    }
    const numCols = salidaOffset >= 0 ? salidaOffset + 1 : 8;

    // Detect data start row: row 2 if Producto (offset 1 = col D) is not empty, else row 3
    const dataStartRow = String(topRows[1][1] || '').trim() ? 2 : 3;

    // Cap to avoid reading empty checkbox rows (grilla extends far down with planning slots)
    const MAX_DATA_ROWS = 500;
    const readRows = Math.min(Math.max(lastRow - dataStartRow + 1, 0), MAX_DATA_ROWS);
    if (readRows <= 0) return { rows: [] };

    // Main data read: from detected start row, column C
    const vals = sh.getRange(dataStartRow, 3, readRows, numCols).getValues();
    const { programaMap, profMap } = getConsolidadoData();
    const rows = [];

    vals.forEach(row => {
      const producto = String(row[1] || '').trim(); // D
      if (!producto) return;

      const profesional = String(row[2] || '').trim(); // E
      const programa    = String(row[3] || '').trim(); // F
      const tomadoRaw   = row[6];                      // I — "Grabado"
      const progData    = programaMap[programa] || {};

      rows.push({
        fecha        : _fmtDate(row[0]),               // C
        producto,
        profesional,
        programa,
        conductor    : String(row[4] || '').trim(),     // G
        editado      : String(row[5] || '').trim(),     // H — "¿Quien la edita?"
        tomado       : tomadoRaw === true || String(tomadoRaw).toUpperCase() === 'TRUE',
        tipoSalida   : String(row[7] || '').trim().toUpperCase(), // J — "Nota o PNT"
        salidaReal   : salidaOffset >= 0 ? String(row[salidaOffset] || '').trim() : '',
        valorPrograma: progData.valorPrograma || 0,
        valorApoyo   : profMap[profesional.toLowerCase()] || 0
      });
    });

    const result = { rows };
    try { cache.put(key, JSON.stringify(result), CACHE_TTL); } catch (e) {}
    return result;

  } catch (e) {
    Logger.log('getMonthData error: ' + e.message);
    return { rows: [], error: e.message };
  }
}

// ── Aggregation ───────────────────────────────────────────
function _aggregate(rows) {
  const byProducto = {}, byProf = {}, byProg = {}, byFecha = {};
  let totalInvProg = 0, totalInvApoyo = 0, total = 0, tomadas = 0;
  let editJuli = 0, editLukas = 0, editNoSub = 0, editOther = 0;
  let pnt = 0, nota = 0;
  const notTaken = [];

  function acc(obj, k, inv) {
    if (!obj[k]) obj[k] = { count: 0, inversion: 0 };
    obj[k].count++;
    obj[k].inversion += inv;
  }

  rows.forEach(r => {
    total++;
    const el = r.editado.toLowerCase();
    if      (el === 'juli')           editJuli++;
    else if (el === 'lukas')          editLukas++;
    else if (el.includes('no sub'))   editNoSub++;
    else                              editOther++;

    if (r.tipoSalida === 'PNT')  pnt++;
    else if (r.tipoSalida === 'NOTA') nota++;

    // Budget accounting: every row in the Grilla is a contracted appearance → count it all
    totalInvProg  += r.valorPrograma;
    totalInvApoyo += r.valorApoyo;
    const invTotal = r.valorPrograma + r.valorApoyo;
    acc(byProducto, r.producto, invTotal);
    if (r.profesional && r.valorApoyo > 0) acc(byProf, r.profesional, r.valorApoyo);
    acc(byProg, r.programa, r.valorPrograma);

    // Tomado/editado are separate execution-quality metrics
    if (r.tomado) {
      tomadas++;
    } else {
      notTaken.push(r);
    }

    if (r.fecha) byFecha[r.fecha] = (byFecha[r.fecha] || 0) + 1;
  });

  function toArr(obj) {
    return Object.entries(obj)
      .map(([name, d]) => ({ name, count: d.count, inversion: d.inversion }))
      .sort((a, b) => b.inversion - a.inversion);
  }

  const byFechaArr = Object.entries(byFecha)
    .map(([f, c]) => {
      const [dd, mm, yy] = f.split('/');
      return { fecha: f, count: c, ts: new Date(+yy, +mm - 1, +dd).getTime() };
    })
    .sort((a, b) => a.ts - b.ts);

  return {
    total, tomadas,
    totalInvProg, totalInvApoyo,
    totalInv: totalInvProg + totalInvApoyo,
    editJuli, editLukas, editNoSub, editOther,
    pnt, nota, notTaken,
    byProducto : toArr(byProducto),
    byProf     : toArr(byProf),
    byProg     : toArr(byProg),
    byFecha    : byFechaArr
  };
}

// ── Main API (called from HTML) ───────────────────────────
function getDashboardData(mainMonth, cmpMonth) {
  const months = getAvailableMonths();
  const sel    = mainMonth || months[Math.max(0, months.length - 2)] || '';

  const cd          = getConsolidadoData();
  const mainResult  = getMonthData(sel);

  // Surface data-source errors to the web app instead of silently reading garbage
  if (mainResult.error) {
    return { dataError: mainResult.error, months, selectedMonth: sel };
  }

  const main = _aggregate(mainResult.rows);

  let cmp = null;
  if (cmpMonth) {
    const cmpResult = getMonthData(cmpMonth);
    if (cmpResult.error) {
      Logger.log('[DashTV] Compare month error ignored: ' + cmpResult.error);
      // Don't fail the whole response — just disable comparison
    } else {
      cmp = _aggregate(cmpResult.rows);
    }
  }

  const budgetVsActual = cd.budgetRows.map(b => {
    const a  = main.byProg.find(p => p.name === b.programa) || { count: 0, inversion: 0 };
    const ca = cmp ? (cmp.byProg.find(p => p.name === b.programa) || { count: 0, inversion: 0 }) : null;
    return {
      programa    : b.programa,
      tipo        : b.tipo,
      presupuesto : b.proyeccion,
      estipulada  : b.estipulada,
      invertido   : a.inversion,
      salidas     : a.count,
      pct         : b.proyeccion > 0 ? Math.round(a.inversion / b.proyeccion * 100) : 0,
      cmpInvertido: ca ? ca.inversion : null,
      cmpSalidas  : ca ? ca.count     : null
    };
  });

  return {
    months, selectedMonth: sel, cmpMonth: cmpMonth || null,
    totalSinADN: cd.totalSinADN, totalConADN: cd.totalConADN,
    main, cmp, budgetVsActual
  };
}

// ── Sheet Initialization ──────────────────────────────────
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // --- LookerStudioAlDia ---
  const looker = ss.getSheetByName('LookerStudioAlDia');
  if (looker) {
    looker.setFrozenRows(1);

    const lastCol = Math.max(looker.getLastColumn(), 11);
    looker.getRange(1, 1, 1, lastCol)
      .setBackground('#1a1a2e')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setFontSize(10);

    // Conditional formatting on Tomado (col G = 7)
    const tRange = looker.getRange('G2:G3000');
    looker.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('TRUE')
        .setBackground('#1a4731').setFontColor('#4ade80')
        .setRanges([tRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('FALSE')
        .setBackground('#4a1a1a').setFontColor('#f87171')
        .setRanges([tRange]).build()
    ]);

    // Dropdown for Editado (col F = 6)
    looker.getRange('F2:F3000').setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Juli', 'Lukas', 'No subieron a YT'], true)
        .setAllowInvalid(true)
        .build()
    );

    // Currency format on J and K
    looker.getRange('J2:K3000').setNumberFormat('"$"#,##0');
    looker.autoResizeColumns(1, lastCol);
  }

  // --- Consolidado ---
  const consol = ss.getSheetByName('Consolidado');
  if (consol) {
    consol.setFrozenRows(2);
    consol.getRange('C3:C50').setNumberFormat('"$"#,##0');
    consol.getRange('E3:E50').setNumberFormat('"$"#,##0');

    consol.getDataRange().getValues().forEach((row, i) => {
      const a = String(row[0] || '');
      if (a.includes('TOTAL') || a.includes('ADN')) {
        const isADNOnly = a.includes('ADN') && !a.includes('TOTAL');
        consol.getRange(i + 1, 1, 1, 6)
          .setBackground(isADNOnly ? '#1e3a1e' : '#1e2f4a')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
      }
    });

    consol.autoResizeColumns(1, 6);
  }

  // Clear consolidado cache so next load is fresh
  CacheService.getScriptCache().remove('consol_v5');

  ui.alert('DashTV', '✓ Hojas inicializadas correctamente.', ui.ButtonSet.OK);
}

// ── Comparativo Sheet ─────────────────────────────────────
function updateComparativo() {
  const ui     = SpreadsheetApp.getUi();
  const months = getAvailableMonths();

  if (!months.length) {
    ui.alert('DashTV', 'No se encontraron meses en el spreadsheet fuente.', ui.ButtonSet.OK);
    return;
  }

  const m1 = months[months.length - 1];
  const m2 = months.length >= 2 ? months[months.length - 2] : null;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh   = ss.getSheetByName('Comparativo');
  if (!sh) sh = ss.insertSheet('Comparativo');
  else sh.clearContents().clearFormats();

  const hdrs = [
    'Mes','Fecha','Producto','Profesional','Programa','Conductor',
    'Editado','Tomado','Tipo','Salida Real','Valor Programa','Valor Apoyo','Total'
  ];

  sh.getRange(1, 1, 1, hdrs.length)
    .setValues([hdrs])
    .setBackground('#1a1a2e').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setFrozenRows(1);

  const all = [];
  [m1, m2].filter(Boolean).forEach(mn => {
    (getMonthData(mn) || { rows: [] }).rows.forEach(r =>
      all.push([
        mn, r.fecha, r.producto, r.profesional, r.programa, r.conductor,
        r.editado, r.tomado ? 'TRUE' : 'FALSE', r.tipoSalida, r.salidaReal,
        r.valorPrograma, r.valorApoyo, r.valorPrograma + r.valorApoyo
      ])
    );
  });

  if (all.length) {
    sh.getRange(2, 1, all.length, hdrs.length).setValues(all);
    sh.getRange(2, 11, all.length, 3).setNumberFormat('"$"#,##0');

    const tCol = sh.getRange(2, 8, all.length, 1);
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('TRUE')
        .setBackground('#1a4731').setFontColor('#4ade80')
        .setRanges([tCol]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('FALSE')
        .setBackground('#4a1a1a').setFontColor('#f87171')
        .setRanges([tCol]).build()
    ]);

    sh.autoResizeColumns(1, hdrs.length);
  }

  ui.alert('DashTV',
    `Comparativo actualizado:\n${[m1, m2].filter(Boolean).join(' vs ')}\n${all.length} filas totales.`,
    ui.ButtonSet.OK
  );
}
