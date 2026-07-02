# Plan: informe dinámico desde CSVs en la carpeta data

## Objetivo
Implementar la carga dinámica del informe usando únicamente archivos estáticos en la carpeta [docs/data](docs/data), sin usar Apps Script ni backend.

El flujo será:
1. se dejan los CSVs en [docs/data](docs/data)
2. [docs/index.html](docs/index.html) los lee desde el navegador
3. se transforma la información en un modelo de datos
4. el informe se renderiza automáticamente con esos valores

---

## Estructura de archivos esperada

```text
docs/
  index.html
  data/
    Presupuesto TV - Comparativo.csv
    meta_por_cuenta_30_días_2026-06-29.csv
    meta_por_cuenta_Mes_pasado_2026-06-29.csv
    Metricas Mayo-Junio - enCSV.csv
    config.json
```

> El archivo [docs/data/config.json](docs/data) no existe aún y será el punto de entrada para el mes y el período que se quiere mostrar.

---

## Principios del enfoque

- No usar Apps Script.
- No depender de un servidor de datos.
- El informe seguirá siendo un sitio estático.
- Los CSVs son la fuente de verdad.
- El HTML solo define la estructura visual; los datos se cargan en runtime.
- Si un archivo no existe o viene malformado, el reporte debe mostrar un estado de error claro.

---

## Fase 1 — Preparar la carpeta de datos (≈ 30-60 min)

### 1.1 Confirmar los archivos actuales
Verificar que en [docs/data](docs/data) estén presentes:
- [docs/data/Presupuesto TV - Comparativo.csv](docs/data/Presupuesto%20TV%20-%20Comparativo.csv)
- [docs/data/meta_por_cuenta_30_días_2026-06-29.csv](docs/data/meta_por_cuenta_30_días_2026-06-29.csv)
- [docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv](docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv)
- [docs/data/Metricas Mayo-Junio - enCSV.csv](docs/data/Metricas%20Mayo-Junio%20-%20enCSV.csv)

### 1.2 Crear el archivo de configuración
Agregar [docs/data/config.json](docs/data) con estructura tipo:

```json
{
  "mes": "Junio",
  "anio": 2026,
  "periodo": "01 - 30 Junio 2026",
  "tv_publicados": 0,
  "mesAnterior": "Mayo"
}
```

Este archivo va a definir:
- el mes que se muestra
- el año del informe
- el texto del período
- si el reporte necesita mostrar un número de TV publicados
- el mes anterior para comparar métricas

### 1.3 Definir nombres estables para los CSVs
Aunque los archivos ya están en [docs/data](docs/data), conviene dejar un contrato claro para el loader:
- TV: [docs/data/Presupuesto TV - Comparativo.csv](docs/data/Presupuesto%20TV%20-%20Comparativo.csv)
- Meta actual: [docs/data/meta_por_cuenta_30_días_2026-06-29.csv](docs/data/meta_por_cuenta_30_días_2026-06-29.csv)
- Meta anterior: [docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv](docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv)
- Métricas: [docs/data/Metricas Mayo-Junio - enCSV.csv](docs/data/Metricas%20Mayo-Junio%20-%20enCSV.csv)

Si se quiere simplificar aún más, se pueden crear copias con nombres más simples como `tv.csv`, `meta.csv`, `meta_pasado.csv` y `metricas.csv`, pero no es obligatorio.

---

## Fase 2 — Agregar la carga de datos en el navegador (≈ 1-2 h)

### 2.1 Incorporar PapaParse
En [docs/index.html](docs/index.html), agregar la librería PapaParse desde CDN para parsear CSV en el browser:

```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

### 2.2 Crear un loader de datos
Implementar una función asíncrona que lea todos los archivos desde [docs/data](docs/data):

```javascript
async function loadAllData() {
  const [tvText, metaText, metaPasadoText, metricasText, config] = await Promise.all([
    fetch('./data/Presupuesto TV - Comparativo.csv').then(r => r.text()),
    fetch('./data/meta_por_cuenta_30_días_2026-06-29.csv').then(r => r.text()),
    fetch('./data/meta_por_cuenta_Mes_pasado_2026-06-29.csv').then(r => r.text()),
    fetch('./data/Metricas Mayo-Junio - enCSV.csv').then(r => r.text()),
    fetch('./data/config.json').then(r => r.json())
  ]);

  return buildDataModel(tvText, metaText, metaPasadoText, metricasText, config);
}
```

### 2.3 Manejar la carga localmente
Como esto corre en el navegador, conviene probarlo con un servidor local simple (por ejemplo Live Server o un servidor estático) y no abrirlo directamente con `file://`, porque fetch a archivos locales puede fallar por políticas del navegador.

---

## Fase 3 — Construir el modelo de datos (≈ 2-3 h)

### 3.1 Normalizar los datos de TV
Con [docs/data/Presupuesto TV - Comparativo.csv](docs/data/Presupuesto%20TV%20-%20Comparativo.csv), hacer lo siguiente:
- parsear las filas con PapaParse
- filtrar por el mes y año del config
- quedarse con las filas donde `Tomado` sea `TRUE`
- agrupar por:
  - producto
  - programa
  - profesional
  - fecha
- calcular:
  - total invertido en programa
  - total de apoyo
  - total general
  - cantidad de tomados
  - cantidad editados
  - cantidad de notas vs PNT

### 3.2 Normalizar los datos de Meta current
Con [docs/data/meta_por_cuenta_30_días_2026-06-29.csv](docs/data/meta_por_cuenta_30_días_2026-06-29.csv):
- parsear columnas numéricas
- convertir valores como `1.2M`, `35,3K` o números con coma decimal a formato numérico
- calcular totales generales
- ordenar cuentas por gasto o alcance
- preparar datos para tablas y ranking

### 3.3 Normalizar los datos de Meta previous
Con [docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv](docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv):
- usar la misma normalización que el actual
- calcular diferencias contra el mes actual
- preparar deltas de gasto, alcance, impresiones y clicks

### 3.4 Normalizar las métricas sociales
Con [docs/data/Metricas Mayo-Junio - enCSV.csv](docs/data/Metricas%20Mayo-Junio%20-%20enCSV.csv):
- parsear visualizaciones y cantidad de videos publicados
- normalizar valores con sufijos como `K` o `M`
- agrupar por red social y cuenta
- preparar métricas para tarjetas y gráficos

### 3.5 Construir un solo objeto de salida
La función `buildDataModel(...)` debe devolver un objeto único con la misma estructura que hoy se usa en [docs/index.html](docs/index.html), o una estructura equivalente que luego el render pueda consumir.

Ejemplo conceptual:

```javascript
{
  config,
  tv: {...},
  meta: {...},
  metaPasado: {...},
  metricas: {...}
}
```

---

## Fase 4 — Reemplazar los valores hardcodeados del informe (≈ 2-3 h)

### 4.1 Separar la estructura del render
En [docs/index.html](docs/index.html), dejar el HTML como estructura base y mover todo el contenido dinámico a funciones de render.

### 4.2 Conectar cada bloque del informe
Hay que reemplazar los valores actuales por datos generados a partir del modelo:
- KPIs principales del reporte
- comparativo TV del mes actual vs anterior
- resumen de inversión por producto/programa/profesional
- tablas de cuentas de Meta
- métricas de redes sociales
- gráficos y textos ejecutivos

### 4.3 Mantener el diseño visual igual
El cambio no debería modificar el look and feel del informe; solo debe cambiar la fuente de datos.

---

## Tarea específica de implementación en index.html

Esta tarea cubre el trabajo concreto que hay que hacer directamente sobre [docs/index.html](docs/index.html), sin cambiar la lógica de Apps Script ni introducir backend.

### Objetivo
Hacer que el informe deje de usar los valores estáticos del HTML y pase a construir su contenido desde los CSVs cargados desde [docs/data](docs/data).

### Subtareas

#### 1. Preparar el script de carga
- Agregar la carga de PapaParse en el head o justo antes del cierre del body.
- Crear una función `loadAllData()` que lea:
  - [docs/data/Presupuesto TV - Comparativo.csv](docs/data/Presupuesto%20TV%20-%20Comparativo.csv)
  - [docs/data/meta_por_cuenta_30_días_2026-06-29.csv](docs/data/meta_por_cuenta_30_días_2026-06-29.csv)
  - [docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv](docs/data/meta_por_cuenta_Mes_pasado_2026-06-29.csv)
  - [docs/data/Metricas Mayo-Junio - enCSV.csv](docs/data/Metricas%20Mayo-Junio%20-%20enCSV.csv)
  - [docs/data/config.json](docs/data)
- Llamar a una función `buildDataModel()` que transforme todo en un objeto único listo para renderizar.

#### 2. Reemplazar los datos hardcodeados actuales
En [docs/index.html](docs/index.html) hay bloques de datos definidos manualmente como:
- `PROGRAMAS`
- `PRODUCTOS`
- `PROFESIONALES`
- `PAUTA_INST`
- `PAUTA_PROF`
- `PAUTA_PROD`

Esos valores deben reemplazarse por datos derivados del CSV parseado.

#### 3. Crear funciones auxiliares de normalización
Agregar helpers para:
- convertir números con puntos y comas
- parsear valores tipo `35,3K`, `2.7M`, `1.2M`
- normalizar textos como `TRUE/FALSE`, `NOTA/PNT`, `Mes` y `Periodo`
- formatear moneda y abreviaturas para los KPIs y gráficos

#### 4. Reestructurar el render del informe
Reemplazar la lógica actual que hoy arma los gráficos y tablas con datos fijos por una arquitectura como esta:
- `renderHero(data)`
- `renderKpis(data)`
- `renderCharts(data)`
- `renderRankings(data)`
- `renderTables(data)`

La idea es que cada bloque del informe se construya a partir del objeto `data` generado por el parser.

#### 5. Mantener la misma estructura visual del reporte
No hace falta rediseñar el HTML. La tarea es únicamente cambiar la fuente de datos para que el informe siga viéndose igual, pero se actualice automáticamente cuando cambian los CSVs.

#### 6. Agregar estado de carga y error
- Mostrar un loader mientras se cargan los archivos.
- Si falla alguno de los CSVs, mostrar un mensaje claro en pantalla.
- Si un archivo llega vacío o malformado, no romper el informe: mostrar fallback parcial o valores vacíos.

### Puntos de atención específicos
- El bloque de gráficos de la parte de TV debe derivar del CSV de presupuesto.
- La parte de Meta Ads debe usar los dos CSVs de cuentas actuales y del mes anterior.
- La parte de métricas sociales debe tomar los valores del CSV de métricas.
- Las tablas de ranking y los KPIs deben alimentarse con la misma estructura de datos para evitar duplicar lógica.

### Criterios de aceptación
- [ ] [docs/index.html](docs/index.html) carga los CSVs desde [docs/data](docs/data) sin usar Apps Script.
- [ ] Los KPIs, gráficos y tablas se generan desde datos parseados.
- [ ] Cambiar los CSVs o el archivo de configuración actualiza el informe sin tocar el HTML.
- [ ] El reporte conserva la misma estructura visual.
- [ ] Si falta un archivo, aparece un estado de error claro.

---

## Fase 5 — Manejo de errores y estados de carga (≈ 30-60 min)

### 5.1 Estado de carga
Agregar un loader inicial hasta que todos los CSVs terminen de cargarse.

### 5.2 Estado de error
Si falta alguno de los archivos, mostrar un mensaje tipo:
- “No se pudo cargar uno o más archivos de datos”
- “Verificá que los CSVs estén en la carpeta data”

### 5.3 Fallback simple
Si un CSV viene vacío o con columnas inesperadas, no romper la página; mostrar los datos disponibles y dejar el resto en blanco.

---

## Fase 6 — Validación y pruebas (≈ 1 h)

### 6.1 Probar localmente
- abrir el reporte desde un servidor local
- verificar que se cargan los CSVs
- verificar que los valores del informe coinciden con los archivos

### 6.2 Probar con cambios de mes
- cambiar [docs/data/config.json](docs/data) a otro mes
- cambiar los CSVs de entrada
- verificar que el informe se actualiza sin tocar el HTML

### 6.3 Probar en GitHub Pages
- hacer push a la rama correspondiente
- verificar que el sitio sirve correctamente y que los archivos en [docs/data](docs/data) se cargan desde la web

---

## Workflow mensual una vez implementado

1. Exportar los CSVs desde la fuente original.
2. Guardarlos en [docs/data](docs/data).
3. Actualizar [docs/data/config.json](docs/data) con el mes y el período.
4. Hacer commit y push.
5. El informe se actualiza automáticamente en GitHub Pages.

---

## Entregables

- [docs/index.html](docs/index.html) cargando datos desde CSVs
- [docs/data/config.json](docs/data) para controlar el mes del reporte
- lógica de parsing y transformación de datos dentro del HTML o de un JS externo
- render dinámico del informe sin valores hardcodeados

---

## Estimación total
- Preparación de datos: 30-60 min
- Carga en navegador: 1-2 h
- Transformación del modelo: 2-3 h
- Reemplazo de valores hardcodeados: 2-3 h
- Manejo de errores y validación: 1 h

Total estimado: ~6-10 h
