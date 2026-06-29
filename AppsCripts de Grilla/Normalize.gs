// ============================================================
//  NORMALIZACIÓN DE HOJAS
// ============================================================

function normalizarTodasLasHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => !SKIP_SHEETS.includes(s.getName()));

  let ok = 0, errores = 0;
  const log = [];

  for (const sheet of sheets) {
    try {
      const filas = normalizarHoja(sheet);
      log.push(`✅ "${sheet.getName()}": ${filas} filas`);
      ok++;
    } catch (e) {
      log.push(`❌ "${sheet.getName()}": ${e.message}`);
      errores++;
    }
  }

  Logger.log(log.join('\n'));
  SpreadsheetApp.getUi().alert(
    `Normalización completa.\n\n${log.join('\n')}\n\n✅ OK: ${ok}  ❌ Errores: ${errores}`
  );
}

function normalizarHoja(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return 0;

  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const rawHeaders = allData[0];

  // Mapear cada columna original a su nombre canónico
  const colMap = rawHeaders.map(h => headerToCanonical(h));

  // Índice original de la columna Fecha (para detectar filas válidas)
  const fechaOrigIdx = colMap.indexOf('Fecha');
  if (fechaOrigIdx === -1) throw new Error('No se encontró columna Fecha');

  // Filtrar solo filas con fecha real (descarta encabezados de semana, filas vacías, etc.)
  const dataRows = allData.slice(1).filter(row => isDataRow(row, fechaOrigIdx));
  if (dataRows.length === 0) throw new Error('Sin filas de datos con fecha válida');

  // Reconstruir con el schema canónico.
  // Si dos columnas originales mapean a lo mismo (ej: Crudo + Enlace Drive → CRUDO),
  // se usa el primer valor no vacío.
  const newData = dataRows.map(row => {
    const newRow = new Array(SCHEMA_HEADERS.length).fill('');
    for (let i = 0; i < colMap.length; i++) {
      const canonical = colMap[i];
      if (!canonical) continue;
      const schemaIdx = SCHEMA_HEADERS.indexOf(canonical);
      if (schemaIdx === -1) continue;
      if (newRow[schemaIdx] !== '') continue; // ya tiene valor (primera columna gana)

      const val = row[i];
      if (val === null || val === undefined || val === '') continue;

      // Normalizar tipo de salida a minúsculas
      if (canonical === 'Nota o PNT') {
        newRow[schemaIdx] = normalizeStr(val) === 'pnt' ? 'pnt' : 'nota';
      } else {
        newRow[schemaIdx] = val;
      }
    }
    return newRow;
  });

  // Limpiar hoja completamente
  sheet.clear();

  // Header
  const headerRange = sheet.getRange(1, 1, 1, SCHEMA_HEADERS.length);
  headerRange.setValues([SCHEMA_HEADERS]);
  aplicarEstiloHeader(headerRange);
  sheet.setFrozenRows(1);

  // Datos
  if (newData.length > 0) {
    sheet.getRange(2, 1, newData.length, SCHEMA_HEADERS.length).setValues(newData);
  }

  // Formato y validaciones
  aplicarValidaciones(sheet, newData.length);
  aplicarFormatoDatos(sheet, newData.length);
  sheet.autoResizeColumns(1, SCHEMA_HEADERS.length);

  Logger.log(`"${sheet.getName()}" normalizada: ${newData.length} filas`);
  return newData.length;
}
