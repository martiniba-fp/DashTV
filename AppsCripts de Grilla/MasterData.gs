// ============================================================
//  MASTER DATA — fuente de verdad para validaciones y listas
// ============================================================

const SCHEMA_HEADERS = [
  'Hora', 'Día', 'Fecha', 'Producto', 'Profesional',
  'Programa', 'Conductor', '¿Quien la edita?', 'Grabado',
  'Nota o PNT', 'Impacto', 'CRUDO SALIDAS PROFESIONALES'
];

// Índices de columna (1-based, para getRange)
const COL = {
  HORA: 1, DIA: 2, FECHA: 3, PRODUCTO: 4, PROFESIONAL: 5,
  PROGRAMA: 6, CONDUCTOR: 7, EDITOR: 8, GRABADO: 9,
  TIPO: 10, IMPACTO: 11, CRUDO: 12
};

// Programa → conductor fijo. String vacío = sin conductor definido.
const PROGRAMAS_CONDUCTORES = {
  'TL 9 al Amanecer':             '',
  'TL 9 al Mediodia':             '',
  'Todo Cocinado':                'Rocío Marengo',
  'La mañana de Moria':           'Moria Casan',
  'SQP':                          'Yanina Latorre',
  'DDM':                          'Mariana Fabbiani',
  'Con Carmen':                   'Carmen Barbieri',
  'La Cocina Rebelde':            'Jimena Monteverde',
  'LAM':                          'Angel de Brito',
  'Nara que ver':                 'Nara Ferragut',
  'BTV':                          'Beto Casella',
  'Los profesionales con Flor':   'Florencia de la V',
  'Los profesionales de Siempre': 'Florencia de la V',
  'Implacables':                  'Susana Roccasalvo',
  'Que mañana!':                  'Julian Weich',
  'Las mañanas con Andino':       'Guillermo Andino',
  'deconstruidos':                '',
  'Mediodía bien arriba':         'Carlos Monti',
  'Desayuno Americano':           'Pamela David',
  'Lape Club Social':             'Sergio Lapegüe',
  'Estamos en una':               '',
  'EL ANTI 9':                    '',
  'ADN Buena Salud':              ''
};

const PROFESIONALES_LIST = [
  'Andrea Purita', 'Gabriel Lapman', 'Mariana Kersz',
  'Evangelina Cueto', 'Denis Dumas', 'Micaela Olivares',
  'Karina Ramírez', 'Delfina Zimerman', 'Paula Trapani',
  'Angel de Brito'
];

const EDITORES_LIST    = ['Lukas', 'Juli', 'No subieron a YT'];
const TIPOS_SALIDA     = ['nota', 'pnt'];
const DIAS_VALIDOS     = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES_CORTO      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const SHEET_SUFFIX     = ' - Grilla Sheila Progra';
const MASTER_SHEET     = '_MASTER_';
const SKIP_SHEETS      = [MASTER_SHEET, 'Grilla de TV ', 'Grilla de TV'];

// Nombre de columna original → nombre canónico del schema.
// null = columna a descartar.
const COLUMN_ALIASES = {
  'Horario':                          'Hora',
  'q':                                'Hora',
  'Hora':                             'Hora',
  'Día':                              'Día',
  'Dia':                              'Día',
  'Día ':                             'Día',
  'Día':                         'Día',
  'Fecha':                            'Fecha',
  'Producto':                         'Producto',
  'Producto ':                        'Producto',
  'Profesional':                      'Profesional',
  'Programa':                         'Programa',
  'Conductor':                        'Conductor',
  '¿Quien la edita?':                 '¿Quien la edita?',
  '¿Quien la edita? ':                '¿Quien la edita?',
  'Observaciones | ¿Quien lo hizo?':  '¿Quien la edita?',
  'Observaciones':                    '¿Quien la edita?',
  'Grabado':                          'Grabado',
  'Nota o PNT':                       'Nota o PNT',
  'Nota o PNT ':                      'Nota o PNT',
  'Notas':                            'Nota o PNT',
  'Impacto':                          'Impacto',
  'CRUDO SALIDAS PROFESIONALES':      'CRUDO SALIDAS PROFESIONALES',
  'CRUDO SALIDAS PROFESIONALES ':     'CRUDO SALIDAS PROFESIONALES',
  'CRUDO SALIDAS PROFESIONALES  ':    'CRUDO SALIDAS PROFESIONALES',
  'Crudo':                            'CRUDO SALIDAS PROFESIONALES',
  'Resultado Final':                  'CRUDO SALIDAS PROFESIONALES',
  'Enlace Drive':                     'CRUDO SALIDAS PROFESIONALES',
  // Columnas a descartar
  'Salidas TV para subir':            null,
  'Salidas TV para subir 2':          null,
  'ReVersiones':                      null,
  'PORTADAS DE VIDEOS':               null,
};
