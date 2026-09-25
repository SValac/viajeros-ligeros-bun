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
- **Detalle:** la página anterior `travels/[id]/cotizacion.vue`, movida con `git mv` y
  dividida en pestañas (ver abajo).

## Pestañas del detalle

Todo en una sola pantalla era difícil de recorrer, así que el detalle se dividió en
**rutas anidadas** que se muestran como pestañas. Es el mismo patrón que `/profile`: una
página padre con `UNavigationMenu` y `<NuxtPage />`.

Se eligieron rutas en vez de `UTabs` en una sola página porque así cada sección tiene URL
propia. Se puede enlazar directo, el botón atrás funciona y al recargar sigues en la misma
pestaña. Además, cada archivo queda chico.

| Pestaña | Ruta | Nombre | Contenido |
| --- | --- | --- | --- |
| Resumen | `/quotations/[id]` | `quotation-detail` | Indicadores (`CotizacionResumenFinanciero`) y parámetros (`QuotationParametersCard`, solo en borrador) |
| Servicios | `/quotations/[id]/services` | `quotation-services` | `CotizacionProveedoresSection` |
| Hospedaje | `/quotations/[id]/accommodation` | `quotation-accommodation` | `CotizacionHospedajeSection` + modal para agregar |
| Autobuses | `/quotations/[id]/buses` | `quotation-buses` | `CotizacionBusesSection` + modal para agregar + «Asignación de Autobuses» (`TravelBusesSection` editable) |
| Precios al público | `/quotations/[id]/prices` | `quotation-prices` | `CotizacionPrecioPublicoSection` |

- **Padre (`pages/quotations/[id].vue`):** muestra el encabezado, «Ver viaje», el estado y
  «Confirmar cotización», visibles en todas las pestañas. Sin cotización, muestra el estado
  vacío y el modal para crearla, sin pestañas. Cada pestaña lleva un badge con el número de
  elementos de su sección.
- **Estado compartido:** `composables/quotation/use-quotation-route.ts` devuelve
  `travelId`, `quotation` y `readonly` a partir del param de la ruta. Las pestañas solo se
  renderizan cuando la cotización existe, así que pueden usar `quotation.value!`.
- **Asignación de Autobuses:** operadores y coordinadores por autobús. Antes estaba en el
  detalle y en la edición del viaje. Se oculta mientras la cotización no tenga autobuses, y
  sigue siendo editable con la cotización confirmada.
- Para agregar una pestaña: crear `pages/quotations/[id]/<name>.vue` y agregarla a `tabs`
  en el padre.

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
