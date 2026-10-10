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
│  PLUGIN: app/plugins/init-stores.client.ts                   │
│  - Al montar la app, carga todos los stores en paralelo      │
│  - fetchAll(): providers, buses, coordinators, hotelRooms,   │
│    travels, travelers, cotizaciones                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PINIA STORES (9 stores)                                     │
│  - Estado reactivo en memoria                                │
│  - Getters para vistas derivadas (filtros, cálculos)         │
│  - Actions async que llaman a Supabase                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ supabaseClient.from('tabla')
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL)                                       │
│  - Cliente singleton en app/composables/use-supabase.ts      │
│  - Todas las operaciones CRUD pasan por este cliente         │
│  - Mappers (app/utils/mappers.ts) convierten snake_case ↔   │
│    camelCase entre BD y dominio                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Ciclo de vida de datos

### Inicio de sesión

1. Usuario accede a `/login`
2. `auth-store.signIn()` llama a `supabase.auth.signInWithPassword()`
3. Supabase devuelve `session`
4. Middleware detecta sesión → redirige a `/`
5. Plugin `init-stores` ejecuta `fetchAll()` en paralelo en todos los stores
6. App lista para usar

### Operación CRUD típica (ejemplo: crear viaje)

1. Componente llama `travelsStore.addTravel(data)`
2. Store ejecuta inserts en Supabase (tablas: `travels`, `travel_activities`, `travel_services`, `travel_buses`, `travel_coordinators`)
3. Si hay error, store expone `error` y lanza excepción
4. Si éxito, store agrega el nuevo objeto al array local `travels[]`
5. Componente reacciona reactivamente (computed → template)

### Lectura de datos relacionados

El store de viajes carga relaciones en `fetchAll()` con joins:

```
travels
  ├─ travel_activities (itinerario)
  ├─ travel_services (servicios)
  ├─ travel_buses (con operadores)
  └─ travel_coordinators → coordinators (via join)
```

La cotización (`fetchByTravel`) usa caché interno para evitar llamadas duplicadas si múltiples componentes la solicitan simultáneamente.

---

## Carga de datos con Pinia Colada (en migración)

> **Estado:** la app todavía carga todo al arrancar con `init-stores.client.ts` (ver arriba).
> Pinia Colada se está introduciendo por fases; el plan está en
> `docs/features/pending/on-demand-data-loading/`. Esta sección fija las convenciones.

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

Los catálogos (proveedores, coordinadores…) sobrescriben `staleTime` con un valor largo por
query.

## Mapeo BD ↔ Dominio

`app/utils/mappers.ts` provee funciones bidireccionales:

```typescript
// BD → Dominio
mapProviderRowToDomain(row: Tables<'providers'>): Provider
mapTravelRowToDomain(row): Travel

// Dominio → BD (para insert/update)
mapProviderToInsert(data: Partial<Provider>): TablesInsert<'providers'>
mapTravelToInsert(data): TablesInsert<'travels'>
```

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
