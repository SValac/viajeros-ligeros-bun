# 4. Flujo de Datos

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  MIDDLEWARE: app/middleware/auth.global.ts                   │
│  - Verifica sesión en cada navegación                        │
│  - Redirige a /login si no autenticado                       │
│  - Redirige a / si autenticado intenta acceder /login        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PÁGINAS / COMPONENTES                                       │
│  - Leen con useQuery(...) o con el store del catálogo        │
│  - Escriben con las actions de los stores                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PINIA COLADA (app/queries/)                                 │
│  - Caché por clave, dedupe, staleTime, refetch al volver     │
│  - Se pide solo lo que la pantalla usa (un viaje, un mes,    │
│    una página, un catálogo la primera vez que se necesita)   │
│                                                              │
│  PINIA STORES (app/stores/)                                  │
│  - Escrituras: invalidan las queries que cambian             │
│  - Catálogos: getters sobre la query del catálogo            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ repositorios → supabaseClient.from('tabla')
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL)                                       │
│  - Cliente singleton en app/composables/use-supabase.ts      │
│  - Todas las operaciones CRUD pasan por este cliente         │
│  - Mappers (app/utils/mappers/) convierten snake_case ↔     │
│    camelCase entre BD y dominio                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Ciclo de vida de datos

### Inicio de sesión

1. Usuario accede a `/login`
2. `auth-store.signIn()` llama a `supabase.auth.signInWithPassword()`
3. Supabase devuelve `session`
4. La página recarga completa (`window.location.href = '/'`): vacía los stores y la caché de
   Colada, así nada de un usuario anterior sobrevive. El logout hace lo mismo hacia `/login`.
5. Nada se carga al arrancar: cada pantalla pide lo suyo (ver abajo).

### Operación CRUD típica (ejemplo: crear viaje)

1. Componente llama `travelsStore.addTravel(data)`
2. Store ejecuta inserts en Supabase (tablas: `travels`, `travel_activities`, `travel_services`, `travel_buses`, `travel_coordinators`)
3. Si hay error, store expone `error` y lanza excepción
4. Si éxito, store invalida `travelKeys.root`: las queries activas (listados, detalle) se vuelven
   a pedir y las inactivas se piden la próxima vez que una pantalla las monte
5. Componente reacciona reactivamente (computed sobre `data` de la query → template)

### Lectura de datos relacionados

`travelDetailQuery(id)` trae un viaje con sus relaciones en una sola consulta:

```
travels
  ├─ travel_activities (itinerario)
  ├─ travel_services (servicios)
  ├─ travel_buses (con operadores)
  └─ travel_coordinators → coordinators (via join)
```

Los listados (`travelListQuery`) traen solo las columnas de la tabla y el conteo de viajeros
embebido (`travelers(count)`), paginados en el servidor.

---

## Carga de datos con Pinia Colada

Historia y decisiones: `docs/features/completed/on-demand-data-loading/`.

### Qué es cada cosa

- **Query (Colada):** datos que vienen del servidor y se piden por pantalla y por alcance
  (un viaje, un mes, una página). Colada guarda el resultado en caché por **clave**,
  deduplica peticiones iguales y lo refresca cuando está viejo.
- **Store (Pinia):** estado de cliente que no existe en el servidor (filtros de UI,
  selección, borradores de formulario).

Regla: si el dato se puede volver a pedir al servidor, es una query; si solo existe en el
cliente, es un store.

### Capas

```
Página / componente → useQuery(() => travelDetailQuery(id))
                            │
                      app/queries/<dominio>.ts      claves + defineQueryOptions
                            │
                      app/composables/<dominio>/use-*-repository.ts    Supabase
```

Las funciones de query llaman al **repositorio**, nunca a `supabase` directamente.

### Claves

Un archivo por dominio en `app/queries/` con una fábrica de claves de lo general a lo
específico, para poder invalidar por prefijo:

```ts
export const travelKeys = {
  root: ['travels'] as const,
  detail: (id: string) => ['travels', 'detail', id] as const,
};
```

- `as const` conserva la tupla literal.
- Invalidar `travelKeys.root` refresca el detalle y los listados del dominio.
- La misma fábrica se usa en `key:` de la query y al invalidar, para que no se desalineen.

### Defaults (`colada.options.ts`)

| Opción | Valor | Motivo |
|---|---|---|
| `staleTime` | 30 s | No repite la petición al cambiar de pestaña dentro de un viaje. |
| `gcTime` | 5 min | Al volver a una pantalla se ve el dato anterior mientras se refresca. |
| `refetchOnMount` / `WindowFocus` / `Reconnect` | `true` | Refresca solo si el dato está viejo; cubre datos desactualizados entre usuarios. |

Los catálogos (proveedores, coordinadores…) sobrescriben `staleTime` con 5 min por query.

### Catálogos

Proveedores, coordinadores, autobuses y habitaciones se cargan **completos** (son pocos y se usan
en selects por toda la app), la primera vez que una pantalla usa su store. Cada store llama
`useCatalogState(useXCatalog, xCatalogQuery)` (`app/queries/catalogs.ts`) en su setup:

- `useXCatalog` es un `defineQuery`, no `useQuery`: dentro de un store, `useQuery` se ataría al
  componente que creó el store y se apagaría al desmontarse. Así la query queda activa mientras
  vive el store: las escrituras la invalidan y se vuelve a pedir desde cualquier pantalla.
- Las pantallas que muestran un catálogo envuelven el contenido en `LoadState` con `isLoaded` y
  `loadError` del store (ver "Estados de carga, error y vacío").
- Escrituras que validan contra el catálogo usan `ensureFresh()`; un alta mete el registro a la
  caché con `setItems` antes del refetch.

### Estados de carga, error y vacío

- **`LoadState`** (`app/components/load-state.vue`): skeleton → error + "Reintentar" → slot. Antes de
  la primera carga, una lista vacía o un registro faltante serían mentira; si falla un refetch con
  datos ya cargados, se queda el contenido. `label` lleva el artículo ("los viajeros", "la
  cotización") y el verbo concuerda solo. `fill` centra el error en toda la altura (páginas completas).
- **`LoadSkeleton`** (`app/components/load-skeleton.vue`): el skeleton de `LoadState`, con un preset por
  tipo de contenido y no uno por pantalla: `skeleton="table" | "cards" | "detail" | "panel" | "lines" | "form"`
  (`panel` por defecto; `lines` es `panel` sin card, para dentro de una card que ya existe) y
  `:stats="3 | 4"` para las StatCards de arriba. El slot `#loading` lo
  reemplaza cuando la página tiene su propio contenedor (`travels/[id]`, `quotations/[id]`).
- **`<NuxtLoadingIndicator>`** (`app/app.vue`): barra de progreso arriba mientras una navegación
  espera (la primera visita a una página baja su JS). No sale si la navegación tarda menos de 200 ms
  (`throttle`). `app/plugins/loading-indicator.client.ts` la termina cuando el router confirma la
  navegación: Nuxt la termina recién cuando se dibuja el `<NuxtPage>` más profundo, y
  `travels/[id]`, `quotations/[id]` y `profile` montan el suyo después de cargar sus datos (o
  nunca, en un viaje sin cotización), así que la barra se quedaba. La espera de datos la cubren los
  skeletons.
- **`useQueryLoadState(query)`** (`app/queries/load-state.ts`) da sus props desde un `useQuery`:
  `<LoadState v-bind="travelersLoad" label="los viajeros" @retry="refetchTravelers()">`.
  `isLoaded` es `data !== undefined` (`null` = "no hay" o "no existe" también es respuesta: el slot
  necesita su propio `v-if`). `loadError` se oculta mientras corre el reintento, para que vuelva el
  skeleton (en Colada, `status` sigue en `'error'` durante el reintento). Los catálogos usan la
  misma regla.
- Dos queries en una pantalla: dos `LoadState` anidados, cada uno con su mensaje y reintento. Una
  query desactivada sin datos (p. ej. totales de una página sin viajes) nunca carga: se le pasa
  `:is-loaded` a mano.
- **`EmptyState`** (`app/components/empty-state.vue`, sobre `UEmpty`): un texto por sección del CRM
  en `EMPTY_STATES` (`app/utils/empty-states.ts`); cada pantalla solo pone sus acciones.
  `section="noResults"` para listas filtradas sin filas. `compact` dentro de un panel pequeño.

### Más de 1000 filas

PostgREST corta en `max_rows = 1000` sin error. Lo que puede pasar de ahí se pide en tandas con
`fetchInBatches` (`app/utils/fetch-in-batches.ts`), ordenado por una llave única: pagos y
configuraciones de cuenta por viaje; viajeros, asignaciones de habitación, opt-outs y ajustes de
precio por viajero de un viaje (estos crecen con viajeros × servicios). Los listados de viajes se
paginan. Una lectura nueva por viaje que pueda pasar de 1000 filas tiene que ir en tandas.

Límite conocido: las tandas usan `offset`, así que si alguien agrega o borra filas del mismo viaje
justo entre dos tandas, una fila puede repetirse o faltar hasta el siguiente refetch. Solo pasa en
viajes de más de 1000 filas y con una escritura en esos milisegundos.

## Mapeo BD ↔ Dominio

`app/utils/mappers/` tiene un archivo por dominio (`provider-mappers.ts`, `travel-mappers.ts`, …),
auto-importados (`imports.dirs` en `nuxt.config.ts`). Proveen funciones bidireccionales:

```typescript
// BD → Dominio
mapProviderRowToDomain(row: Tables<'providers'>): Provider
mapTravelRowToDomain(row): Travel

// Dominio → BD (para insert/update)
mapProviderToInsert(data: Partial<Provider>): TablesInsert<'providers'>
mapTravelToInsert(data): TablesInsert<'travels'>
```

Los pagos a proveedores, hospedajes y buses comparten columnas: sus mappers toman los campos
comunes de `supplier-payment-mappers.ts` y solo agregan su llave padre.

---

## Auth y protección de rutas

`app/middleware/auth.global.ts` corre en cada navegación:

```typescript
const AUTH_PAGES = ['/login', '/register'];

// Sin sesión + ruta protegida → /login
// Con sesión + página de auth → /
```

La sesión se obtiene de `authStore.fetchSession()` que llama a `supabase.auth.getSession()`.

---

[← Componentes](./03-components.md) | [Volver al índice](./README.md) | [Siguiente: Validaciones →](./05-validations.md)
