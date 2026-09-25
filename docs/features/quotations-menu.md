# Feature: Menú de Cotizaciones

**Estado:** 🚧 En desarrollo, rama `feature/quotations-menu`.

---

## Contexto

El detalle del viaje (`/travels/[id]`) mezclaba la información pública del viaje, la que
se muestra en la web, con datos internos de la cotización: el botón «Cotización», los
precios al público y los autobuses. La cotización vivía en `/travels/[id]/cotizacion`.
No quedaba claro qué se publica y qué es solo del CRM.

Ahora la cotización tiene su propio menú en el sidebar, con rutas en inglés.

## Rutas

| Ruta | Archivo | Nombre |
| --- | --- | --- |
| `/quotations` | `app/pages/quotations/index.vue` | `quotations-index` |
| `/quotations/[id]` | `app/pages/quotations/[id].vue` | `quotation-detail` |

`[id]` es el id del **viaje**, igual que en `payments/travel/[id]`. La cotización es 1:1
con el viaje y la página tiene que funcionar antes de que exista (estado «Crear
cotización»).

- **Lista:** todos los viajes con el estado de su cotización (sin cotización, borrador o
  confirmada), el precio por asiento y un acceso para verla o crearla.
- **Detalle:** la página anterior `travels/[id]/cotizacion.vue`, movida con `git mv`. Tiene
  una sección nueva, «Asignación de Autobuses» (`TravelBusesSection` editable), con
  operadores y coordinadores por autobús. Antes esa asignación estaba en el detalle y en la
  edición del viaje.

La ruta vieja `/travels/[id]/cotizacion` se eliminó sin redirect: es un CRM interno y aún
no hay datos reales.

## Qué salió de las páginas de viajes

| Página | Se quitó |
| --- | --- |
| `/travels/dashboard` | Columna «Cotización» y acción «Ver/Crear cotización» |
| `/travels/[id]` | Botón «Cotización» y secciones «Precios al Público» y «Autobuses» |
| `/travels/[id]/edit` | Tarjeta «Autobuses» |

`travel-section-empty-state.vue` se eliminó: solo servía para enlazar a la cotización.

## Fuera de alcance

- Renombrar a inglés los componentes `cotizacion-*.vue` y `use-cotizacion-store`. Queda
  para un refactor aparte.
