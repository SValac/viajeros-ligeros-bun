# Feature: Proveedores de entradas

**Estado:** ✅ COMPLETADA en la rama `feature/provider-category-tickets`; migración pendiente de push a stage y prod.

---

## Contexto

Las entradas (zoológico, parques, museos…) se registraban como "Otros". Ahora tienen su
propia categoría de proveedor, **Entradas**, con su página en el menú.

## Decisiones

- Valor `tickets` del enum `provider_category`, antes de `other` para que "Otros" siga al
  final.
- Ruta `/providers/tickets` (lista, nuevo y detalle), ícono `i-lucide-ticket`, color rosa.
- Se puede elegir en "Agregar proveedor" de la cotización. Lo normal es cotizarla con
  "Costo por persona", así al proveedor se le paga por quienes la toman.
- Las listas de categorías estaban repetidas en 6 lugares. Ahora el menú, los filtros, los
  chips de filtro, el form de proveedor y el selector de la cotización salen de
  `PROVIDER_CATEGORY_META` (`app/utils/provider-categories.ts`), con `PROVIDER_CATEGORY_LIST`
  y `PROVIDER_CATEGORY_VALUES`. Una categoría nueva solo se agrega ahí, en el enum, en
  `PROVIDER_CATEGORY` y en `statsByCategory`. Por eso algunas etiquetas se unificaron:
  "Transportes" → "Transporte" en el menú y "Hospedaje" → "Hospedajes" en los filtros.

## Base de datos

Migración `20261008160410_provider_category_tickets.sql`:
`ALTER TYPE provider_category ADD VALUE 'tickets' BEFORE 'other'`. Solo agrega, así que es
segura para prod y no necesita orden de despliegue: el CRM anterior no muestra la categoría,
pero tampoco falla. La web solo tiene el enum en sus tipos generados.

## Verificación (local)

- "Entradas" aparece en el menú, en el dashboard de proveedores y en el selector de categoría
  de la cotización.
- Crear "Zoológico de Chapultepec" desde `/providers/tickets/new` lleva a su detalle, y en la
  cotización aparece como "Zoológico de Chapultepec - Ana Ruiz".
- `bun run lint:fix` y `bun run typecheck` limpios.
