# Diseño: selección manual de meses para el Comparativo

## Problema
`updateComparativo()` en [code.gs](../../../code.gs) auto-detecta los dos meses a comparar tomando siempre `months[length-1]` y `months[length-2]` (los últimos dos meses disponibles en el spreadsheet fuente). Si aparece una hoja de un mes nuevo (ej. Julio) antes de que se haya generado el comparativo del mes anterior (ej. Mayo vs Junio), ya no hay forma de generar ese comparativo específico — el auto-detect siempre apunta a los dos más recientes.

## Objetivo
Permitir elegir manualmente qué dos meses comparar, sin perder la comodidad del comportamiento actual para el caso común.

## Diseño

### UI: diálogo HTML desde el menú
- El ítem de menú `↻ Actualizar Comparativo` deja de llamar directo a la generación y en su lugar abre un modal (`HtmlService`) con dos `<select>`:
  - "Mes 1" y "Mes 2", ambos poblados con `getAvailableMonths()`.
  - Preseleccionados con los últimos dos meses detectados (comportamiento actual como default).
- Al confirmar, el diálogo llama a `google.script.run.updateComparativo(m1, m2)` y se cierra.
- Si `m1 === m2`, el diálogo bloquea el envío y muestra un aviso inline (no llega a ejecutarse la generación).

### Backend: función con parámetros opcionales
- `updateComparativo(m1, m2)` acepta ambos parámetros opcionales.
  - Si se llaman explícitamente (desde el diálogo, o manualmente desde el editor de Apps Script), se usan esos dos meses tal cual, en el orden dado.
  - Si se llama sin argumentos (compatibilidad con uso previo desde el editor), conserva el fallback actual: últimos dos meses de `getAvailableMonths()`.
- Se valida `m1 !== m2` también en el backend (defensa en profundidad, no solo en el diálogo).
- El resto de la lógica de generación de la hoja "Comparativo" (headers, filas, formato condicional) no cambia.
- Nueva función `showComparativoDialog()` engachada al menú: arma el HTML del diálogo con los meses disponibles y lo muestra con `ui.showModalDialog`.

### Fuera de alcance
- No se toca `getDashboardData` / el dashboard web (`docs/index.html`) — ese flujo ya acepta `mainMonth`/`cmpMonth` libremente.
- No se cambia el layout de columnas de la hoja "Comparativo".
- No se persiste la última selección entre sesiones (cada vez que se abre el diálogo, se recalculan los últimos dos meses como default).

## Criterios de aceptación
- Al hacer clic en "Actualizar Comparativo" se abre un diálogo con dos desplegables de meses, preseleccionados con los últimos dos disponibles.
- Se puede elegir cualquier combinación de dos meses distintos (ej. Mayo y Junio, aunque ya exista Julio) y generar el comparativo correctamente.
- Elegir el mismo mes en ambos selectores bloquea la generación con un aviso claro.
- Llamar `updateComparativo()` sin argumentos desde el editor de Apps Script sigue funcionando como antes.
