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
