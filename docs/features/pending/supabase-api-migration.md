# Plan: Migración a Supabase como Backend

## Objetivo

Migrar la aplicación Nuxt 4 de persistencia en `localStorage` (via `@pinia-plugin-persistedstate/nuxt`) hacia Supabase como backend real, usando `@supabase/supabase-js` directamente (sin `@nuxtjs/supabase`). La migración debe preservar la API pública de cada store para no romper los componentes existentes.

## Progreso

| Fase | Estado |
|------|--------|
| Fase 1 — Setup & Cliente Supabase | ✅ Completada |
| Fase 2 — Diseño de Esquema y Migraciones SQL | ✅ Completada |
| Fase 2.5 — Rename a inglés + fix TypeScript | ✅ Completada |
| Fase 3 — Capa de Mapeo y Utilidades | ✅ Completada |
| Fase 4 — Migración de Stores Simples | ✅ Completada |
| Fase 5 — Migración de Stores con una FK | ✅ Completada |
| Fase 6 — Migración de Stores con Hijas Normalizadas | ✅ Completada |
| Fase 7 — Migración de Stores Dependientes | ✅ Completada |
| Fase 8 — Limpieza, Tipado y Validación | ✅ Completada |

---

## Stack Detectado

- **Runtime/Build**: Nuxt 4, Bun, TypeScript (SSR desactivado — `ssr: false`, SPA mode)
- **UI/State**: Vue 3, Nuxt UI, Pinia, `@pinia-plugin-persistedstate/nuxt`
- **Backend nuevo**: Supabase (local `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, remoto `mkosbzhagjbyfvizafta`), CLI v2.90.0 instalada y `@supabase/supabase-js` ya en dependencias
- **Linter/Format**: `@nuxt/eslint`, kebab-case de archivos, 2 espacios, semicolons, comillas simples, `type` en lugar de `interface`

---

## Decisiones de Diseño

### Estrategia general

1. **Backward-compatible shim**: cada store mantiene su API pública (mismos getters, mismos nombres de acciones). Internamente reemplazamos los arrays mutados en memoria por resultados cacheados de Supabase y las acciones por llamadas async.
2. **Modo SPA (`ssr: false`)**: simplifica el uso de Supabase. Solo `useSupabase()` composable — el plugin fue descartado por redundante.
3. **Transición segura**: desactivar `persist: true` solo cuando el store correspondiente esté migrado. Remover `@pinia-plugin-persistedstate` al final.
4. **Tipado generado**: `supabase gen types typescript --local` → `app/types/database.types.ts`. Los stores hacen mapeo DB row ↔ tipo de dominio (snake_case ↔ camelCase) en una capa de mappers por store.
5. **IDs**: mantener `id: string` (UUID). Las tablas usan `uuid` con `default gen_random_uuid()`. `created_at`/`updated_at` con triggers `moddatetime` (extension `extensions.moddatetime`).
6. **Workflow de migraciones**: iterar SQL con `docker exec ... psql` → capturar con `supabase db diff -f <name> --local` → verificar con `supabase db reset --local`.

### Normalización vs JSONB

| Campo | Decisión | Justificación |
|---|---|---|
| `Travel.itinerario` | **Tabla propia** `travel_activities` | Se ordena, edita item por item, tiene horarios consultables |
| `Travel.servicios` | **Tabla propia** `travel_services` | Se listan/editan individualmente, pueden incluirse/excluirse |
| `Travel.autobuses` | **Tabla propia** `travel_buses` | FK a `providers` y `buses`, vinculada a `travelers` via `travelBusId` |
| `Travel.coordinadorIds` | **Tabla de unión** `travel_coordinators` | many-to-many con `coordinators` |
| `HotelRoomType.camas[]` | **JSONB** en `hotel_room_types` | Siempre se lee/escribe como bloque, rara vez se filtra por configuración individual |
| `CotizacionHospedaje.detalles` | **Tabla normalizada** `cotizacion_hospedaje_detalles` | Se costea y ajusta cantidad individualmente |
| `TravelerAccountConfig.discounts/surcharges` | **JSONB** | Lista libre de ajustes, siempre editada como bloque |
| `CotizacionBus.coordinadorIds` (tupla 0..2) | **JSONB** | Array corto con semántica de tupla, no se filtra por ello |

### Orden de migración de stores (por grado de dependencia)
`providers` → `coordinators` → `buses` → `hotel_rooms` → `travels` (+hijas) → `travelers` → `payments` → `cotizaciones` (+hijas)

---

## Fases y Work Units

### ✅ FASE 1 — Setup & Cliente Supabase

#### ✅ U1 - Actualizar variables de entorno y `nuxt.config.ts`
- **Archivos modificados**: `nuxt.config.ts`, `.env.example`
- Corregido typo `subabaseSecretKey` → `supabaseSecretKey`
- `.env.example` actualizado con `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`
- `.env` ya existía con las variables del entorno local

#### ✅ U2 - Crear composable `useSupabase()`
- **Archivos creados**: `app/composables/use-supabase.ts`, `app/types/database.types.ts` (placeholder)
- Plugin descartado — el composable singleton lazy cubre todo lo necesario en SPA mode
- Exporta `SupabaseClient<Database>` tipado

#### ✅ U3 - Añadir scripts de Supabase a `package.json`
- **Archivos modificados**: `package.json`
- Scripts añadidos: `db:start`, `db:stop`, `db:reset`, `db:types`, `db:diff`, `db:push`

---

### ✅ FASE 2 — Diseño de Esquema y Migraciones SQL

> Workflow real utilizado: `docker exec supabase_db_viajeros-ligeros-bun psql -U postgres` para iterar → `supabase db diff -f <name> --local` para capturar → `supabase db reset --local` para verificar.
> `supabase db query` no soporta múltiples statements en una sola llamada.

#### ✅ U4 - Migración: extensiones y enums
- **Archivo**: `supabase/migrations/20260424025733_init_extensions_enums.sql`
- `moddatetime` extension en schema `extensions`
- 7 enums: `travel_status`, `provider_category`, `payment_type`, `traveler_type`, `cotizacion_status`, `tipo_division_costo`, `cotizacion_bus_estado`

#### ✅ U5 - Migración: `providers`, `coordinators`
- **Archivo**: `supabase/migrations/20260424025826_providers_coordinators.sql`
- RLS permisivo (`using (true)`), triggers `moddatetime`, índices por `categoria` y `activo`

#### ✅ U6 - Migración: `buses`, `hotel_rooms`, `hotel_room_types`
- **Archivo**: `supabase/migrations/20260424025916_buses_hotel_rooms.sql`
- `camas[]` como JSONB en `hotel_room_types`
- FK indexes en todas las columnas de FK

#### ✅ U7 - Migración: `travels` y tablas hijas
- **Archivo**: `supabase/migrations/20260424030016_travels.sql`
- 5 tablas: `travels`, `travel_activities`, `travel_services`, `travel_buses`, `travel_coordinators`

#### ✅ U8 - Migración: `travelers`
- **Archivo**: `supabase/migrations/20260424030103_travelers.sql`
- Self-FK `representante_id`, check constraint `travelers_representante_check`

#### ✅ U9 - Migración: `payments`, `traveler_account_configs`
- **Archivo**: `supabase/migrations/20260424030150_payments.sql`
- `traveler_account_configs` con PK compuesta `(travel_id, traveler_id)`, JSONB para `discounts`/`surcharges`
- `precio_publico_id` sin FK (se añade en U10)

#### ✅ U10 - Migración: árbol de cotizaciones
- **Archivo**: `supabase/migrations/20260424030253_cotizaciones.sql`
- 8 tablas: `cotizaciones`, `cotizacion_proveedores`, `pagos_proveedor`, `cotizacion_hospedajes`, `cotizacion_hospedaje_detalles`, `cotizacion_buses`, `pagos_bus`, `cotizacion_precios_publicos`
- FK diferida de `traveler_account_configs.precio_publico_id → cotizacion_precios_publicos(id)` añadida al final

#### ✅ U11 - Generar tipos de Supabase
- **Archivo**: `app/types/database.types.ts` (generado con `bun run db:types`)
- Verificado: `supabase db reset --local` aplica las 7 migraciones sin errores
- Tipos `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>` disponibles

---

### ✅ FASE 2.5 — Rename a inglés + corrección de TypeScript

> Esta fase emergió porque los stores, tipos de dominio y componentes usaban nombres en español, mientras que el esquema SQL y los tipos generados están en inglés. Fue necesario renombrar ~900 usos antes de continuar.

#### ✅ Rename de tipos de dominio y enums a inglés
- Todos los tipos en `app/types/` renombrados a inglés: `estado→status`, `nombre→name`, `precio→price`, `viaje→travel`, etc.
- Enums de stores actualizados: `pendiente→pending`, `confirmado→confirmed`, `enCurso→in_progress`, etc.
- Afectó: todos los stores, todos los componentes, todas las páginas

#### ✅ Corrección de 900+ errores TypeScript
- Errores reducidos de ~915 a 0
- Principales áreas corregidas: stores (`use-travel-store`, `use-bus-store`), componentes de cotización, páginas de pagos, filtros de viajeros
- Issues específicos resueltos: `location.status` (campo `state` de provincia), `provider.firstName` (debe ser `provider.name`), `accommodation` vs `hospedaje` en variables de loop, `cantidad`→`count`→`quantity` en `QuotationAccommodationDetail`

---

### ✅ FASE 3 — Capa de Mapeo y Utilidades

#### ✅ U12 - Mappers en `app/utils/mappers.ts`
- **Archivos**: `app/utils/mappers.ts`
- **Decisión**: todos los mappers en un solo archivo (no divididos por store) para simplicidad
- Cubre todas las entidades: Provider, Coordinator, Bus, Travel (+Activities/Buses/Services), Traveler, HotelRoom, Payment, TravelerAccountConfig, Quotation, QuotationProvider, QuotationAccommodation, QuotationBus, QuotationPublicPrice, y todos los tipos de pago
- Patrón: `mapXxxRowToDomain(row)` para DB→dominio, `mapXxxToInsert(data)` para dominio→DB
- `Travel` tiene parámetro extra `extras?` para inyectar arrays relacionados (coordinatorIds, itinerary, services, buses)
- JSON fields con cast explícito: `beds as BedConfiguration[]`, `coordinator_ids as string[]`, `discounts/surcharges as AdjustmentItem[]`

#### ✅ Migración adicional: `accommodation_payments`
- **Archivo**: `supabase/migrations/20260424032200_accommodation_payments.sql`
- La tabla `accommodation_payments` faltaba en el esquema original (existía en el dominio pero no en las migraciones SQL)
- `app/types/database.types.ts` actualizado manualmente con la definición de la tabla
- El mapper `mapAccommodationPaymentRowToDomain` ahora usa `Tables<'accommodation_payments'>`

#### ⬜ U13 - Utilidad de manejo de errores Supabase
- **Archivos**: `app/utils/supabase-error.ts` (pendiente)
- `handleSupabaseError(error, context)` — logea, agrupa por código PostgREST común
- Por ahora los stores manejan errores inline con `try/catch`
- Depende de: U11

---

### ✅ FASE 4 — Migración de Stores Simples (sin dependencias)

> U14 y U15 ejecutados en paralelo.

#### ✅ U14 - Migrar `use-provider-store.ts`
- **Archivos**: `app/stores/use-provider-store.ts`
- `fetchAll()` carga desde Supabase ordenado por `name`
- `updateProvider` construye `TablesUpdate<'providers'>` campo por campo para soportar updates parciales con objetos anidados (`location`, `contact`)
- `deleteProvider` mantiene llamada a `hotelRoomStore.deleteProviderRooms(id)` para estado en memoria mientras ese store no esté migrado (DB ya tiene `ON DELETE CASCADE`)
- Acciones async, persist eliminado
- Callers actualizados: 7 páginas de categorías + `provider-selector.vue`

#### ✅ U15 - Migrar `use-coordinator-store.ts`
- **Archivos**: `app/stores/use-coordinator-store.ts`
- `fetchAll()` ordenado por `created_at DESC` para respetar sort de `allCoordinators`
- `updateCoordinator` construye `TablesUpdate<'coordinators'>` desde `CoordinatorUpdateData` parcial
- Acciones async, persist eliminado

---

### ✅ FASE 5 — Migración de Stores con una FK

> U16 y U17 ejecutados en paralelo.

#### ✅ U16 - Migrar `use-bus-store.ts`
- **Archivos**: `app/stores/use-bus-store.ts`
- `updateBus` con `TablesUpdate<'buses'>` para campos opcionales (`brand`, `model`, `year`)
- `addBusToTravel` en `use-travel-store.ts` propagado a async para consumir `await busStore.addBus(...)`
- Callers actualizados: `bus-list.vue`, `travel-bus-list.vue`

#### ✅ U17 - Migrar `use-hotel-room-store.ts`
- **Archivos**: `app/stores/use-hotel-room-store.ts`
- `fetchAll()` con `select('*, hotel_room_types(*)')` y mapeo anidado
- `initRoomData` inserta en `hotel_rooms` si no existe (idempotente, check en memoria primero)
- `addRoomType` / `updateRoomType` / `deleteRoomType` — CRUD sobre `hotel_room_types` con `hotel_room_id` del `HotelRoomData.id`
- `deleteProviderRooms` sigue siendo síncrono — solo limpia estado local, el cascade DB ya actuó
- Persist eliminado

---

### ✅ FASE 6 — Migración de Stores con Hijas Normalizadas

#### ✅ U18 - Migrar `use-travel-store.ts`
- **Archivos**: `app/stores/use-travel-store.ts`
- `fetchAll()`: `select('*, travel_activities(*), travel_services(*), travel_buses(*), travel_coordinators(coordinator_id)')` ordenado por `created_at DESC`, activities ordenadas por `day`
- `addTravel`: inserts secuenciales (travels → activities → services → buses → coordinators)
- `updateTravel`: actualiza row principal con `TablesUpdate<'travels'>` + delete-then-reinsert para cada sub-colección cuando está presente en el update
- `deleteTravel`: delete simple (cascade borra todas las hijas)
- Sin RPCs — inserts secuenciales suficiente para MVP
- Acciones async, persist eliminado
- Callers actualizados: `new.vue`, `dashboard.vue`, `[id]/edit.vue`, `[id]/index.vue`, `travel-bus-list.vue`

#### ✅ U19 - Migrar `use-traveler-store.ts`
- **Archivos**: `app/stores/use-traveler-store.ts`, `app/pages/travels/[id]/travelers/index.vue`
- `fetchByTravel(travelId)` — query por `travel_id`, ordena por `created_at DESC`
- `addTraveler` / `updateTraveler` / `deleteTraveler` — async con `loading`/`error`
- `deleteTraveler`: desvincula acompañantes (`representative_id=null, is_representative=false`) antes de borrar si era representante
- Persist eliminado; `index.vue` actualizado con `await` y `onMounted` async
- Depende de: U18

---

### FASE 7 — Migración de Stores Dependientes

#### ✅ U20 - Migrar `use-payment-store.ts`
- **Archivos**: `app/stores/use-payment-store.ts`, `app/utils/mappers.ts`, `app/pages/payments/travel/[id].vue`, `app/pages/payments/traveler/[id].vue`
- `fetchByTravel` / `fetchByTraveler` — cargan payments + account configs para el contexto dado (merge con datos de otros travels/travelers en memoria)
- `setAccountConfig` — upsert con `onConflict: 'travel_id,traveler_id'`
- `mapTravelerAccountConfigToUpsert` agregado en mappers.ts
- Lógica de validación de balance en `addPayment` se mantiene antes del insert DB
- Persist eliminado; callers actualizados con `await` y `onMounted` fetch
- Depende de: U19

#### ✅ U21 - Migrar `use-cotizacion-store.ts`
- **Archivos**: `app/stores/use-cotizacion-store.ts` + 11 callers (cotizacion.vue, 10 componentes)
- `fetchByTravel`: carga las 8 tablas con nested selects en un solo `Promise.all`
- `_syncPrecioToTravel` → async: actualiza `quotations.seat_price` en DB y llama `travelStore.updateTravel`
- Sin RPCs — inserts secuenciales suficientes para MVP
- `addHospedajeQuotation` / `updateHospedajeQuotation`: delete-reinsert de `quotation_accommodation_details`
- `costPerPerson` enriquecido post-mapping (campo calculado, no almacenado en DB)
- Todas las acciones (26) convertidas a async; persist eliminado
- `cotizacion-hospedaje-form.vue` también actualizado (caller faltante del plan original)
- Depende de: U20

---

### FASE 8 — Limpieza, Tipado y Validación

#### U22 - Remover `@pinia-plugin-persistedstate/nuxt`
- **Archivos**: `nuxt.config.ts`, `package.json`, `bun.lock`, todos los stores con `persist` remanente
- Quitar el módulo de `nuxt.config.ts`, limpiar `persist: ...` en stores, `bun remove @pinia-plugin-persistedstate/nuxt`
- Depende de: U14, U15, U16, U17, U18, U19, U20, U21 (todos completados)

#### U23 - Regenerar tipos y correr typecheck + lint
- **Archivos**: `app/types/database.types.ts`, cualquier archivo con errores
- `bun run db:types && bun run typecheck && bun run lint:fix`
- Corregir errores de tipos en mappers y stores
- Depende de: U22

#### U24 - Seed de desarrollo y smoke test manual
- **Archivos**: `supabase/seed.sql`
- 1-2 registros por tabla para verificar que cada store carga correctamente
- Documentar: `bun run db:reset` aplica migraciones + seed
- Depende de: U23

---

## Orden de Ejecución

| Wave | Work Units | Modo | Estado |
|------|-----------|------|--------|
| 1 | U1 | secuencial | ✅ |
| 2 | U2, U3 | paralelo | ✅ |
| 3–9 | U4, U5, U6, U7, U8, U9, U10 | secuencial | ✅ |
| 10 | U11 | secuencial | ✅ |
| 10.5 | Rename a inglés + fix TS | secuencial | ✅ |
| 11 | U12, U13 | paralelo | ✅ U12, ⬜ U13 |
| 12 | U14, U15 | paralelo | ✅ |
| 13 | U16, U17 | paralelo | ✅ |
| 14 | U18 | secuencial | ✅ |
| 15 | U19 | secuencial | ✅ |
| 16 | U20 | secuencial | ✅ |
| 17 | U21 | secuencial | ✅ |
| 18 | U22 | secuencial | ✅ |
| 19 | U23 | secuencial | ✅ |
| 20 | U24 | secuencial | ✅ |

---

## Notas para el Agente Ejecutor

- Cada store debe mantener sus firmas públicas exactas (nombres de getters y acciones). Si una firma no puede preservarse 1:1 por una restricción del esquema, escalar al usuario antes de cambiarla.
- Si una decisión JSONB vs tabla normalizada resulta incorrecta durante la implementación, escalar al usuario — no cambiar la decisión silenciosamente.
- Los mappers por store van en `app/stores/mappers/` — un archivo por entidad principal.
- RLS es permisivo durante la migración (`using (true)`). Refinarlo es trabajo posterior (auth, row-level policies).
- No usar `@nuxtjs/supabase` module. Solo `@supabase/supabase-js` directo.
- `supabase db query` no soporta múltiples statements — usar `docker exec supabase_db_viajeros-ligeros-bun psql -U postgres -c "..."` para iterar SQL.
- Workflow de migraciones: psql para iterar → `supabase db diff -f <name> --local` para capturar → `supabase db reset --local` para verificar.
