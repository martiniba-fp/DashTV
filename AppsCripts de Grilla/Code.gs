// ============================================================
//  ENTRADA PRINCIPAL — menú y triggers automáticos
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎬 DashTV Grilla')
    .addItem('1. Configurar hoja maestra', 'setupMasterSheet')
    .addSeparator()
    .addItem('2. Normalizar todas las hojas', 'normalizarTodasLasHojas')
    .addSeparator()
    .addItem('3. Detectar inconsistencias', 'detectarInconsistencias')
    .addItem('   ↳ Limpiar marcas', 'limpiarMarcas')
    .addSeparator()
    .addItem('4. Crear hoja del próximo mes', 'crearSiguienteMes')
    .addToUi();
}

// Trigger automático: se ejecuta en cada edición de celda.
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (SKIP_SHEETS.includes(sheet.getName())) return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (row < 2) return; // no tocar la fila de headers

  // Programa editado → auto-rellenar Conductor
  if (col === COL.PROGRAMA) {
    const programa = String(e.value || '').trim();
    if (programa in PROGRAMAS_CONDUCTORES) {
      sheet.getRange(row, COL.CONDUCTOR).setValue(PROGRAMAS_CONDUCTORES[programa]);
    }
  }

  // Fecha editada → auto-rellenar Día de la semana
  if (col === COL.FECHA) {
    const fecha = e.range.getValue();
    if (fecha instanceof Date) {
      const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      sheet.getRange(row, COL.DIA).setValue(dias[fecha.getDay()]);
    }
  }
}

// ============================================================
//  CONFIGURAR HOJA MAESTRA
// ============================================================

function setupMasterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let master = ss.getSheetByName(MASTER_SHEET);

  if (!master) {
    master = ss.insertSheet(MASTER_SHEET);
  } else {
    master.clearContents();
  }

  // Headers de referencia
  const headers = ['Programas', 'Conductor', 'Profesionales', 'Editores', 'Tipo Salida', 'Días'];
  master.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#cccccc');

  // Columna A: programas | Columna B: conductores
  const programas   = Object.keys(PROGRAMAS_CONDUCTORES);
  const conductores = Object.values(PROGRAMAS_CONDUCTORES);
  master.getRange(2, 1, programas.length, 1).setValues(programas.map(p => [p]));
  master.getRange(2, 2, conductores.length, 1).setValues(conductores.map(c => [c]));

  // Columna C: profesionales
  master.getRange(2, 3, PROFESIONALES_LIST.length, 1)
    .setValues(PROFESIONALES_LIST.map(p => [p]));

  // Columna D: editores
  master.getRange(2, 4, EDITORES_LIST.length, 1)
    .setValues(EDITORES_LIST.map(e => [e]));

  // Columna E: tipos de salida
  master.getRange(2, 5, TIPOS_SALIDA.length, 1)
    .setValues(TIPOS_SALIDA.map(t => [t]));

  // Columna F: días válidos
  master.getRange(2, 6, DIAS_VALIDOS.length, 1)
    .setValues(DIAS_VALIDOS.map(d => [d]));

  master.autoResizeColumns(1, headers.length);
  master.hideSheet();

  SpreadsheetApp.getUi().alert(
    '✅ Hoja "_MASTER_" configurada y oculta.\n\nPodés ejecutar el paso 2 (Normalizar) cuando quieras.'
  );
}
