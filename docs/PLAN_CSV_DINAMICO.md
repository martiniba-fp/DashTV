# Plan: Informe Automático desde CSV

## Objetivo
El informe se actualiza tirando los CSVs a la carpeta `docs/data/` y haciendo `git push`.
Sin tocar código.

---

## Estructura de archivos

```
docs/
  index.html          ← el informe (no cambia entre meses)
  data/
    tv.csv            ← Presupuesto TV - Comparativo.csv (renombrado)
    meta.csv          ← meta_por_cuenta_30_días_YYYY-MM-DD.csv (renombrado)
    metricas.csv      ← Metricas Mayo-Junio - enCSV.csv (renombrado)
    config.json       ← mes, año, tv_publicados (editar a mano cada mes)
```

---

## Tareas de implementación

### Fase 1 — Preparar los CSV (≈ 1h)

**1.1 Estandarizar headers de tv.csv**
- Asegurar que columnas sean: `Mes,Fecha,Producto,Profesional,Programa,Conductor,Editado,Tomado,Tipo,Salida Real,Valor Programa,Valor Apoyo,Total`
- El campo `Total` ya existe en el Comparativo — usarlo directamente.
- Filtrar en JS: `Mes.includes(mes + ' ' + año)` y `Tomado === 'TRUE'`

**1.2 Estandarizar headers de meta.csv**
- Columnas: `Cuenta,Handle,Categoria,Gasto_ARS,Alcance,Impresiones,Clicks,CTR (%),CPC ($),CPM ($),N_Campanas`
- Los valores de `Gasto_ARS` ya son float sin formato — parsear con `parseFloat()`

**1.3 Estandarizar headers de metricas.csv**
- Columnas: `Red Social,Cuenta,Visualizaciones,Cantidad de videos publicados,Mes anterior`

**1.4 Crear config.json**
```json
{
  "mes": "Julio",
  "año": 2026,
  "periodo": "01 – 31 Julio 2026",
  "tv_publicados": 0
}
```

---

### Fase 2 — Refactorizar index.html (≈ 3-4h)

**2.1 Agregar PapaParse CDN** (parseo de CSV en el browser)
```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
```

**2.2 Reemplazar `const DATA = {...}` por función async**
```javascript
async function loadData() {
  const [tv, meta, met, cfg] = await Promise.all([
    fetch('./data/tv.csv').then(r=>r.text()),
    fetch('./data/meta.csv').then(r=>r.text()),
    fetch('./data/metricas.csv').then(r=>r.text()),
    fetch('./data/config.json').then(r=>r.json()),
  ]);
  return buildDATA(tv, meta, met, cfg);
}
```

**2.3 Implementar `buildDATA(tv, meta, met, cfg)`**
- Parsear TV con Papa.parse, filtrar `Mes` y `Tomado=TRUE`
- Agregar por programa, producto, profesional
- Parsear Meta, agregar totales
- Parsear métricas, sumar videos por plataforma
- Devolver el mismo objeto `DATA` que hoy está hardcodeado

**2.4 Agregar loading state**
```html
<div id="loader">Cargando datos...</div>
```
Remover cuando `loadData()` resuelva.

**2.5 Mover `initCharts()` y renderizado dinámico** al callback de `loadData()`
- Todo lo que hoy está al final del `<script>` va dentro de un `.then(data => { ... })`

---

### Fase 3 — GitHub Actions (opcional, ≈ 1h)

Crear `.github/workflows/deploy.yml` para auto-deploy al hacer push:

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
    paths: ['docs/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: docs }
      - uses: actions/deploy-pages@v4
```

---

## Workflow mensual (cuando esté implementado)

```
1. Exportar CSVs del sistema
2. Renombrar:
   - Presupuesto TV - Comparativo.csv  →  docs/data/tv.csv
   - meta_por_cuenta_*.csv             →  docs/data/meta.csv
   - Metricas *.csv                    →  docs/data/metricas.csv
3. Editar docs/data/config.json (mes, año)
4. git add docs/data/ && git commit -m "Datos Julio 2026" && git push
5. El informe se actualiza solo en GitHub Pages
```

---

## Estimación total
- Fase 1: 1h
- Fase 2: 3-4h
- Fase 3: 1h (opcional)
- **Total: ~5h de trabajo**
