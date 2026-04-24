# Plan: Migración a Supabase como Backend

## Objetivo

Migrar la aplicación Nuxt 4 de persistencia en `localStorage` (via `@pinia-plugin-persistedstate/nuxt`) hacia Supabase como backend real, usando `@supabase/supabase-js` directamente (sin `@nuxtjs/supabase`). La migración debe preservar la API pública de cada store para no romper los componentes existentes.

## Stack Detectado

- **Runtime/Build**: Nuxt 4, Bun, TypeScript (SSR desactivado — `ssr: false`, SPA mode)
- **UI/State**: Vue 3, Nuxt UI, Pinia, `@pinia-plugin-persistedstate/nuxt`
- **Backend nuevo**: Supabase (local `http://127.0.0.1:54321`, remoto `mkosbzhagjbyfvizafta`), CLI instalada y `@supabase/supabase-js` ya en dependencias
- **Linter/Format**: `@nuxt/eslint`, kebab-case de archivos, 2 espacios, semicolons, comillas simples, `type` en lugar de `interface`

---

## Decisiones de Diseño

### Estrategia general

1. **Backward-compatible shim**: cada store mantiene su API pública (mismos getters, mismos nombres de acciones). Internamente reemplazamos los arrays mutados en memoria por resultados cacheados de Supabase y las acciones por llamadas async.
2. **Modo SPA (`ssr: false`)**: simplifica el uso de Supabase. Un plugin `.client.ts` y un `useSupabase()` composable son suficientes.
3. **Transición segura**: desactivar `persist: true` solo cuando el store correspondiente esté migrado. Remover `@pinia-plugin-persistedstate` al final.
4. **Tipado generado**: `supabase gen types typescript --local` → `app/types/database.types.ts`. Los stores hacen mapeo DB row ↔ tipo de dominio (snake_case ↔ camelCase) en una capa de mappers por store.
5. **IDs**: mantener `id: string` (UUID). Las tablas usan `uuid` con `default gen_random_uuid()`. `created_at`/`updated_at` con triggers `moddatetime`.

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

### FASE 1 — Setup & Cliente Supabase

#### U1 - Actualizar variables de entorno y `nuxt.config.ts`
- **Archivos**: `nuxt.config.ts`, `.env.example`, `.env`
- Completar `runtimeConfig.public.supabaseUrl` y `supabaseKey` para leer desde `NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY`
- Corregir el typo `subabaseSecretKey` → `supabaseServiceRoleKey` (server-only)
- Crear `.env.example` con las tres variables: `NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NUXT_PUBLIC_SUPABASE_KEY=<anon key local>`, `NUXT_SUPABASE_SERVICE_ROLE_KEY=<service_role key>`
- Depende de: ninguno

#### U2 - Crear composable `useSupabase()` y plugin cliente
- **Archivos**: `app/composables/use-supabase.ts`, `app/plugins/supabase.client.ts`, `app/types/database.types.ts` (placeholder)
- Crear composable que exponga un cliente tipado `SupabaseClient<Database>` singleton lazy (instancia lazy dentro del composable, sin depender del ciclo del plugin)
- Crear plugin `supabase.client.ts` que inicialice el cliente con `createClient` usando `runtimeConfig.public`
- Exportar también tipos helper `Tables<'table_name'>`, `TablesInsert`, `TablesUpdate`
- Depende de: U1

#### U3 - Añadir scripts de Supabase a `package.json`
- **Archivos**: `package.json`
- Scripts: `db:start`, `db:stop`, `db:reset`, `db:types` (`supabase gen types typescript --local > app/types/database.types.ts`), `db:diff`, `db:push`
- Depende de: U1

---

### FASE 2 — Diseño de Esquema y Migraciones SQL

> Todas las migraciones son estrictamente secuenciales (cada una depende de la anterior por FKs).
> Tras cada migración, ejecutar: `bun run db:reset && bun run db:types`

#### U4 - Migración: extensiones, funciones y enums
- **Archivos**: `supabase/migrations/0001_init_extensions_enums.sql`
- `create extension if not exists pgcrypto`
- `create extension if not exists moddatetime`
- Enums: `travel_status`, `provider_category`, `payment_type`, `traveler_type`, `cotizacion_status`, `tipo_division_costo`, `cotizacion_bus_estado`
- Valores de cada enum tomados textualmente de `app/types/`
- Depende de: U3

#### U5 - Migración: tablas independientes (`providers`, `coordinators`)
- **Archivos**: `supabase/migrations/0002_providers_coordinators.sql`
- `providers`: `id uuid pk`, `nombre text not null`, `categoria provider_category`, `descripcion text`, `ubicacion_ciudad/estado/pais text`, `contacto_nombre/telefono/email/notas text`, `activo bool default true`, timestamps con trigger `moddatetime`
- `coordinators`: equivalente a `Coordinator` (plano, sin FKs)
- Índices: `providers(categoria)`, `providers(activo)`
- RLS permisivo: `using (true) with check (true)` en todas las tablas
- Depende de: U4

#### U6 - Migración: `buses` y `hotel_rooms` (+ `hotel_room_types`)
- **Archivos**: `supabase/migrations/0003_buses_hotel_rooms.sql`
- `buses`: FK `provider_id → providers(id) on delete cascade`, `modelo`, `marca`, `año int`, `cantidad_asientos int not null`, `precio_renta numeric not null`, `activo bool`, timestamps
- `hotel_rooms`: FK `provider_id → providers(id) on delete cascade`, `total_habitaciones int`, timestamps
- `hotel_room_types`: FK `hotel_room_id → hotel_rooms(id) on delete cascade`, `ocupacion_maxima int`, `cantidad_habitaciones int`, `camas jsonb not null default '[]'::jsonb`, `precio_por_noche numeric`, `costo_habitacion_por_persona numeric`, `detalles_adicionales text`, timestamps
- Depende de: U5

#### U7 - Migración: `travels` y tablas hijas
- **Archivos**: `supabase/migrations/0004_travels.sql`
- `travels`: columnas escalares de `Travel` (sin itinerario, servicios, autobuses, coordinadorIds)
- `travel_activities`: FK `travel_id`, `orden int`, campos de `TravelActivity`
- `travel_services`: FK `travel_id`, campos de `TravelService`
- `travel_buses`: FK `travel_id`, FK `bus_id → buses(id) on delete set null` (nullable), FK `provider_id → providers(id)`, operador campos, `cantidad_asientos`, `precio_renta`
- `travel_coordinators`: tabla unión PK compuesta `(travel_id, coordinator_id)`
- Todas con `on delete cascade` hacia `travels`, índices por `travel_id`
- Depende de: U6

#### U8 - Migración: `travelers`
- **Archivos**: `supabase/migrations/0005_travelers.sql`
- FK `travel_id → travels(id) on delete cascade`
- FK `travel_bus_id → travel_buses(id) on delete set null`
- `representante_id` self-FK nullable (`on delete set null`)
- Check constraint: `(es_representante = true AND representante_id IS NULL) OR (es_representante = false)`
- Índices: `travel_id`, `travel_bus_id`, `representante_id`
- Depende de: U7

#### U9 - Migración: `payments` + `traveler_account_configs`
- **Archivos**: `supabase/migrations/0006_payments.sql`
- `payments`: FKs a `travels` y `travelers` (`on delete cascade`), `amount numeric`, `payment_date date`, `payment_type payment_type`, `notes text`, timestamps
- `traveler_account_configs`: PK compuesta `(travel_id, traveler_id)`, `traveler_type traveler_type`, `child_price numeric`, `discounts jsonb not null default '[]'::jsonb`, `surcharges jsonb not null default '[]'::jsonb`, `precio_publico_id uuid` (sin FK por ahora — se añade en U10), `precio_publico_monto numeric`
- Depende de: U8

#### U10 - Migración: árbol de cotizaciones
- **Archivos**: `supabase/migrations/0007_cotizaciones.sql`
- `cotizaciones`: FK `travel_id`
- `cotizacion_proveedores`: FK `cotizacion_id`, FK `provider_id`
- `pagos_proveedor`: FK `cotizacion_proveedor_id`
- `cotizacion_hospedajes`: FK `cotizacion_id`, FK `provider_id`
- `cotizacion_hospedaje_detalles`: FK `cotizacion_hospedaje_id`, FK `hotel_room_type_id`
- `cotizacion_buses`: FK `cotizacion_id`, FK `proveedor_id → providers`, `coordinador_ids jsonb default '[]'::jsonb`
- `pagos_bus`: FK `cotizacion_bus_id`
- `cotizacion_precios_publicos`: FK `cotizacion_id`
- Al final: `alter table traveler_account_configs add constraint ... foreign key (precio_publico_id) references cotizacion_precios_publicos(id) on delete set null`
- Depende de: U9

#### U11 - Generar tipos de Supabase
- **Archivos**: `app/types/database.types.ts`
- Ejecutar `bun run db:reset && bun run db:types`
- Verificar que el tipo `Database` contiene todas las tablas
- Depende de: U10

---

### FASE 3 — Capa de Mapeo y Utilidades

#### U12 - Utilidad genérica de mapeo `snake_case ↔ camelCase`
- **Archivos**: `app/utils/supabase-mappers.ts`
- Helpers: `mapTimestamps(row)`, `pickTimestamps(row)` — helpers genéricos para `created_at/updated_at`
- Los mappers específicos viven junto a cada store como `app/stores/mappers/*.ts`
- Depende de: U11

#### U13 - Utilidad de manejo de errores Supabase
- **Archivos**: `app/utils/supabase-error.ts`
- `handleSupabaseError(error, context)` — logea, agrupa por código PostgREST común (`23505` duplicado, `23503` FK violación), lanza `Error` con mensaje legible en español
- Depende de: U11

---

### FASE 4 — Migración de Stores Simples (sin dependencias)

> U14 y U15 pueden ejecutarse en paralelo.

#### U14 - Migrar `use-provider-store.ts`
- **Archivos**: `app/stores/use-provider-store.ts`, `app/stores/mappers/provider-mapper.ts`
- Estado: `providers: Provider[]`, `loading: boolean`, `loaded: boolean`
- `fetchAll()`: carga desde Supabase una vez (guard `loaded`)
- CRUD: cada acción llama Supabase y actualiza el array local tras éxito
- Mapper: `rowToProvider(row)` y `providerToInsert(p)` — aplanar/desaplanar `ubicacion` y `contacto` (objetos anidados ↔ columnas planas)
- Desactivar `persist: true`
- Conservar firmas públicas exactas de getters y acciones
- Depende de: U12, U13

#### U15 - Migrar `use-coordinator-store.ts`
- **Archivos**: `app/stores/use-coordinator-store.ts`, `app/stores/mappers/coordinator-mapper.ts`
- Mismo patrón que U14. Estructura plana, mapeo directo
- Desactivar persist
- Depende de: U12, U13

---

### FASE 5 — Migración de Stores con una FK

> U16 y U17 pueden ejecutarse en paralelo.

#### U16 - Migrar `use-bus-store.ts`
- **Archivos**: `app/stores/use-bus-store.ts`, `app/stores/mappers/bus-mapper.ts`
- FK a `providers`. Validación de FK delegada a la DB
- Mapper `bus-mapper.ts`. Desactivar persist
- Depende de: U14

#### U17 - Migrar `use-hotel-room-store.ts`
- **Archivos**: `app/stores/use-hotel-room-store.ts`, `app/stores/mappers/hotel-room-mapper.ts`
- `fetchAll()`: `select('*, hotel_room_types(*)')` → mapear a `HotelRoomData` con `roomTypes[]`
- `create`: insert `hotel_rooms` + bulk insert `hotel_room_types`
- `update`: actualizar `hotel_rooms` + diff de `hotel_room_types` (altas/bajas/cambios)
- `delete`: cascade limpia los tipos automáticamente
- Acciones granulares `addRoomType`, `updateRoomType`, `removeRoomType` — preservar firmas
- `camas[]` es JSONB: ida-y-vuelta sin procesamiento
- Depende de: U14

---

### FASE 6 — Migración de Stores con Hijas Normalizadas

#### U18 - Migrar `use-travel-store.ts`
- **Archivos**: `app/stores/use-travel-store.ts`, `app/stores/mappers/travel-mapper.ts`, `supabase/migrations/0008_travel_rpcs.sql`
- `fetchAll()`: `select('*, travel_activities(*), travel_services(*), travel_buses(*), travel_coordinators(coordinator_id)')` con order en activities por `orden`
- **Decisión de transacciones**: crear funciones SQL `create_travel(jsonb)` y `update_travel(jsonb)` invocadas con `.rpc()` para operaciones atómicas multi-tabla
- Acciones sobre sub-colecciones (`addActivity`, `updateActivity`, `removeActivity`, `addService`, etc.) traducidas a CRUD sobre tablas hijas
- `coordinadorIds`: delete + insert en `travel_coordinators` cuando cambie
- Depende de: U15, U16

#### U19 - Migrar `use-traveler-store.ts`
- **Archivos**: `app/stores/use-traveler-store.ts`, `app/stores/mappers/traveler-mapper.ts`
- `fetchByTravel(travelId)` como acción principal (viajeros cargados por viaje, no todos)
- CRUD standard + lógica árbol representante/acompañantes (leer store actual para política de eliminación)
- Self-FK `representante_id` — respetar política existente del store al eliminar representante
- Depende de: U18

---

### FASE 7 — Migración de Stores Dependientes

#### U20 - Migrar `use-payment-store.ts`
- **Archivos**: `app/stores/use-payment-store.ts`, `app/stores/mappers/payment-mapper.ts`
- `payments` + `traveler_account_configs`
- `traveler_account_configs`: PK compuesta → usar upsert con `onConflict: 'travel_id,traveler_id'`
- `discounts`/`surcharges` como JSONB: cast explícito de tipo en el mapper
- Depende de: U19

#### U21 - Migrar `use-cotizacion-store.ts`
- **Archivos**: `app/stores/use-cotizacion-store.ts`, `app/stores/mappers/cotizacion-mapper.ts`, `supabase/migrations/0009_cotizacion_rpcs.sql`
- `fetchByTravel(travelId)`: query con select anidado de todas las sub-tablas en una sola llamada
- Acciones granulares por sub-entidad (leer store actual para enumerar: `addProveedor`, `addPagoProveedor`, `addHospedaje`, `addHospedajeDetalle`, `addBus`, `addPagoBus`, `addPrecioPublico`, etc.)
- RPCs `create_cotizacion(jsonb)` y `update_cotizacion(jsonb)` para operaciones root multi-tabla
- Getters calculados (totales, acumulados) se mantienen en Pinia — Supabase solo persiste datos crudos
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

| Wave | Work Units | Modo |
|------|-----------|------|
| 1 | U1 | secuencial |
| 2 | U2, U3 | **paralelo** |
| 3–9 | U4, U5, U6, U7, U8, U9, U10 | secuencial (uno por wave) |
| 10 | U11 | secuencial |
| 11 | U12, U13 | **paralelo** |
| 12 | U14, U15 | **paralelo** |
| 13 | U16, U17 | **paralelo** |
| 14 | U18 | secuencial |
| 15 | U19 | secuencial |
| 16 | U20 | secuencial |
| 17 | U21 | secuencial |
| 18 | U22 | secuencial |
| 19 | U23 | secuencial |
| 20 | U24 | secuencial |

> **Importante**: tras cada migración SQL (U4–U10, U18, U21), ejecutar `bun run db:reset && bun run db:types` antes de continuar con el siguiente work unit descendiente.

## Notas para el Agente Ejecutor

- Cada store debe mantener sus firmas públicas exactas (nombres de getters y acciones). Si una firma no puede preservarse 1:1 por una restricción del esquema, escalar al usuario antes de cambiarla.
- Si una decisión JSONB vs tabla normalizada resulta incorrecta durante la implementación, escalar al usuario — no cambiar la decisión silenciosamente.
- Los mappers por store van en `app/stores/mappers/` — un archivo por entidad principal.
- RLS es permisivo durante la migración (`using (true)`). Refinarlo es trabajo posterior (auth, row-level policies).
- No usar `@nuxtjs/supabase` module. Solo `@supabase/supabase-js` directo.
