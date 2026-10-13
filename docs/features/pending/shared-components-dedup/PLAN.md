# Feature: Componentes y funciones compartidas (quitar código duplicado)

**Objetivo:** Lo que está igual en 2 o más lugares vive en un solo componente, composable o util.
No cambia el comportamiento, salvo los bugs que salieron al comparar las copias (fase 1).

**Complejidad:** Media-alta — ~50 archivos, pero cada fase es independiente y casi todo es de
plantilla.

**Estado:** Pendiente (sin rama todavía).

---

## Contexto

Análisis del 2026-10-13 con `jscpd` sobre `app/` (408 archivos, sin `database.types.ts`):
62 bloques duplicados, ~1,000 líneas (3.25 %). Cada grupo se revisó a mano. Para repetirlo:

```bash
bunx jscpd@4 app --min-lines 6 --min-tokens 50 --ignore "**/database.types.ts" \
  --format "typescript,vue" --reporters console
```

Las copias ya se separaron entre sí sin querer (por ejemplo, solo el historial de bus desactiva
"Registrar" con saldo 0), y en los formularios de pago los `name` de los campos no coinciden con
el esquema. Por eso conviene juntarlas antes de que se separen más.

Sigue el mismo enfoque que `completed/shared-load-states/PLAN.md` (`LoadState` / `EmptyState`).

## Fases

Cada fase = un commit (o varios por tema) en la misma rama `feature/shared-components-dedup`.
Después de cada fase: `bun run lint:fix`, `bun run typecheck` (en una copia del scratchpad si
`nuxt dev` está corriendo) y revisar en el navegador las pantallas afectadas.

### Fase 1 — Formularios de pago a proveedores + fecha de hoy (bugs)

Archivos: `pago-bus-form.vue`, `pago-hospedaje-form.vue`, `pago-proveedor-form.vue`,
`payment-form.vue`, `utils/format-date.ts`.

- **Bug:** el esquema usa `amount`, `paymentDate`, `paymentType`, `concept`, `notes`, pero los
  `UFormField` usan `name="monto"`, `fechaPago`, `tipoPago`, `concepto`, `notas`. Los errores de
  validación no se muestran bajo su campo. Solo coinciden `amount` y `concept` en hospedaje y
  proveedor.
- **Bug:** `new Date().toISOString().split('T')[0]` da la fecha UTC; en México después de las
  6 pm sale la de mañana (mismo tipo de error que `parseDisplayDate`). Está en los 3 formularios
  de pago y en `payment-form.vue:19`.
- Nuevo `todayISO()` en `utils/format-date.ts` (fecha local `YYYY-MM-DD`) y usarlo en los 4.
- Un solo formulario `PagoProveedorForm` (genérico) en lugar de los 3: el esquema, el estado y
  el template son iguales; solo cambia la llave del padre (`quotationBusId`,
  `quotationAccommodationId`, `quotationProviderId`). Opción: prop `parentKey` + `parentId`, o
  que el formulario emita solo los campos del pago y el historial agregue el id del padre
  (preferida: el formulario no necesita saber de qué es el pago).
- `name` de cada `UFormField` = llave del esquema.

### Fase 2 — Historiales de pago

Archivos: `pago-bus-historial.vue`, `pago-hospedaje-historial.vue`,
`pago-proveedor-historial.vue`; usos en `cotizacion-buses-section.vue:301`,
`cotizacion-hospedaje-tabla.vue:366`, `cotizacion-proveedor-tabla.vue:604`.

- ~85 líneas iguales: lista, modal del formulario, modal de borrar y totales. Solo cambian el
  tipo, los getters/acciones del store y el subtítulo.
- Un `PagoHistorial` que reciba un adaptador:
  `{ pagos, anticipado, saldoPendiente, add, update, remove }` + `subtitle`. Los 3 usos arman
  su adaptador (o un composable `usePagoHistorialAdapter(kind, id)` en
  `composables/quotation/`).
- Unificar las diferencias que hoy existen sin razón:
  - "Registrar pago" deshabilitado con saldo 0 (hoy solo en bus) → en los 3.
  - Totales con "Total pagado" y "Saldo pendiente" (hoy solo en bus) → en los 3.
- Revisar que el mensaje de borrar de bus/hospedaje/proveedor siga diciendo lo correcto.

### Fase 3 — `ConfirmDeleteModal`

- Componente con `v-model:open`, `title`, `description`, `loading?`, `confirmLabel?`
  (default "Eliminar"), emite `confirm`.
- Reemplaza el `UModal` + Cancelar/Eliminar copiado en: los historiales (ya juntos tras la
  fase 2), `cotizacion-buses-section`, `cotizacion-gastos-section`,
  `cotizacion-proveedor-tabla`, `travel-service-list`, `travel-activity-list`,
  `bus-list`, `hotel/hotel-rooms-manager`, `cotizacion-hospedaje-tabla`,
  `cotizacion-precio-publico-section`, `pages/travels/[id].vue`,
  `pages/travels/[id]/travelers/index.vue`, `pages/payments/traveler/[id].vue`,
  `pages/coordinators/index.vue`. Inventario final con
  `grep -rln 'label="Cancelar"' app | xargs grep -l UModal`.
- No tocar modales que no son de borrar (`travel-access-code-card`,
  `cotizacion-precio-publico-aviso-modal`, `unsaved-changes-modal`).

### Fase 4 — Páginas de proveedores por categoría

Archivos: `pages/providers/{accommodation,bus-agencies,food-services,guides,other,tickets,transportation}/{new,[id]}.vue` (14).

- Solo cambian ruta, etiqueta y categoría, y eso ya está en `PROVIDER_CATEGORY_META`
  (`utils/provider-categories.ts`). Falta un dato: el título de "Nuevo …" y el género del
  toast ("Proveedor creado" / "Agencia creada" / "Guía creado") → agregar al meta
  `singularLabel` y `createdTitle` (o similar).
- `ProviderCreatePage` (`category`): header con volver, `ProviderForm` con `fixed-categoria`,
  toast y redirección. Slot `extra-fields` (hospedaje: cantidad de habitaciones) y un hook
  `afterCreate(provider)` para `hotelRoomStore.initRoomData` con su toast de advertencia.
- `ProviderDetailPage` (`category`): `LoadState` + breadcrumb + `ProviderDetailCard`, con slot
  `aside` que cambia el layout a 2 columnas (`BusList` en agencias, `HotelRoomsManager` en
  hospedaje).
- Las páginas quedan como `definePageMeta({ name })` + un componente. Los `index.vue` ya usan
  `ProviderCategoryList`; no cambian.

### Fase 5 — `StatCard`

- Renombrar `CotizacionKpiCard` → `StatCard` (`git mv`, ya hace lo mismo: label, icon, value,
  valueClass, slot) y usarla en las tarjetas copiadas a mano de `pages/payments/index.vue` (4),
  `pages/quotations/index.vue` (4), `pages/travels/dashboard.vue` (3),
  `pages/travels/[id]/travelers/index.vue` (3), `pages/travels/[id]/habitaciones/index.vue` (3)
  y `cotizacion-hospedaje-resumen.vue` (3).
- El diseño cambia un poco (ícono junto a la etiqueta en vez de grande a la derecha). Decidir
  en la revisión visual si `StatCard` tiene una variante con ícono a la derecha o si todas
  quedan como la de cotización.

### Fase 6 — Piezas chicas de formularios y tablas

- **`PasswordInput`**: `UInput` con botón de mostrar/ocultar; quita `togglePasswordVisibility`
  de `pages/login.vue` y las 2 copias de `pages/register.vue`. Cada campo con su propio
  `aria-controls` (hoy el de confirmar apunta a `password`).
- **`FormActions`**: Cancelar + enviar (`submitLabel`, `loading`, `@cancel`), en los
  formularios con el bloque `flex justify-end gap-3 pt-4`: `travel-activity-form`,
  `travel-service-form`, `traveler-form`, `provider-form`, `coordinator-form`, `bus-form`
  (y los demás que usen la misma estructura con otro espaciado).
- **`actionsColumn(getActions)`** en `utils/` (o `composables/`): la columna con
  `UDropdownMenu` + botón `i-lucide-more-vertical` armada con `h(...)`, repetida en
  `bus-list`, `provider-category-list`, `cotizacion-hospedaje-tabla`,
  `cotizacion-precio-publico-section`, `travel-payments-panel`, `pages/coordinators/index`,
  `pages/payments/traveler/[id]`, `pages/travels/dashboard`,
  `pages/travels/[id]/travelers/index`.

### Fase 7 — Ajustes que dejó el PR #131 (`code-review` del 2026-10-13)

No es duplicación, pero sale del mismo análisis y toca `LoadState` / `EmptyState`. Se puede
mover a otra tarea si la rama crece mucho.

- Textos de vacío que no corresponden: precios de venta en
  `cotizacion-precio-publico-section.vue` (repite el de referencia, perdió la pista de «Usar
  como plantilla»), `/payments` vacío (no hay viajes publicados, no "no hay pagos"), catálogo de
  cuartos de un hotel (`hotel-rooms-manager`) y unidades de una agencia (`bus-list`) hablan de
  repartir viajeros, y vistas de solo lectura dicen "Agrega…" sin botón. Probable solución:
  entradas nuevas en `EMPTY_STATES` o prop `description` para sobrescribir.
- `LoadState` oculta el error cuando ya hay datos y falla una recarga (antes se mostraba la
  tarjeta de error). Mostrar un aviso (`UAlert` con Reintentar) encima del contenido.
- Detalle `null` (viaje borrado/no existe) → pantalla en blanco mientras redirige en
  `travels/[id]`, `quotations/[id]`, `travel-calendar-summary`.
- `/payments`: totales en $0 al cambiar de página (`placeholderData` cuenta como cargado).
- Dashboard: con stats aún cargando, una agencia sin viajes ve "Sin resultados" antes de
  "Crear viaje".
- Simplificar `useQueryLoadState`: que devuelva los computeds directos (hoy `catalogs.ts` los
  envuelve dos veces) o un helper que devuelva `{ ...query, loadState }` para no repetir las 3
  líneas en ~15 lugares.

## Fuera de alcance (repetido, pero no vale la pena ahora)

- Stores: el bloque `loading = true; error = null; try … catch` se repite ~75 veces (30 en
  `use-cotizacion-store`). Un helper `runAction()` toca todos los stores → tarea aparte.
- `cotizacion-gasto-form` / `cotizacion-proveedor-form`: comparten ~20 líneas de campos
  (descripción, tipo de costo); dependen del contexto.
- `agency-about-page-editor` / `agency-home-page-editor`: barra de plantilla/restaurar (~20
  líneas).

## Verificación

- Fase 1: enviar un pago vacío o mayor al saldo y ver el error bajo el campo; la fecha por
  defecto es la de hoy en hora local (probar después de las 18:00).
- Fases 2-3: registrar, editar y borrar un pago de bus, hospedaje y proveedor en una
  cotización; los totales y el saldo se actualizan.
- Fase 4: crear y abrir un proveedor de cada categoría (hospedaje con habitaciones, agencia con
  unidades).
- Fases 5-6: revisión visual de dashboard, pagos, cotizaciones, viajeros, habitaciones, login y
  registro (desktop y tablet).
- Volver a correr `jscpd`: los grupos de este plan ya no aparecen.
