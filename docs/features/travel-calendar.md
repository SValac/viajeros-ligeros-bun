# Feature: Calendario de viajes

**Estado:** 🚧 En desarrollo (rama `feature/travel-calendar`). Sin migraciones.

---

## Contexto

Los viajes solo se veían como tabla (`/travels/dashboard`). Hacía falta ver de un vistazo qué
días del mes están ocupados y abrir el resumen de un viaje desde ahí.

## Decisiones

- Página **`/calendar`** (`name: 'calendar'`), en el menú lateral después de **Viajes**.
- **Mes grande sobre `UCalendar`**: celdas altas y cada día muestra los viajes como barras de
  color por estado (mismos colores que los badges de la app), con leyenda.
- **Cancelados ocultos** por defecto; el switch **Mostrar cancelados** los agrega. Si el viaje
  elegido es cancelado y se apaga el switch, se deselecciona.
- **Clic en un día**: con un viaje se abre su resumen; con varios aparece la lista
  "Viajes del {día}" para elegir; sin viajes, un estado vacío.
- Debajo del calendario, **"Viajes de {mes}"** permite elegir un viaje sin buscar el día.
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
- El nombre va el día de salida y cada domingo (`shouldShowTravelLabel`) y se extiende sobre
  los días siguientes de esa semana (`getTravelLabelSpanDays`). Es `pointer-events-none`: el
  clic llega al día que está debajo.
- Las barras son `<span>`: el día de `UCalendar` ya es el elemento clicable (`role="button"`).

## Código

| Archivo | Qué hace |
| --- | --- |
| `app/pages/calendar.vue` | Página: estado de la vista (mes, día, `?viaje=`, switch) y panel derecho |
| `app/components/travel-calendar.vue` | `UCalendar` con overrides de `ui` y slot `#day` con las barras |
| `app/components/travel-calendar-summary.vue` | Resumen del viaje: fechas, duración, coordinadores, viajeros vs. lugares, links |
| `app/components/travel-calendar-list.vue` | Lista de viajes para elegir (del mes o del día) |
| `app/composables/travels/use-travel-calendar.ts` | Filtro de cancelados, carriles e índice `YYYY-MM-DD` → viajes |
| `app/utils/travel-calendar.ts` | Funciones puras de fechas (`@internationalized/date`) y clases de las barras |

El store de viajes no cambia: es la fuente de verdad, y el estado de la vista es local de la
página. Las fechas de viaje (`YYYY-MM-DD`) se leen con `parseDate`, sin corrimiento de zona
horaria.
