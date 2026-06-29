// ============================================================
//  CREAR HOJA DEL PRÓXIMO MES
// ============================================================

function crearSiguienteMes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Detectar el mes más reciente entre todas las hojas
  let latestAnio = 0, latestMesIdx = -1;

  for (const sheet of ss.getSheets()) {
    const match = sheet.getName().match(/^([A-Za-z]{3})\s+(\d{4})\s+-/);
    if (!match) continue;
    const mesStr  = match[1];
    const anio    = parseInt(match[2]);
    const mesIdx  = MESES_CORTO.map(m => m.toLowerCase()).indexOf(mesStr.toLowerCase());
    if (mesIdx === -1) continue;

    if (anio > latestAnio || (anio === latestAnio && mesIdx > latestMesIdx)) {
      latestAnio   = anio;
      latestMesIdx = mesIdx;
    }
  }

  if (latestMesIdx === -1) {
    SpreadsheetApp.getUi().alert('No se encontraron hojas con formato de mes (ej: "Jun 2026 - ...").');
    return;
  }

  // Calcular siguiente mes
  let nextMes  = latestMesIdx + 1;
  let nextAnio = latestAnio;
  if (nextMes > 11) { nextMes = 0; nextAnio++; }

  const newName = `${MESES_CORTO[nextMes]} ${nextAnio}${SHEET_SUFFIX}`;

  if (ss.getSheetByName(newName)) {
    SpreadsheetApp.getUi().alert(`La hoja "${newName}" ya existe.`);
    return;
  }

  // Insertar al principio (orden: más nuevo primero)
  const newSheet = ss.insertSheet(newName, 0);

  // Header
  const headerRange = newSheet.getRange(1, 1, 1, SCHEMA_HEADERS.length);
  headerRange.setValues([SCHEMA_HEADERS]);
  aplicarEstiloHeader(headerRange);
  newSheet.setFrozenRows(1);

  // Pre-poblar 60 filas vacías con validaciones y formato
  aplicarValidaciones(newSheet, 60);
  aplicarFormatoDatos(newSheet, 60);
  newSheet.autoResizeColumns(1, SCHEMA_HEADERS.length);

  ss.setActiveSheet(newSheet);
  SpreadsheetApp.getUi().alert(`✅ Hoja "${newName}" creada con el schema actualizado y dropdowns listos.`);
}
