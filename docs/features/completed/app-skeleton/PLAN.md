# Feature: app-wide loading skeleton

**Status:** Complete (branch `feature/app-skeleton`).

---

## Context

Today every screen that waits for data shows `LoadState`'s centered spinner
(`app/components/load-state.vue`, ~25 uses), and `pages/profile.vue` has its own copy of that
spinner. Shared-components-dedup phase 7 (PR #141) only added `StatCard`'s `loading` and the
`/payments` money-cell skeletons, and left the general component as its own feature (see
`docs/features/completed/shared-components-dedup/PLAN.md:258`). Goal: replace the spinner with
skeletons shaped like the content (a table, a card grid, a detail page...), using **a few shared
presets, not one skeleton per screen** (agreed with the user). Claude implements it (not mentor
mode).

User decisions: presets by type; also cover `profile.vue`; "Reintentar" after an error shows the
skeleton (already happens: `loadError` is null while the retry runs, so `LoadState` goes back to
its loading branch; only verify it).

## Design

### 1. `LoadSkeleton` (new, `app/components/load-skeleton.vue`)
Built from `USkeleton` + `UCard` (house components, no new dependency).

Props:
- `variant: 'table' | 'cards' | 'detail' | 'panel' | 'form'`
- `stats?: 3 | 4` — a row of StatCard-shaped skeletons above the content. Static class map
  (`3 → 'grid-cols-1 md:grid-cols-3'`, `4 → 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'`) because
  Tailwind can't see dynamic classes. Each stat: `UCard` with `h-4 w-28` + `h-8 w-24` (same as
  `StatCard`'s value skeleton).
- `label?: string` — for screen readers.

Shapes (root `space-y-6`):
- `table`: a header line + 5 rows, 4 columns of varying widths. Bare (most of these `LoadState`s
  already sit inside a `UCard`); with `stats` the rows go inside a `UCard`, like the real pages.
- `cards`: grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of 6 cards (title + 2 lines).
- `detail`: page-header shape (`h-8 w-64` title, `h-4` subtitle) + one card with 4 lines.
- `panel`: one card, a title line + 4 lines.
- `form`: one card, 4 × (label `h-4 w-24` + input `h-9 w-full`).

Accessibility: root `role="status"` + `aria-busy="true"`, and a `sr-only` "Cargando {label}…" (the
spinner had no text). Reduced motion: if Nuxt UI's skeleton theme lacks it, add
`motion-reduce:animate-none` to `ui.skeleton` in `app/app.config.ts`.

### 2. `LoadState` uses it
- Spinner branch → `<slot name="loading"><LoadSkeleton :variant="skeleton" :stats="stats" :label="label" /></slot>`.
- New props `skeleton?: LoadSkeletonVariant` (default `'panel'`) and `stats?: 3 | 4`.
- The `#loading` slot only exists for the two pages whose content lives inside their own
  `max-w-6xl mx-auto p-6` wrapper (`travels/[id].vue`, `quotations/[id].vue`): they wrap
  `<LoadSkeleton variant="detail" />` in that container so it lines up.
- `fill` keeps centering the error; the skeleton is top-aligned at its natural height.
- Update the JSDoc ("Spinner, then error..." → "Skeleton, then...").

### 3. Variant per screen
- `table`: `bus/bus-list.vue`, `coordinators/index.vue`, `provider/provider-category-list.vue`,
  `travel/travel-payments-panel.vue`, `payments/index.vue` (both nested), `travels/dashboard.vue`.
- `table` + `stats`: `quotations/index.vue` (4), `travels/[id]/travelers/index.vue` (3).
- `cards`: `providers/index.vue`, `hotel/hotel-rooms-manager.vue`,
  `travel/travel-buses-section.vue`, `travels/[id]/rooms/index.vue` (both nested ones with
  `stats` 3: the inner quotation one also wraps the stats).
- `detail`: `travels/[id].vue` and `quotations/[id].vue` (outer, via `#loading`),
  `payments/travel/[id].vue`, `payments/traveler/[id].vue`, `provider/provider-detail-page.vue`.
- `panel` (default, no prop): `quotations/[id].vue` (inner), `optional-services.vue` (both),
  `calendar/travel-calendar-summary.vue`, `calendar.vue`.
- `profile.vue`: its spinner `div` → `<LoadSkeleton variant="form" label="el perfil" />` (store
  Pinia, stays outside `LoadState`).
- Not touched: `StatCard` `loading`, the `/payments` money cells (`USkeleton` via
  `resolveComponent` in a `.vue`, fine), `UTable` has no `loading` uses.

## Steps and commits (branch `feature/app-skeleton` from `main`)

1. `docs`: `docs/features/pending/app-skeleton/PLAN.md` (this plan, in English) + a project #3
   item "Componente skeleton de carga" linking it, status In progress.
2. `feat(ui): LoadSkeleton presets` — component + app.config reduced-motion if needed.
3. `feat(ui): LoadState shows a skeleton instead of the spinner` — LoadState + every use above +
   profile.vue.
4. `docs`: findings and screenshots notes in the PLAN, move it to `docs/features/completed/`
   in the same PR. Open the PR (merge commit, no Claude attribution, Spanish title like the
   previous ones), item → In review.

## Verification

- `bun run lint:fix`; typecheck on a scratchpad copy (typecheck breaks a running `nuxt dev`).
- With `bun run dev` + local Supabase (dev@viajeros-ligeros.local / password123), use
  playwright-cli with network throttling (or a route delay on `/rest/v1/*`) to screenshot the
  loading state of each variant: `/travels/dashboard` (table), `/quotations` (stats+table),
  `/providers` (cards), `/travels/<id>` (detail), `/calendar` (panel), `/profile` (form), in light
  and dark, at desktop and tablet width.
- Error → Reintentar: block `/rest/v1/travels` once, check the error, unblock, press Reintentar,
  confirm the skeleton (not a spinner) shows.
- `grep -rn "animate-spin\|loader-circle" app` returns nothing.

Skipped: no unit test (the repo has no test setup and this is template-only; the variant switch
is checked visually). Risk: skeletons won't match every screen exactly (by design: presets);
mobile width only gets CSS fixes if something overflows.

## Result (2026-10-22)

- Shipped as planned. Two changes to the per-screen list while implementing: the outer
  `optional-services.vue` `LoadState` uses `panel` (its content is a side list + one card, not a
  grid), and the inner quotation `LoadState` of `rooms/index.vue` uses `cards` + `stats` 3
  because it wraps the stats as well.
- `USkeleton` renders each block as `role="alert"` with `aria-label="loading"`. `LoadSkeleton` hides
  them (`aria-hidden`) and announces a single `role="status"` "Cargando {label}…".
- `app.config.ts` adds `motion-reduce:animate-none` to `ui.skeleton`: with reduced motion the
  `animation-name` is `none`, otherwise `pulse`.
- Checked with playwright-cli, holding `/rest/v1/**` (or just `travelers`/`quotations` for the
  nested tabs) with a slow `page.route`: dashboard, quotations, providers, coordinators,
  payments, traveler payments, calendar, profile, travel detail and its travelers / rooms /
  buses / optional-services tabs, light and dark, 1440 px and 820 px (no horizontal scroll).
- Error → Reintentar on `/coordinators` (500, then a held request): the error goes away and the
  skeleton shows.
- `grep -rn "animate-spin\|loader-circle" app` is empty.

## Navigation speed and the remaining gaps (2026-10-22, second pass)

The user felt a delay when moving between screens and tabs, and asked whether Nuxt holds the
navigation until the next screen loads.

- **Nuxt's blocking:** per the docs (Data fetching), Nuxt uses `<Suspense>` to hold the navigation
  while an awaited `useAsyncData` / `useFetch` resolves, and the `lazy` option or not awaiting
  skips it. This app uses neither. It loads with Pinia Colada's `useQuery`, which never
  suspends, and no page or layout has a top-level `await`. So there is no blocking option to turn
  off.
- **What a navigation does wait for (measured):**
  - Route guards, including `auth.global` (`getSession`): 2–13 ms.
  - Vue rendering the new page: 36–83 ms in dev.
  - The page's JS chunk, the first time only. Production build served locally: about 50–130 ms
    once `NuxtLink`'s visibility prefetch has fetched it. If the user clicks right after a page
    loads, it took about 2.9 s, because that prefetch requests ~40 chunks at once. Over local
    HTTP/1.1 (6 connections) the clicked tab's chunk queues behind them. Vercel serves HTTP/2,
    which has no such queue.
  - In `bun run dev`, Vite compiles each page the first time it's visited, so first visits feel
    slower than in production.
- **Screens that showed a wrong state while loading, now with a skeleton:**
  - travel summary: seat figures and coordinators;
  - access code card (it said "no code yet"), with a new `lines` preset;
  - gallery (it said "no photos");
  - travel payments tab, quotation summary "Cobrado a viajeros" and the traveler payments page:
    they read $0 until the payments arrived. `useTravelPayments` now returns `loadState` +
    `refetch`.
- Not changed: the travel rooms page shows each traveler's price description once the payments
  arrive (no figure reads wrong before that). The public prices section only uses payments for
  names in a warning modal.
