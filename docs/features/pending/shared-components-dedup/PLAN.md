# Feature: Componentes y funciones compartidas (quitar código duplicado)

**Objetivo:** Lo que está igual en 2 o más lugares vive en un solo componente, composable o util.
No cambia el comportamiento, salvo los bugs que salieron al comparar las copias (fase 1).

**Complejidad:** Muy alta — casi todo `app/`. Las fases 1-7 y 14-17 son de UI; las 8-13
tocan stores y repositorios (la 10 cambia el contrato de errores). Cada fase es independiente.
Partir en varios PR: (a) bugs sueltos de las tres pasadas, (b) pagos de punta a punta
(1, 2, 8), (c) utils y composables (14, 15), (d) componentes (3-6, 16, 17), (e) datos
(9-13). La 7 puede ir sola.

**Status:** In progress. PR (b) (phases 1, 2, 8) merged as #137, PR (a) (loose bugs) as #138.
PR (c) on branch `feature/shared-components-dedup-utils`: phases 14 and 15 done, ready for
review. Then (d), phase 7, (e).

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

**Dónde va cada componente nuevo** (convención de `docs/claude/04-code-style.md`, ver
`completed/components-by-domain/PLAN.md`): nombre en inglés, también props y emits; el archivo
lleva el nombre completo con el prefijo de su carpeta.
- Raíz (globales): `ConfirmDeleteModal` (`confirm-delete-modal.vue`), `StatCard`,
  `PasswordInput`, `FormActions`, `PageHeader`, `ImageUpload`.
- `quotation/`: `QuotationPaymentForm` y `QuotationPaymentHistory`
  (`quotation/quotation-payment-form.vue`, `quotation/quotation-payment-history.vue`); al
  juntarlos se borran los 6 `quotation-{accommodation,bus,provider}-payment-{form,history}.vue`
  de las subcarpetas.
- `provider/`: `ProviderCreatePage`, `ProviderDetailPage` (`provider/provider-create-page.vue`…).
- `agency/page/`: `AgencyPageForm` (`agency/page/agency-page-form.vue`).
- Tras crear o mover, revisar `.nuxt/components.d.ts` (ningún nombre con un segmento repetido).
Después de cada fase: `bun run lint:fix`, `bun run typecheck` (en una copia del scratchpad si
`nuxt dev` está corriendo) y revisar en el navegador las pantallas afectadas.

### Fase 1 — Formularios de pago a proveedores + fecha de hoy (bugs) ✅

**Done (2026-10-13):** `todayISO()` in `utils/format-date.ts`; one `QuotationPaymentForm`
that emits only `SupplierPaymentFields` (new type in `types/quotation.ts`); each history adds
its parent id.

Archivos: `quotation-bus-payment-form.vue`, `quotation-accommodation-payment-form.vue`, `quotation-provider-payment-form.vue`,
`payment-form.vue`, `utils/format-date.ts`.

- ~~**Bug:** los `name` de los `UFormField` no coincidían con las llaves del esquema~~ — ya
  corregido en la rama `refactor/english-identifiers` (nombres de campos en inglés).
- **Bug:** `new Date().toISOString().split('T')[0]` da la fecha UTC; en México después de las
  6 pm sale la de mañana (mismo tipo de error que `parseDisplayDate`). Está en los 3 formularios
  de pago y en `payment-form.vue:19`.
- Nuevo `todayISO()` en `utils/format-date.ts` (fecha local `YYYY-MM-DD`) y usarlo en los 4.
- Un solo formulario `QuotationPaymentForm` (genérico) en lugar de los 3: el esquema, el estado y
  el template son iguales; solo cambia la llave del padre (`quotationBusId`,
  `quotationAccommodationId`, `quotationProviderId`). Opción: prop `parentKey` + `parentId`, o
  que el formulario emita solo los campos del pago y el historial agregue el id del padre
  (preferida: el formulario no necesita saber de qué es el pago).
- `name` de cada `UFormField` = llave del esquema (mantenerlo al juntar los 3).

### Fase 2 — Historiales de pago ✅

**Done (2026-10-13):** one `QuotationPaymentHistory` (`kind`, `parentId`, `subtitle`) on
`useSupplierPayments(kind, parentId)` in `composables/quotation/`, which maps each kind to the
store getters and actions; new `SupplierPayment` type. "Registrar pago" is disabled at zero
balance in the three; generic form modal description and the longer delete text. Correction:
the three already showed "Total pagado" and "Saldo pendiente", only the layout differed.
Also in this PR: the four native `<table>` (payment history, buses, expenses, providers) now
use `UTable` with `h()` cells like the rest of the app (see phase 16).

Archivos: `quotation-bus-payment-history.vue`, `quotation-accommodation-payment-history.vue`,
`quotation-provider-payment-history.vue`; usos en `quotation-bus-section.vue:301`,
`quotation-accommodation-table.vue:366`, `quotation-provider-table.vue:604`.

- ~85 líneas iguales: lista, modal del formulario, modal de borrar y totales. Solo cambian el
  tipo, los getters/acciones del store y el subtítulo (hoy props `providerName`, `hotelName`,
  `busLabel` → un solo `subtitle`).
- Un `QuotationPaymentHistory` que reciba un adaptador:
  `{ payments, paid, pendingBalance, add, update, remove }` + `subtitle`. Los 3 usos arman
  su adaptador (o un composable `useQuotationPaymentHistoryAdapter(kind, id)` en
  `composables/quotation/`).
- Unificar las diferencias que hoy existen sin razón:
  - "Registrar pago" deshabilitado con saldo 0 (hoy solo en bus) → en los 3.
  - Totales con "Total pagado" y "Saldo pendiente" (hoy solo en bus) → en los 3.
- Revisar que el mensaje de borrar de bus/hospedaje/proveedor siga diciendo lo correcto.

### Fase 3 — `ConfirmDeleteModal`

- Componente con `v-model:open`, `title`, `description`, `loading?`, `confirmLabel?`
  (default "Eliminar"), emite `confirm`.
- Reemplaza el `UModal` + Cancelar/Eliminar copiado en: los historiales (ya juntos tras la
  fase 2), `quotation-bus-section`, `quotation-expense-section`,
  `quotation-provider-table`, `travel-service-list`, `travel-activity-list`,
  `bus-list`, `hotel/hotel-rooms-manager`, `quotation-accommodation-table`,
  `quotation-public-price-section`, `pages/travels/[id].vue`,
  `pages/travels/[id]/travelers/index.vue`, `pages/payments/traveler/[id].vue`,
  `pages/coordinators/index.vue`. Inventario final con
  `grep -rln 'label="Cancelar"' app | xargs grep -l UModal`.
- No tocar modales que no son de borrar (`travel-access-code-card`,
  `quotation-public-price-warning-modal`, `unsaved-changes-modal`).
- Además hay 9 borrados con el `confirm()` nativo del navegador (`bus-list`,
  `travel-activity-list`, `coordinator-invite-button`, `provider-detail-card`,
  `payments/traveler/[id]`, `hotel/hotel-rooms-manager`, `coordinators/index`,
  `travels/[id]/travelers/index`, `travels/dashboard`): dos formas distintas de pedir lo mismo.
  Pasarlos al mismo modal. Con `useOverlay` de Nuxt UI se puede abrir desde una función
  (`await confirmDelete({ title, description })`), que reemplaza al `confirm()` sin cambiar el
  flujo de cada handler.

### Fase 4 — Páginas de proveedores por categoría

Archivos: `pages/providers/{accommodation,bus-agencies,food-services,guides,other,tickets,transportation}/{new,[id]}.vue` (14).

- Solo cambian ruta, etiqueta y categoría, y eso ya está en `PROVIDER_CATEGORY_META`
  (`utils/provider-categories.ts`). Falta un dato: el título de "Nuevo …" y el género del
  toast ("Proveedor creado" / "Agencia creada" / "Guía creado") → agregar al meta
  `singularLabel` y `createdTitle` (o similar).
- `ProviderCreatePage` (`category`): header con volver, `ProviderForm` con `fixed-category`,
  toast y redirección. Slot `extra-fields` (hospedaje: cantidad de habitaciones) y un hook
  `afterCreate(provider)` para `hotelRoomStore.initRoomData` con su toast de advertencia.
- `ProviderDetailPage` (`category`): `LoadState` + breadcrumb + `ProviderDetailCard`, con slot
  `aside` que cambia el layout a 2 columnas (`BusList` en agencias, `HotelRoomsManager` en
  hospedaje).
- Las páginas quedan como `definePageMeta({ name })` + un componente. Los `index.vue` ya usan
  `ProviderCategoryList`; no cambian.

### Fase 5 — `StatCard`

- Mover `quotation/quotation-kpi-card.vue` → `stat-card.vue` en la raíz (`StatCard`, global porque
  se usa en toda la app; `git mv`, ya hace lo mismo: label, icon, value,
  valueClass, slot) y usarla en las tarjetas copiadas a mano de `pages/payments/index.vue` (4),
  `pages/quotations/index.vue` (4), `pages/travels/dashboard.vue` (3),
  `pages/travels/[id]/travelers/index.vue` (3), `pages/travels/[id]/rooms/index.vue` (3)
  y `quotation-accommodation-summary.vue` (3).
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
  `bus-list`, `provider-category-list`, `quotation-accommodation-table`,
  `quotation-public-price-section`, `travel-payments-panel`, `pages/coordinators/index`,
  `pages/payments/traveler/[id]`, `pages/travels/dashboard`,
  `pages/travels/[id]/travelers/index`.

### Fase 7 — Ajustes que dejó el PR #131 (`code-review` del 2026-10-13)

No es duplicación, pero sale del mismo análisis y toca `LoadState` / `EmptyState`. Se puede
mover a otra tarea si la rama crece mucho.

- Textos de vacío que no corresponden: precios de venta en
  `quotation-public-price-section.vue` (repite el de referencia, perdió la pista de «Usar
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

## Segunda pasada: stores, repositorios, mappers y dominio (2026-10-13)

`jscpd` casi no ve duplicados en esta capa porque las copias cambian nombres (bus / hospedaje /
proveedor). Se leyeron a mano todos los stores, los repositorios, `utils/mappers.ts`, los
`*-domain.ts` y `queries/`. Las fases 8-13 salen de esa lectura. La 8 conviene hacerla junto con
la 1 y la 2 (son los mismos pagos, de la UI a la base de datos).

### Fase 8 — Pagos de cotización en store, repositorio y mappers ✅

Bus, hospedaje y proveedor tienen el mismo pago (`amount`, `paymentDate`, `paymentType`,
`concept`, `notes`); solo cambia la llave del padre.

- `use-quotation-store.ts`: 5 getters × 3 (`getPaymentsByX` ordenado, `getPaidByX`,
  `getPendingBalanceByX`, `getXPaymentStatus`, `getTotalPendingBalanceX`) y 3 acciones × 3
  (`add/update/delete…Payment`, con la misma validación de monto y saldo) → una función interna
  que los arme por tipo (`_paymentSlice(payments, items, parentKey, cost)`), sin cambiar los
  nombres que exporta el store (los usan las pantallas).
- Diferencias sin razón que se unifican al juntarlas:
  - `getPendingBalanceByProvider` usa `Math.max(0, …)`; los de bus y hospedaje pueden dar
    negativo (y ese negativo llega como `maxAmount` al formulario).
  - Bus usa `bus.totalCost ?? 0` en el estado y `bus.totalCost` en el saldo.
- `use-quotation-repository.ts`: `insert/update/delete…Payment` × 3, el `update` con los mismos
  5 `if` → una función por tabla (`'provider_payments' | 'accommodation_payments' | 'bus_payments'`).
- `utils/mappers.ts`: `map…PaymentRowToDomain` y `map…PaymentToInsert` × 3 → los campos comunes
  en un helper (`mapSupplierPaymentFields`) + la llave del padre. Tipos: un
  `SupplierPayment` base en `types/quotation.ts` del que salen los 3.
- `getPaymentStatus` (`payments/use-payments-domain.ts`) y `calculatePaymentStatus`
  (`quotation/use-quotation-domain.ts`) son la misma función → dejar una (en `utils/` o en el
  dominio de pagos) y que la otra la importe.
- **Added (2026-10-13):** `useSupplierPaymentColumns(kind)` in `composables/quotation/`: the
  paid / pending (+ overpaid) / payment status columns that the bus, accommodation and provider
  tables repeat. The generic column helpers (`actionsColumn`, badges) stay in phases 6 and 14,
  in the components PR (d).

**Implementation steps (agreed 2026-10-13, one commit each, mentor mode):**
- 8.0 Before starting, write down paid / pending / status per row and the 3 pending totals of
  the financial summary for a quotation with bus, accommodation and provider payments.
- 8.1 `utils/payment-status.ts` with `getPaymentStatus(paid, total)` replaces both functions;
  the 3 `…PaymentStatus` types become `PaymentStatus`; `BusPayment` etc. are
  `SupplierPayment & { quotationBusId }`.
- 8.2 Mappers: `mapSupplierPaymentRowFields`, `mapSupplierPaymentFieldsToRow`,
  `mapSupplierPaymentToUpdate` (the 5 `if`s). One `Pick<Tables<'bus_payments'>, …>` fits the
  3 tables without `any`.
- 8.3 Repository uses `mapSupplierPaymentToUpdate`; insert/update/delete stay one per table
  (a union table name breaks the Supabase types).
- 8.4 Store: internal `createSupplierPaymentSlice({ payments, items, parentIdOf, costOf,
  notFound, insert, update, remove })`; exported names don't change. `parentIdOf` function
  instead of `keyof`. `Math.max(0, …)` and `getOverpayment` for the 3 (the only number that
  may change vs 8.0). Keep today's error contract (phase 10). `replaceForParents(parentIds,
  fetched)` fixes the `hydrateTravel(null)` payments bug of phase 9.
- 8.5 `useSupplierPaymentApi(kind)` split out of `useSupplierPayments` (+ `overpayment`,
  `status`); `useSupplierPaymentColumns(kind)` (Pagado, Pendiente + "Pagado de más", Estado
  Pago) used by the 3 tables; "Anticipo" is `info` in the 3. Método and Confirmado stay in
  phase 14.

**Done (2026-10-14).** Notes from the implementation:
- Before 8.2, `utils/mappers.ts` (800 lines) was split into `utils/mappers/<domain>-mappers.ts`,
  auto-imported through `imports.dirs: ['utils/mappers']` in `nuxt.config.ts`. Supplier payment
  mappers live in `supplier-payment-mappers.ts`.
- 8.0 → 8.4 numbers on the local seed quotation: the overpaid hotel went from -$600 pending to
  $0, and "Por pagar a proveedores" from $34,199 to $34,799. Nothing else changed.
- `useSupplierPaymentColumns` returns three columns, not an array: provider and bus have
  "Método" between Pendiente and Estado Pago.
- A `.ts` file can't use `resolveComponent('UBadge')` (Nuxt only rewrites it in `.vue` files);
  import it from `#components`.
- Found while testing: the accommodation row actions button had no `aria-label` (fixed).

### Fase 9 — Repetición interna de `use-quotation-store`

Sin cambiar lo que exporta el store:

- `_runWrite(fn)`: `loading`, `error`, `catch` y el `invalidateQueries(quotationKeys.root)` del
  `finally` se repiten en ~25 acciones.
- `_editableQuotation(id)`: "buscar la cotización y rechazar si está confirmada" se repite ~12
  veces con el mismo mensaje.
- `toggleProviderConfirmed` / `toggleAccommodationConfirmed`: iguales.
- `refreshProviderPayableCosts` / `refreshAccommodationCosts`: misma forma (leer costos y mezclarlos
  por id).
- Sumas por reparto: `getProvidersMinimumSplitCost/Total`, `getBusesMinimumSplitCost/Total`,
  `getExpensesMinimumSplit/Total` → un `sumBySplit(items, splitType)`; `(splitType ?? 'minimum')`
  queda en un solo lugar.
- `getBusCostPerPerson` reimplementa `getCostDivisor` → usarlo.
- `quotations.value.find(c => c.id === id)` aparece ~20 veces → `_quotation(id)`.
- **Bug menor:** en `hydrateTravel` con `result === null`, los pagos se filtran después de
  quitar sus padres, así que la condición nunca se cumple y los pagos de la cotización borrada
  se quedan en el store. Tampoco limpia `providerPriceAdjustments`. Hoy no se ve porque nadie
  los lee sin su padre. **Payments fixed in phase 8 (2026-10-14); `providerPriceAdjustments`
  fixed in PR (a) (2026-10-14).**
- **Open bug (found in PR (a)):** on the non-null path, `providerPriceAdjustments` is replaced
  by filtering on the *fetched* providers, so the adjustments of a provider that no longer
  comes back from the server stay in the store. Filter by the quotation's previous provider ids
  instead.

### Fase 10 — Contrato de errores de los stores (`toErrorMessage` + regla de `standardize-store-error-handling`)

`completed/standardize-store-error-handling.md` fijó la regla: nunca `Promise<boolean>`, el
`catch` siempre relanza. Hoy no se cumple:

- Devuelven `boolean`: `use-bus-store` (update, delete, toggle), `use-provider-store` (update,
  delete, toggle), `use-hotel-room-store` (updateTotalRooms, updateRoomType, deleteRoomType),
  `use-travel-store` (update, delete, updateTravelBus, updateTravelAccommodation, addTravelRooms,
  deleteTravelRoom), `use-agency-profile-store` (los 4 `save*` y las imágenes).
- Tragan el error (`void` sin relanzar): `deleteTraveler`, `deleteCoordinator`,
  `deletePayment`, `setAccountConfig`, `fetchByTravels`, y casi todas las de
  `use-quotation-store` (que además mezcla `undefined`, `{ error }` y `string | null`).
- `e instanceof Error ? e.message : '…'` está 85 veces → `toErrorMessage(e, fallback)` en
  `utils/`.
- Decidir al empezar: aplicar la regla tal cual (cambia a todos los que llaman, hay que
  revisarlos uno por uno) o actualizar la regla al estilo que ya domina (`{ error }`). Es la fase
  con más riesgo; va en commits por store y con prueba en el navegador de cada pantalla que
  llama.

### Fase 11 — Repositorios: helpers de Supabase

- `delete().eq('id', id)` + `if (error) throw` está ~15 veces (bus, provider, coordinator,
  traveler, payments, hotel room types, quotation ×8, travel media). Solo `removeTravel` y
  `removeFromRoom` usan `.select().single()`, que convierte un borrado bloqueado por RLS (0
  filas, sin error) en error; los demás fallan en silencio (mismo problema que el bug de
  "revoke coordinator"). → `deleteById(table, id)` que siempre lo detecta.
- `insert(…).select().single()` + `throw` + map, y lo mismo con `update`, se repiten en todos
  los repositorios → `insertOne` / `updateOne` (opcional, si el tipado de Supabase lo permite
  sin `any`).
- `use-travel-repository.ts`: `removeActivities/Services/Buses/Accommodations` (iguales salvo
  la tabla) y `replaceActivities/Services/Buses/Accommodations` (iguales salvo las funciones) →
  `deleteByTravel(table, travelId)` y un `replaceChildren`.
- Los repositorios de catálogo (`bus`, `provider`, `coordinator`) tienen la misma forma
  `fetchAll / insert / update / remove`; con los helpers de arriba quedan cortos. No hace falta
  una fábrica genérica.

### Fase 12 — Storage y perfil de agencia

- Subir archivo + `getPublicUrl` está 3 veces (`use-travel-media-repository` `upload` y
  `uploadBanner`, `use-agency-profile-repository` `uploadImage`); borrar un archivo 3 veces
  (`remove`, `removeFile`, `removeImage`); la extensión con `file.name.split('.').pop()` 2 veces.
  → `utils/storage.ts` (`uploadPublicFile(bucket, path, file)`, `removeStorageFile`).
- `getGalleryStoragePath` (travel domain) y `getSiteImageStoragePath` (agency domain) son la
  misma función con otro bucket → `storagePathFromPublicUrl(url, bucket)`.
- `use-agency-profile-store.ts`: `saveProfile`, `saveAboutPage`, `saveHomePage`, `saveSeo` son
  iguales salvo el `update` y el mensaje → un `_save(update, message)`.

### Fase 13 — Piezas chicas de datos

- Orden de pagos por fecha descendente: 4 veces (`use-payment-store` y 3 en cotización) →
  `sortByDateDesc`.
- "Reemplazar la parte de la lista que pertenece a X": `use-payment-store`
  (`fetchByTravels`, `fetchByTraveler`) y `hydrateTravel` → `replaceWhere(list, belongs, items)`.
- `costPerPerson: d.price_per_night / d.max_occupancy` 2 veces en `use-quotation-repository`
  → `calculateCostPerPerson` (ya existe en `utils/hotel-room-helpers.ts`), mejor dentro de
  `mapQuotationAccommodationDetailRowToDomain`.
- `use-hotel-room-repository`: `insertRoomType` y `updateRoomType` mapean los mismos 6 campos
  → mapper.
- `use-provider-repository.update` copia los campos de ubicación y contacto de
  `mapProviderToInsert` → reutilizar el mapper.
- `use-travel-repository`: los `insert` de services, buses y accommodations mapean en línea →
  moverlos a `utils/mappers/travel-mappers.ts` como los demás; `mapRowToDomain` de travel media también.

## Tercera pasada: páginas y componentes leídos a mano (2026-10-13)

Se leyeron los scripts de las páginas y componentes grandes y medianos (cotización, viajeros,
habitaciones, pagos, viajes, calendario, proveedores, coordinadores, perfil de agencia,
galería) y se buscó con grep cada patrón en el resto. Fases 14-17.

### Bugs encontrados en esta pasada (arreglar en la fase que toca el archivo, o antes)

- `pages/coordinators/index.vue`: `handleFormSubmit` llama a `addCoordinator` /
  `updateCoordinator` sin `await`, así que el `try/catch` nunca atrapa nada: siempre muestra
  "Coordinador creado/actualizado" y cierra el modal aunque falle. `handleDelete` igual con
  `deleteCoordinator` (que además se traga el error): siempre dice "eliminado".
- `components/bus/bus-list.vue`: si `updateBus` o `deleteBus` fallan (devuelven `false`) no hay
  ningún toast; el modal se queda abierto sin explicación.
- `pages/quotations/[id].vue` `handleCreateQuotation`: `createQuotation` relanza el error y no
  hay `catch` → promesa rechazada sin aviso al usuario.
- 6 de los 14 menús con "Eliminar" no llevan `color: 'error'` (travelers, coordinators,
  dashboard, bus-list, payments/traveler, travel-activity-list): la misma acción se ve distinta
  según la pantalla.
- Ícono de coordinador inconsistente: `i-lucide-user-star` en sidebar, dashboard y
  coordinadores, pero `i-lucide-user-cog` en habitaciones, asientos y servicios opcionales,
  donde `user-star` significa "representante".
- `use-payment-store`: `allPayments`, `getPaymentById`, `filteredPayments` y los `filters` no
  los usa nadie (código muerto; verificar con grep antes de borrar).
- `TravelerFilterBar`: el filtro de viaje siempre está oculto (`hide-travel-filter` y
  `available-travels="[]"` en su único uso) → quitarlo.

**Done in PR (a) (2026-10-14).** Notes from the implementation:
- `updateCoordinator` also swallowed its error (returned `undefined`); it now re-throws like
  `addCoordinator` and `deleteCoordinator`.
- `bus-list`: `toggleBusStatus` had the same silent failure as update/delete. The bus store
  keeps its `Promise<boolean>` contract until phase 10.
- "Eliminar": `travel-activity-list` already had the color; `hotel-room-type-card` and
  `use-provider-category-list` didn't (7 menus in total). In the travelers page,
  `getRowActions` returns `TravelerActionItem[][]` because `BusSeatMap` needs a required `label`.
- Coordinator icon is `i-lucide-user-cog` everywhere; `user-star` only means representative.
- `TravelerFilters.travelId` and its check in `filterTravelers` were removed with the filter.

### Fase 14 — Etiquetas, opciones y formatos en `utils/` ✅

Mismo enfoque que `utils/travel-status.ts` (mapa de etiqueta + color por valor):

- **Estado de pago a proveedores** (Pendiente / Anticipo / Liquidado): copiado en
  `quotation-provider-table`, `quotation-bus-section`, `quotation-accommodation-table` y
  `quotation-financial-summary`; en hospedaje "Anticipo" es `neutral` y en los otros `info`.
- **Estado de pago de viajeros** (Pendiente / Parcial o "Abono parcial" / Pagado): en
  `travel-payments-panel` (dos veces, con textos distintos) y `payment-summary-card`.
  → `utils/payment-status.ts` + `PaymentStatusBadge`.
- **Método de pago** (Efectivo / Transferencia): las opciones están en 8 archivos y la
  etiqueta del badge en 5 (+ `paymentTypeLabel` en `payments/traveler/[id]`).
- **Reparto** ("Asientos mínimos objetivo" / "Asientos vendibles"): opciones ×3, badge
  "Asientos min./vend." ×3; **tipo de costo** (total / por persona) ×2.
- **Estado de cotización** (Borrador / Confirmada): `quotations/index` y
  `quotation-header-actions`.
- **Estado de viaje**: `travel-form` vuelve a escribir las etiquetas de `TRAVEL_STATUS_LABELS`
  → armar las opciones desde `TRAVEL_STATUSES`; el badge de estado está en 8 lugares →
  `TravelStatusBadge`.
- **Tipo de viajero** (Adulto / Niño) ×4; **íconos por tipo** (viajero, representante,
  coordinador) → un mapa y arreglar la inconsistencia de arriba.
- **Plural**: `${n} día${n === 1 ? '' : 's'}` y parecidos, 25 veces en 18 archivos →
  `pluralize(n, 'día')`.
- **Nombre completo** `${firstName} ${lastName}` en 9 archivos → `formatTravelerName`.
- **Fechas**: 5 `formatDate` locales (los 3 historiales, `payments/traveler/[id]`,
  `dashboard`) con `month: 'short'` y dos estilos de día; rangos de fechas en `dashboard`,
  `quotations/index` (con mes largo) y `travels/[id]` → `formatShortDate` y
  `formatDateRange` en `utils/format-date.ts`. La duración del viaje ya existe
  (`getTravelDurationDays` en `utils/travel-calendar.ts`) pero se reimplementa en
  `travels/[id].vue`, `travels/[id]/index.vue` y `travel-activity-list` (esta con
  `new Date('YYYY-MM-DD')`).
- **Nombre de proveedor** `getProviderById(id)?.name ?? '…'` ×8 con 4 textos de respaldo
  distintos → getter `getProviderName` en `use-provider-store`.
- **Etiqueta de camión del viaje** (`agencia — marca modelo`) ×3 (travelers, `traveler-form`,
  `traveler-filter-bar`) → `formatTravelBusLabel`.
- **Coordinadores por ids** `ids.map(id => getCoordinatorById(id))` ×5 → getter.

**Done (2026-10-14).** Notes from the implementation:
- New utils: `payment-status.ts` (labels by `PaymentParty`: traveler "Abono parcial", supplier
  "Anticipo" / "Liquidado"; filter options), `payment-type.ts`, `quotation-labels.ts` (split,
  cost type, quotation status), `traveler-labels.ts` (traveler type, `TRAVELER_ROLE_ICONS` +
  `getTravelerRole`, `formatTravelerName`), `pluralize.ts`, `travel-bus.ts`
  (`formatTravelBusLabel`); `formatShortDate` / `formatDateRange` in `format-date.ts`.
- New badges: `PaymentStatusBadge`, `TravelStatusBadge` (size/class fall through),
  `QuotationSplitTypeBadge`.
- Getters: `providerStore.getProviderName` (one fallback, "Proveedor desconocido"; the bus label
  still reads `getProviderById` so a missing agency shows only the bus) and
  `coordinatorStore.getCoordinatorsByIds` (skips ids missing from the catalog; the dashboard used
  to show "—" for them).
- Small visible changes: the travelers payment table reads "Abono parcial" (was "Parcial"), dates
  use a numeric day ("5 oct 2026", the histories had "05"), ranges use an en dash, and
  `pluralize` fixed "autobúses" and "1 habitaciones".
- Left as is: the payment method badge colors (each table keeps its own), `bus-seat-card` icons
  (booleans and its own palette), `providers/index` (noun without count) and the price warning
  modal (verb agreement).

### Fase 15 — Composables de pantalla ✅

- `useQuotationContext(quotationId)`: `cotizaciones.find(c => c.id === quotationId)?.travelId`
  + `useTravelCoordinatorCount` en 11 componentes de cotización.
- `useTravelQuotation(travelId)`: `useQuery(quotationByTravelQuery)` +
  `getQuotationByTravel` + `useQueryLoadState` en 8 lugares.
- `useQuotationRoomCounts(quotationId)`: `travelDetailQuery` + `countRoomsByType` +
  `roomTypeKey` en `quotation-accommodation-table` y `quotation-accommodation-summary`.
- `useRedirectIfMissing(query, { to, message })`: el `watch([status, data])` de "no
  encontrado" (con la nota del bucle de `watchEffect`) está en `travels/[id]`,
  `quotations/[id]`, `payments/travel/[id]` y `payments/traveler/[id]`.
- `useFormModal<T>()`: `isOpen` + `editing` + `openNew` / `openEdit` / `close` en 15 archivos.
- `useValidTab(tabs, fallback)` (travelers y habitaciones) y `useExpandedGroups(rows)` (el
  `watchEffect` que expande grupos, en travelers y `travel-payments-panel`).
- Pagos de un viaje: `watch(travelId, () => paymentStore.fetchByTravel(id))` en 4 lugares →
  `useTravelPayments(travelId)` (o pasar esos datos a una query de Pinia Colada como el resto).
- `useSiteImageActions()`: subir/quitar imagen con sus toasts en `profile/index`,
  `profile/home` y `profile/seo`.
- VueUse en lugar de código a mano: el debounce de `provider-filter-bar` (`refDebounced`) y
  las `URL.createObjectURL/revokeObjectURL` de `travel-form` y `travel-gallery-upload`
  (`useObjectUrl`).
- Búsqueda: `coordinators/index` filtra con otras reglas que `matchesProviderSearch` (sin
  quitar acentos, teléfono desde 1 dígito) → un `matchesSearch(fields, term, phone?)` en
  `utils/`.

**Done (2026-10-14).** Notes from the implementation:
- `quotation/`: `useQuotationContext` (quotation, travelId, coordinatorCount; 9 components),
  `useQuotationRoomCounts` (accommodation table and summary), `useTravelQuotation` (quotation,
  `load`, `refetch`; 8 places).
- Root composables: `useRedirectIfMissing` (with `toast` and `active` options), `useFormModal`
  (screens rename `isOpen`/`editing`/`openNew`/`openEdit`/`close` so templates stay the same),
  `useValidTab`, `useExpandedGroups`. `payments/useTravelPayments`,
  `agency-profile/useSiteImageActions`.
- `useFormModal` left out on purpose: travelers page (also resets the initial values),
  accommodation table (copies the record into a form state) and public prices (templates); the
  delete-confirm modals wait for `ConfirmDeleteModal` (phase 3).
- VueUse: `refDebounced` in `provider-filter-bar` (a pending search no longer comes back after
  "Limpiar"), `useObjectUrl` for the travel form banner. `travel-gallery-upload` keeps its own
  object URLs: it holds a list of files, and `useObjectUrl` takes one.
- `utils/search.ts` `matchesSearch`: no case or accents, phone by digits only from 3 on. The
  coordinators page now follows it (it matched accents literally and phones from 1 digit).
- Visible changes: logo toasts read "El logo se actualizó / se quitó"; the coordinators search
  placeholder said "Buscar por name".
- Dev server gotcha seen here: after many in-place rewrites `nuxt dev` lost the
  `coordinators-index` route (500 "No match" on every page); rewriting that page file again fixed it.

### Fase 16 — Componentes y piezas de tabla

- `PageHeader` (título, descripción, volver, acciones): ~20 `<h1>` con 4 estilos
  (`text-3xl`/`text-2xl`, `text-gray-900 dark:text-white`/`text-highlighted`).
- Celdas de tabla repetidas con `h(...)`: link con ícono de etiqueta al viaje ×3
  (`dashboard`, `quotations/index`, `payments/index`), nombre con botón de expandir grupo ×2
  (travelers, `travel-payments-panel`), y un helper `deleteAction(onSelect)` para que
  "Eliminar" siempre lleve el mismo ícono y color.
- `quotation-provider-table`, `quotation-bus-section` y `quotation-accommodation-table`
  repiten el grupo de acciones de pago, la de confirmar y los badges; las dos primeras usan
  `<table>` a mano y la de hospedaje `UTable`. Al juntar los badges (fase 14) y las acciones,
  decidir una sola forma de tabla. **Table form decided (2026-10-13):** every table is `UTable`
  with `TableColumn` + `h()` cells; no native `<table>` left in `app/`.
- `agency-about-page-form` y `agency-home-page-form` son iguales salvo los nombres →
  `AgencyPageForm` que reciba el esquema, `clone` y `serialize` del dominio. Los editores
  (`agency-about-page-editor` / `agency-home-page-editor`) comparten el estado vacío y la barra
  de plantilla/restaurar → un contenedor con slots.
- `travel-activity-list` y `travel-service-list`: misma lista editable (copia local del
  `v-model`, `watch` para sincronizar, agregar/editar/borrar con modal) → `useEditableList`.
  Ojo: la de actividades guarda ella misma en el store y la de servicios deja que guarde el
  padre; elegir una.
- El banner de `travel-form` reimplementa lo que ya hace `AgencyImageUpload` (input oculto,
  vista previa, quitar) → generalizarlo a `ImageUpload` (o usar `UFileUpload` de Nuxt UI).
- `v-model`: 5 componentes usan `modelValue` + `emit('update:modelValue')` y 20 `defineModel`
  → pasar los 5 a `defineModel` (por ejemplo `provider-filter-bar`, con un
  `setFilter(key, value)` en vez de un handler por campo).

### Fase 17 — Lógica de dominio repetida en componentes

- Agrupar por representante: `groupTravelersByRepresentative` ya existe, pero
  `travel-payments-panel` lo reimplementa, `travel-optional-service-card` arma sus filas igual,
  y travelers y habitaciones hacen cada uno su mapa de nombres de representante → una función
  del dominio (con variante plana para listas).
- `getSeatChangeErrorMessage` en travelers vuelve a traducir los códigos que
  `toTravelerSeatChangeError` ya convierte en mensaje (con otros textos) → usar `error.message`.
- `formatAdjustmentAmount` (`payment-summary-card`) = `calcAdjustmentAmount` del dominio de pagos.
- Viajeros que toman un servicio `unitCost ? Math.round(payableCost / unitCost) : 0` ×2
  (`quotation-provider-table`, `travels/[id]/optional-services`), y
  `travel-optional-service-card` recalcula pendiente y sobrepago que ya dan
  `getPendingBalanceByProvider` / `getProviderOverpayment` → getters del store.
- `quotation-expense-section` calcula el costo por asiento de cada gasto a mano; proveedores y
  autobuses tienen getter (`getProviderCostPerPerson/Bus`) → agregar el de gastos.
- Los toasts de "guardado / no se pudo" después de cada acción del store se escriben a mano
  en casi todas las pantallas; se simplifican solos cuando el contrato de errores de la
  fase 10 sea uno solo.

## Fuera de alcance (repetido, pero no vale la pena ahora)

- Los `update` de los repositorios (`if (data.x !== undefined) update.y = data.x`) se repiten en
  todos, pero cada uno decide distinto entre `!== undefined` y `'x' in data` (borrar vs. no
  tocar). Un helper genérico escondería esa diferencia.
- `quotation-expense-form` / `quotation-provider-form`: comparten ~20 líneas de campos
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
- Fases 8-9: en una cotización, agregar/editar/borrar proveedor, hospedaje, autobús y gasto;
  el precio por asiento, la ganancia y los saldos dan lo mismo que antes (anotar los números
  de una cotización real de stage antes de empezar y comparar).
- Fase 10: en cada pantalla que llama a un store cambiado, provocar un error (por ejemplo, sin
  red) y ver el toast; y que el caso bueno siga cerrando modales y navegando.
- Fases 11-12: borrar algo bloqueado por RLS (otra agencia) da error en vez de "éxito";
  subir y quitar logo, favicon, banner y fotos de la galería.
- Volver a correr `jscpd`: los grupos de este plan ya no aparecen.
