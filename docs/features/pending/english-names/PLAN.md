> **Status:** PR 1 (files, functions, variables) on branch `refactor/english-identifiers`. PR 2 (comments) pending.

# Convertir a inglés los nombres de archivos, funciones, variables y comentarios

## Context

The code mixes Spanish and English. PR #132 moved component names and their public API to English. What is left in Spanish:
- **Identifiers:** about 1,500 occurrences, measured with a heuristic over 45 files.
- **Comments:** 488 lines in 90 files.
- **File names:** `use-cotizacion-store.ts` and the page `travels/[id]/habitaciones/`.

The worst offender is `app/stores/use-cotizacion-store.ts`: its internal state is already in English, but it exposes about 100 Spanish names (`cotizaciones: quotations`, `getAsientosVendibles`, `addPagoHospedaje`…). This is project #3 item "Renombrar variables y funciones a inglés". Its precondition, Fase 4 of on-demand loading, is already in `completed/`.

**In scope:**
- File names
- Functions, variables, constants, getters and actions
- Local types
- Comments

**Not in scope:**
- Text the user sees (labels, toasts, messages, `aria-label`): stays in Spanish.
- Data values: DB columns, `database.types.ts`, enum values stored in the DB, Spanish data constants such as `'Todos' | 'Adultos' | 'Niños'`. The constant gets renamed; its values do not.
- The historical docs in `docs/features/completed/*`.

**Decisions taken with the user:**
- Also rename URLs:
  - `travels/[id]/habitaciones/` → `travels/[id]/rooms/`, route `travel-habitaciones` → `travel-rooms`
  - `?viaje=` → `?travel=`, `?servicio=` → `?service=`
- Two PRs:
  - PR 1: files, functions and variables
  - PR 2: comments only

## Glossary (use it everywhere for consistent names)

- **Core nouns:**
  - cotización → quotation
  - proveedor (of the quotation) → provider
  - hospedaje → accommodation
  - viajero → traveler
  - asiento → seat
  - precio público → public price
  - pago → payment
  - gasto → expense
  - ajuste → adjustment
  - cortesía → courtesy
- **Amounts and seats:**
  - anticipado → paid
  - saldo pendiente → pending balance
  - sobrepago → overpayment
  - vendibles → sellable
  - ganancia → profit
  - costo → cost
  - divisor → divisor
- **Split and status:**
  - tipo mínimo/total → minimum/total split
  - confirmado → confirmed
  - toman (el servicio) → take
- **Actions:**
  - abrir/cerrar → open/close
  - agregar → add
  - editar → edit
  - eliminar → delete
  - guardar → save

## PR 1 — Files, functions and variables

Branch `refactor/english-identifiers`. One commit per area, with `bunx eslint` after each one. Gotcha from d3fcf96: a destructure with the new name shadowed the store ref, and `no-use-before-define` caught it.

### 1. Quotation store (`use-cotizacion-store.ts` → `use-quotation-store.ts`)

- `useCotizacionStore` → `useQuotationStore`, store id `'useCotizacionStore'` → `'quotation'`. Nothing is persisted, so the id change is harmless.
- Drop the Spanish aliases from the return and expose the real names:

| Before | After |
|---|---|
| `cotizaciones` | `quotations` |
| `proveedores` | `quotationProviders` |
| `pagos` | `providerPayments` |
| `hospedajes` | `quotationAccommodations` |
| `pagosHospedaje` | `accommodationPayments` |
| `preciosPublicos` | `quotationPublicPrices` |
| `busesApartados` | `quotationBuses` |
| `pagosBus` | `busPayments` |
| `gastosAdicionales` | `quotationExpenses` |
| `categoriasGasto` | `expenseCategories` |
| `ajustesViajero` | `travelerPriceAdjustments` |

Check the real aliases when executing.

- **Main getters**:

| Before | After |
|---|---|
| `getCotizacionByTravel` | `getQuotationByTravel` |
| `getProveedoresByQuotation` | `getProvidersByQuotation` |
| `getPagosByProveedor` / `ByHospedaje` / `ByBus` | `getPaymentsByProvider` / `ByAccommodation` / `ByBus` |
| `getAnticipadoProveedor` / `Hospedaje` / `Bus` | `getPaidByProvider` / `ByAccommodation` / `ByBus` |
| `getSaldoPendienteProveedor` / `Hospedaje` / `Bus` | `getPendingBalanceByProvider` / `ByAccommodation` / `ByBus` |
| `getSaldoTotalPendiente` / `Hospedajes` / `Buses` | `getTotalPendingBalanceProviders` / `Accommodations` / `Buses` |
| `getSobrepagoProveedor` | `getProviderOverpayment` |
| `getCostoTotal` | `getProvidersFullBusCost` |
| `getCostoTipoMinimo` / `getCostoTipoTotal` | `getProvidersMinimumSplitCost` / `getProvidersTotalSplitCost` |
| `getCostoPorPersonaAsiento` | `getPerPersonSeatCost` |
| `getCostoPerPersonaProveedor` / `Bus` | `getProviderCostPerPerson` / `getBusCostPerPerson` |
| `getAsientosVendibles` | `getSellableSeats` |
| `getAsientoConGanancia` | `getBreakEvenSeat` |
| `getPrecioAsientoCalculado` | `getCalculatedSeatPrice` |
| `getGananciaProyectada` | `getProjectedProfit` |
| `getDivisorCosto` | `getCostDivisor` |
| `getOptOutsByProveedor` / `getAjustesByProveedor` / `getAjusteDeViajero` | `getOptOutsByProvider` / `getAdjustmentsByProvider` / `getTravelerAdjustment` |
| `puedeConfirmar` / `filteredProveedores` | `canConfirm` / `filteredProviders` |
| `getHospedajesByQuotation` / `getTotalCostoHospedajes` | `getAccommodationsByQuotation` / `getAccommodationsTotalCost` |
| `getPreciosPublicosByQuotation` / `getMatrizPreciosReferencia` | `getPublicPricesByQuotation` / `getReferencePriceMatrix` |
| `getTotalCostoBuses` / `getCostoBusesTipoMinimo` / `getCostoBusesTipoTotal` | `getBusesTotalCost` / `getBusesMinimumSplitCost` / `getBusesTotalSplitCost` |
| `getBusesByProveedorEnQuotation` | `getBusesByProviderInQuotation` |
| `getGastosByQuotation` / `getTotalGastos` / `getGastosTipoMinimo` / `getGastosTipoTotal` | `getExpensesByQuotation` / `getExpensesTotal` / `getExpensesMinimumSplit` / `getExpensesTotalSplit` |

- **Actions:**

| Before | After |
|---|---|
| `confirmarQuotation` / `reabrirQuotation` | `confirmQuotation` / `reopenQuotation` |
| `add`/`update`/`deleteProveedorQuotation` | `add`/`update`/`deleteQuotationProvider` |
| `toggleConfirmadoProveedor` / `Hospedaje` | `toggleProviderConfirmed` / `toggleAccommodationConfirmed` |
| `updateProveedorCortesia` | `updateProviderCourtesy` |
| `setTomanServicio` | `setServiceTakers` |
| `saveAjustesProveedor` | `saveProviderAdjustments` |
| `setAjusteViajero` | `setTravelerAdjustment` |
| `add`/`update`/`deleteHospedajeQuotation` | `add`/`update`/`deleteQuotationAccommodation` |
| `refreshHospedajeCosts` | `refreshAccommodationCosts` |
| `add`/`update`/`deletePagoHospedaje` | `add`/`update`/`deleteAccommodationPayment` |
| `add`/`update`/`deletePrecioPublico` | `add`/`update`/`deletePublicPrice` |
| `fetchCategoriasGasto` | `fetchExpenseCategories` |
| `add`/`update`/`deleteGasto` | `add`/`update`/`deleteExpense` |

- Internal locals of the store, following the glossary.
- Update every consumer of the store in the same commit: about 40 files, which `grep useCotizacionStore` finds. In components, rename the variable too: `cotizacionStore` → `quotationStore`.

### 2. Quotation components (`app/components/quotation/**`)
Locals, functions and local types: for example `selectedProveedor`, `abrirAviso`, `editingPrecio`, `historialProveedorNombre`, `EntradaGrupo`, `DetalleRow`, `getNombreHotel`, `costoPorAsiento`, `personasTocadas`.

### 3. Pages and the rest of the components
- `pages/quotations/**`, `pages/travels/**`, `pages/payments/**`
- `components/travel/**`, `payment/**`, `provider/**` and others
- Constants such as `GRUPOS_ETARIOS` → `AGE_GROUPS`, keeping the values.

### 4. Routes and URLs
- `git mv pages/travels/[id]/habitaciones pages/travels/[id]/rooms`
- `definePageMeta({ name: 'travel-rooms' })` and every `{ name: 'travel-habitaciones' }`.
- `route.query.viaje` → `travel`, `route.query.servicio` → `service`, plus the `router.replace/push` calls that write them.
- Search for `/habitaciones` in string `to:` values.

### 5. Composables, utils, queries, types, `supabase/functions`
These have few hits. Translate whatever is left after the global grep.

### 6. Living docs
Update the names in these docs:
- `docs/architecture/02-store.md`
- `docs/architecture/08-file-structure.md`
- `docs/claude/*`
- `docs/features/pending/shared-components-dedup/PLAN.md` (it uses `getPagosByX`, `getSaldoPendienteX`, `use-cotizacion-store`…)
- The body of the project #3 item

## PR 2 — Comments

- Branch `docs/english-comments` from main after merging PR 1.
- Translate `//`, `/* */`, JSDoc and `<!-- -->` in `app/**` and `supabase/functions/**`.
- Rewrite each comment as English with the same meaning, not word for word. Keep its length and density.
- One commit per area: stores, composables and utils, components, pages.
- Do not touch any code. Check with `git diff --word-diff` that only comment lines change.

## Verification (per PR)

- `bunx eslint app` clean, and `bun run typecheck` in a scratchpad copy (the dev server is running).
- Leftover grep: `grep -rniE "\b[a-z]*(cotizaci|proveedor|hospedaj|viajer|asiento|pago|gasto|ajuste|precio|ganancia|saldo|anticip)[a-zA-Z]*\b" app`, skipping strings, which should return only UI text.
- Re-run the attributes-vs-props script from PR #132, so no binding stays unrenamed.
- **Equal numbers:** before PR 1, save the text of the summary, services, accommodation, buses, expenses and prices tabs of quotations `ff…01` and `ff…02` with playwright-cli. Afterwards, compare. The amounts must match exactly.
- **Browser:**
  - Walk the 35 screens from PR #132 and the modals (payments, courtesy, provider edit, price edit, expense edit, add bus, add accommodation, activity). 0 Vue warnings expected.
  - Check that `/travels/:id/rooms` works, and that `?service=` and `?travel=` still select the service or travel.
- **PR 2 only:** `git diff main --stat` touches only comments. Typecheck and lint stay identical.
