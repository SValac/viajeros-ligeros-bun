> **Status:** completed (branch `refactor/components-by-domain`).

# Reorganizar `app/components/` por dominio y pasar nombres a inglés

## Context

`app/components/` has 104 components and 103 of them sit at the root. Only `hotel/` is grouped. Finding a component is now slow, and about 30 names are in Spanish (`cotizacion-*`, `pago-*`, `-tabla`, `-resumen`…) while the rest are in English.

Goals:
- One folder per domain, following Nuxt's convention for nested components.
- Every name in English.

Decisions taken with the user:
- **English scope:** the file and component name, plus the public API (props, emits, exported types). Not in scope: internal variables, stores, composables, routes.
- **Depth:** one folder per domain. Add a subfolder only when it groups 3 or more files with the same prefix.
- **`map-location-display.vue`:** delete it. It is not used anywhere.

## Nuxt rule (verified)

The component name is the folder path plus the file name, **with duplicate segments removed**. Nuxt recommends that the file name match the full component name:
- `hotel/hotel-rooms-manager.vue` → `HotelRoomsManager` (`.nuxt/components.d.ts` confirms it).
- A segment is removed only if the **end of the folder path** matches the **start of the file name**. So the subfolder must repeat the file's prefix:
  - `travel/calendar/travel-calendar-filters.vue` → `TravelCalendarFilters` ✓
  - `travel/itinerary/travel-activity-card.vue` → `TravelItineraryTravelActivityCard` ✗

Because of this, every file keeps its full prefix. Moving a file that is already in English **does not change its tag**: only the move happens, with no template edits.

The app-wide components stay at the root, with no prefix, as Nuxt UI templates do. They are used in many places: `load-state`, `empty-state`, `money-input`, `phone-input`, `char-counter`, `rich-content`, `rich-text-editor.client`, `unsaved-changes-modal`, `logo`, `the-separator`, `the-sidebar`, `user-menu`.

## Target structure and mapping

**Move only (tag unchanged):**
- `agency/`: `agency-about-page-editor`, `agency-about-page-form`, `agency-brand-preview`, `agency-color-input`, `agency-icon-picker`, `agency-image-upload`, `agency-profile-form`, `agency-seo-form`, `agency-seo-preview`
- `agency/home/`: `agency-home-block-fields`, `agency-home-page-editor`, `agency-home-page-form`
- `agency/page/`: `agency-page-confirm-modal`, `agency-page-items-editor`, `agency-page-section-card`, `agency-page-sections-editor`
- `bus/`: `bus-form`, `bus-list`, `bus-seat-card`, `bus-seat-map`
- `coordinator/`: `coordinator-form`, `coordinator-invite-button`, `coordinator-seat-form`
- `traveler/`: `traveler-filter-bar`, `traveler-form`
- `payment/`: `payment-form`, `payment-summary-card`, `payment-account-config-form`
- `provider/`: `provider-active-filters`, `provider-category-list`, `provider-detail-card`, `provider-filter-bar`, `provider-form`, `provider-selector`
- `map/`: `map-location-picker`
- `hotel/`: `bed-configuration-input.vue` → `hotel-bed-configuration-input.vue` (the tag stays `HotelBedConfigurationInput`; only the file name changes, to follow the convention)
- `travel/`: `travel-form`, `travel-access-code-card`, `travel-accommodation-card`, `travel-accommodation-form`, `travel-buses-section`, `travel-coordinators-card`, `travel-optional-service-card`, `travel-optional-service-list`, `travel-payments-panel`, `travel-room-type-group`, `travel-service-form`, `travel-service-list`, `travel-services-editor`
- `travel/activity/`: `travel-activity-card`, `travel-activity-form`, `travel-activity-list`
- `travel/calendar/`: `travel-calendar`, `travel-calendar-filters`, `travel-calendar-list`, `travel-calendar-summary`
- `travel/gallery/`: `travel-gallery-section`, `travel-gallery-upload`, `travel-gallery-viewer`
- `quotation/`: `quotation-parameters-card`

**Rename to English (the tag changes)**. The new names follow the types in `app/types/quotation.ts`: `QuotationProvider`, `QuotationAccommodation`, `ProviderPayment`, `AccommodationPayment`, `BusPayment`, `QuotationExpense`, `QuotationPublicPrice`.

| Before | After |
|---|---|
| `cotizacion-header-actions` | `quotation/quotation-header-actions` |
| `cotizacion-kpi-card` | `quotation/quotation-kpi-card` |
| `cotizacion-resumen-financiero` | `quotation/quotation-financial-summary` |
| `cotizacion-resumen-seccion` | `quotation/quotation-summary-section` |
| `cotizacion-gasto-form` | `quotation/quotation-expense-form` |
| `cotizacion-gastos-section` | `quotation/quotation-expense-section` |
| `cotizacion-hospedaje-section` | `quotation/accommodation/quotation-accommodation-section` |
| `cotizacion-hospedaje-form` | `quotation/accommodation/quotation-accommodation-form` |
| `cotizacion-hospedaje-resumen` | `quotation/accommodation/quotation-accommodation-summary` |
| `cotizacion-hospedaje-tabla` | `quotation/accommodation/quotation-accommodation-table` |
| `cotizacion-hospedaje-tipos` | `quotation/accommodation/quotation-accommodation-room-types` |
| `pago-hospedaje-form` | `quotation/accommodation/quotation-accommodation-payment-form` |
| `pago-hospedaje-historial` | `quotation/accommodation/quotation-accommodation-payment-history` |
| `cotizacion-buses-section` | `quotation/bus/quotation-bus-section` |
| `cotizacion-bus-form` | `quotation/bus/quotation-bus-form` |
| `pago-bus-form` | `quotation/bus/quotation-bus-payment-form` |
| `pago-bus-historial` | `quotation/bus/quotation-bus-payment-history` |
| `cotizacion-proveedores-section` | `quotation/provider/quotation-provider-section` |
| `cotizacion-proveedor-form` | `quotation/provider/quotation-provider-form` |
| `cotizacion-proveedor-tabla` | `quotation/provider/quotation-provider-table` |
| `cotizacion-proveedor-ajustes-editor` | `quotation/provider/quotation-provider-adjustments-editor` |
| `cotizacion-proveedor-cortesia-form` | `quotation/provider/quotation-provider-courtesy-form` |
| `pago-proveedor-form` | `quotation/provider/quotation-provider-payment-form` |
| `pago-proveedor-historial` | `quotation/provider/quotation-provider-payment-history` |
| `cotizacion-precio-publico-section` | `quotation/public-price/quotation-public-price-section` |
| `cotizacion-precio-publico-form` | `quotation/public-price/quotation-public-price-form` |
| `cotizacion-precio-publico-aviso-modal` | `quotation/public-price/quotation-public-price-warning-modal` |

**Public API to English:**
- `quotation-header-actions`: emit `cotizacionConfirmada` → `confirmed`. Update the listener in `app/pages/quotations/[id].vue`, which also has a `handleCotizacionConfirmada` handler.
- `payment-account-config-form`: prop `preciosPublicos` → `publicPrices`. Used in `travel-payments-panel.vue` and `pages/payments/traveler/[id].vue`.
- `quotation-public-price-warning-modal`: exported types `PrecioPublicoAvisoAccion` → `PublicPriceWarningAction`, `ViajeroConPrecio` → `TravelerWithPrice`.

**Delete:** `map-location-display.vue`.

## Execution

Branch `refactor/components-by-domain` from `main`. Stop `nuxt dev` while moving files: memories `gotcha_sed_breaks_hmr` and `gotcha_typecheck_breaks_dev_server` show it serves stale files.

1. **Move files** with `git mv` so history follows them (`git log --follow`). Use one scratchpad script with the old → new mapping.
2. **Update tags** in `.vue` files and in `resolveComponent('…')` calls, only for the renamed ones. Each renamed component has 1–2 users, per the usage map built during planning. Replace `<Old` and `</Old>` with an exact match on the PascalCase name. There are no kebab-case tags in the repo.
3. **Update explicit imports** that use a `~/components/…vue` path. There are 8:
   - `agency-home-page-editor.vue` and `agency-about-page-editor.vue` (`agency-page-confirm-modal`)
   - `cotizacion-precio-publico-section.vue` (aviso-modal types)
   - `hotel/hotel-rooms-manager.vue` (2)
   - `pages/travels/[id]/optional-services.vue` (`travel-optional-service-list`)
   - `pages/travels/[id]/travelers/index.vue` (`bus-seat-map`)
   - `composables/use-unsaved-changes-guard.ts` (no change: it stays at the root)
4. **Public API in English**, as listed above.
5. Delete `map-location-display.vue`.
6. `bun run lint:fix`, then `bunx nuxi prepare` to regenerate `.nuxt/components.d.ts` without stale entries. Then `bun run typecheck`.
7. **Docs** in the same PR:
   - `docs/architecture/03-components.md` and `08-file-structure.md` are already stale (they list 54 components): rewrite them with the new tree. Also drop the `map-location-display` mentions in `06-ux-ui.md` and `10-technical-notes.md`.
   - Add the naming rule (subfolder = file prefix, file name = full component name) to `docs/claude/04-code-style.md`.
   - `docs/features/pending/shared-components-dedup/PLAN.md`: update the old names (`PagoHistorial` → `QuotationPaymentHistory`, `PagoProveedorForm` → `QuotationPaymentForm`, `CotizacionKpiCard`…).
   - Leave `docs/features/completed/*` as is: it is historical.
   - Create `docs/features/completed/components-by-domain/PLAN.md` with this plan, in the same PR.
8. **Commits by concern:**
   - (a) move without renaming
   - (b) quotation to English
   - (c) public API to English
   - (d) delete the unused component
   - (e) docs

## Verification

- `grep -rE "<(Cotizacion|Pago)[A-Z]" app` and `grep -rn "components/[a-z-]*\.vue" app` return nothing stale.
- `ls app/components/*.vue` shows only the 12 global components.
- Check `.nuxt/components.d.ts`: no name with a duplicated segment (`grep -E "Travel[A-Za-z]*Travel|Quotation[A-Za-z]*Quotation|Agency[A-Za-z]*Agency"` returns nothing).
- `bun run lint:fix` and `bun run typecheck` pass clean.
- `bun run dev` and browse every screen that uses a moved component, checking the console for `Failed to resolve component` warnings. Nuxt does not fail the build on a missing auto-imported component; it only warns at runtime. Screens:
  - quotation: summary, parameters, providers (open the payments and courtesy modals), accommodation, buses, expenses, public prices (edit modal with the warning)
  - travel: summary, itinerary, services, gallery, travelers (seat map), rooms, per-person services, buses, payments
  - `/calendar`
  - providers: list and detail, including hotel
  - coordinators
  - profile: home, about, seo
  - traveler payments
