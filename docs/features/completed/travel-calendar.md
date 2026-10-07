# Feature: Calendario de viajes

**Estado:** ✅ COMPLETADA. PR #112 (rama `feature/travel-calendar`). Sin migraciones.

---

## Contexto

Los viajes solo se veían como tabla (`/travels/dashboard`). Hacía falta ver de un vistazo qué
días del mes están ocupados y abrir el resumen de un viaje desde ahí.

## Decisiones

- Página **`/calendar`** (`name: 'calendar'`), en el menú lateral después de **Viajes**.
- **Mes grande sobre `UCalendar`**: celdas altas y cada día muestra los viajes como barras de
  color por estado (mismos colores que los badges de la app). La leyenda va bajo el título de la
  página, visible sin scroll.
- Botón **Filtros** (popover): casillas por estatus (Pendiente, Publicado, En Curso, Completado;
  todos marcados de inicio) y switch **Mostrar cancelados** (apagado de inicio). El botón muestra
  cuántos filtros cambiaron y "Restablecer filtros" vuelve a lo de inicio. La leyenda muestra solo
  los estatus visibles. Si un filtro oculta el viaje elegido, se deselecciona; un link
  `?viaje=` a un viaje oculto activa su estatus.
- Panel derecho: una card con pestañas **Del día** / **Del mes** (con conteo) y, debajo, el
  resumen del viaje elegido. Cada lista muestra **hasta 4 viajes** y el resto con scroll interno,
  para que el resumen (y sus botones) no se empuje fuera de la pantalla; el viaje elegido se
  desplaza a la vista dentro de la lista.
- **Clic en un día**: cambia a la pestaña "Del día"; con un viaje se abre su resumen, con varios
  se elige de la lista, sin viajes muestra "Sin viajes este día".
- La pestaña **Del mes** (la de inicio) lista los viajes del mes visible para elegir uno sin
  buscar el día.
- El viaje elegido vive en **`?viaje=<id>`** (`router.replace`): recargar o compartir el link
  conserva la selección y abre el mes del viaje. Un id que no existe se quita del query.
- **Hoy** vuelve al mes actual y selecciona el día de hoy.
- Dispositivos: desktop y tablet (en tablet el resumen cae debajo del calendario).

## Cómo se dibujan las barras

- Cada viaje tiene un **carril** fijo (`assignTravelLanes`, asignación voraz por fecha de
  salida): un viaje queda a la misma altura todos sus días aunque se traslape con otros.
- Se ven hasta **2 carriles** por día; el resto se resume en **"+N más"** (y aparece completo
  en la lista del día).
- Los extremos redondeados (`getTravelBarShape`) y `-mr-px` sobre el borde de la celda hacen
  que los días seguidos se lean como un solo tramo.
- El nombre va al inicio de cada **tramo** (días seguidos de la misma semana con el viaje en el
  mismo carril) y se extiende sobre todo el tramo (`labelSpans`, calculado en `barsByDay`). Así
  un viaje que entra a un carril libre a media semana también lleva su nombre. Es `pointer-events-none`: el
  clic llega al día que está debajo.
- Las barras son `<span>`: el día de `UCalendar` ya es el elemento clicable (`role="button"`).

## Días festivos

Se calculan **localmente** en `app/utils/mexican-holidays.ts` (sin API ni BD): fechas fijas,
lunes móviles de la Ley Federal del Trabajo (art. 74) y Semana Santa a partir de la Pascua
(algoritmo gregoriano anónimo). Funciona para cualquier año.

| Festivo | Regla | Tipo |
| --- | --- | --- |
| Año Nuevo | 1 ene | oficial |
| Día de la Constitución | 1er lunes de febrero | oficial |
| Natalicio de Benito Juárez | 3er lunes de marzo | oficial |
| Jueves / Viernes Santo | Pascua − 3 / − 2 días | tradicional |
| Día del Trabajo | 1 may | oficial |
| Día de la Independencia | 16 sep | oficial |
| Transmisión del Poder Ejecutivo | 1 oct, solo 2024, 2030, … (cada 6 años) | oficial |
| Día de Muertos | 2 nov | tradicional |
| Revolución Mexicana | 3er lunes de noviembre | oficial |
| Virgen de Guadalupe | 12 dic | tradicional |
| Navidad | 25 dic | oficial |

El día de elecciones también es de descanso por ley, pero no tiene fecha fija: no se incluye.

- En la celda, el **nombre corto** va junto al número: número y nombre en rojo los oficiales,
  gris los tradicionales (atenuados fuera del mes). El nombre completo va en el `title`.
- **Leyenda**: chips "Festivo oficial" y "Tradicional" tras los estatus.
- **Del día**: si el día es festivo, un badge en la fila del título (nombre completo en tooltip).
- **Del mes**: botón "N festivos" en la fila del título que abre la lista del mes. Va en la fila
  del título para no agregar alto y no empujar el resumen.
- **Filtros**: switch "Mostrar días festivos" (encendido de inicio; cuenta como filtro si se apaga).
- Se calculan el año visible y sus vecinos (la cuadrícula de 6 semanas puede tocar otro año).

## Código

| Archivo | Qué hace |
| --- | --- |
| `app/pages/calendar.vue` | Página: estado de la vista (mes, día, pestaña, `?viaje=`, switch) y panel derecho |
| `app/components/travel-calendar.vue` | `UCalendar` con overrides de `ui` y slot `#day` con las barras |
| `app/components/travel-calendar-summary.vue` | Resumen del viaje: fechas, duración, coordinadores, viajeros vs. lugares, links |
| `app/components/travel-calendar-list.vue` | Lista de viajes para elegir (del mes o del día), máx. 4 visibles |
| `app/components/travel-calendar-filters.vue` | Popover de filtros: estatus, cancelados y festivos |
| `app/composables/travels/use-travel-calendar.ts` | Filtro por estatus, carriles e índice `YYYY-MM-DD` → viajes |
| `app/utils/mexican-holidays.ts` | Festivos de México por año (reglas fijas, lunes móviles, Pascua) |
| `app/utils/travel-calendar.ts` | Funciones puras de fechas (`@internationalized/date`) y clases de las barras |

El store de viajes no cambia: es la fuente de verdad, y el estado de la vista es local de la
página. Las fechas de viaje (`YYYY-MM-DD`) se leen con `parseDate`, sin corrimiento de zona
horaria.
