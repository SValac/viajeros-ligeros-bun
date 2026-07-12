# Multi-Tenancy: Usuarios Independientes

## Estado: ✅ IMPLEMENTADO (2026-06-14)

### Commits
- `a84252d` fix(migrations): make storage bucket insertion idempotent
- `08f9b5a` feat(multi-tenancy): implement owner-based row and storage policies
- `1622f62` feat(repositories): enforce owner_id on insert operations

---

## Objetivo

Permitir que múltiples usuarios se registren en `/register` y cada uno gestione sus propios datos de forma aislada: viajes, proveedores, coordinadores, camiones, cotizaciones, viajeros, pagos y galería.

---

## Mapa completo de tablas

### Tablas raíz — tienen `owner_id NOT NULL`

| Tabla | Migración |
|---|---|
| `travels` | `20260614225929` |
| `providers` | `20260614225929` |
| `coordinators` | `20260614225929` |

### Tablas hijas — aisladas por RLS via EXISTS chain

**Nivel 1** (JOIN directo a raíz):

| Tabla | FK que usa | Raíz final |
|---|---|---|
| `buses` | `provider_id` | `providers.owner_id` |
| `hotel_rooms` | `provider_id` | `providers.owner_id` |
| `travel_activities` | `travel_id` | `travels.owner_id` |
| `travel_buses` | `travel_id` | `travels.owner_id` |
| `travel_services` | `travel_id` | `travels.owner_id` |
| `travel_accommodations` | `travel_id` | `travels.owner_id` |
| `travel_coordinators` | `travel_id` | `travels.owner_id` |
| `travel_media` | `travel_id` | `travels.owner_id` |
| `travelers` | `travel_id` | `travels.owner_id` |
| `traveler_account_configs` | `travel_id` | `travels.owner_id` |
| `payments` | `travel_id` | `travels.owner_id` |
| `quotations` | `travel_id` | `travels.owner_id` |

**Nivel 2** (2 JOINs):

| Tabla | Cadena FK |
|---|---|
| `hotel_room_types` | `hotel_room_id` → `hotel_rooms.provider_id` → `providers.owner_id` |
| `quotation_buses` | `quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `quotation_accommodations` | `quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `quotation_providers` | `quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `quotation_public_prices` | `quotation_id` → `quotations.travel_id` → `travels.owner_id` |

**Nivel 3** (3 JOINs):

| Tabla | Cadena FK |
|---|---|
| `quotation_accommodation_details` | `quotation_accommodation_id` → `quotation_accommodations` → `quotations` → `travels.owner_id` |
| `accommodation_payments` | `quotation_accommodation_id` → `quotation_accommodations` → `quotations` → `travels.owner_id` |
| `bus_payments` | `quotation_bus_id` → `quotation_buses` → `quotations` → `travels.owner_id` |
| `provider_payments` | `quotation_provider_id` → `quotation_providers` → `quotations` → `travels.owner_id` |

**Storage:**

| Recurso | Política |
|---|---|
| `storage.objects` (bucket `travel-gallery`) | `gallery_owner_all` — filtra por `travels.owner_id` via path prefix `{travelId}/` |

---

## Migraciones aplicadas

| Archivo | Descripción |
|---|---|
| `20260614225929_multitenant_owner_rls.sql` | `owner_id` nullable en 3 tablas + 24 políticas RLS `*_owner` |
| `20260614230048_multitenant_owner_not_null.sql` | `owner_id SET NOT NULL` en 3 tablas |
| `20260614234026_multitenant_storage_rls.sql` | Storage RLS `gallery_owner_all` |

## Archivos de código modificados

| Archivo | Cambio |
|---|---|
| `app/composables/travels/use-travel-repository.ts` | `insertTravel()` agrega `owner_id: authStore.user!.id` |
| `app/composables/providers/use-provider-repository.ts` | `insert()` agrega `owner_id: authStore.user!.id` |
| `app/composables/coordinators/use-coordinator-repository.ts` | `insert()` agrega `owner_id: authStore.user!.id` |
| `app/utils/mappers.ts` | `mapTravelToInsert`, `mapProviderToInsert`, `mapCoordinatorToInsert` excluyen `owner_id` de su tipo de retorno |
| `app/types/database.types.ts` | Regenerado con `bun run db:types` — incluye `owner_id` en Row/Insert/Update de las 3 tablas |

---

## Notas de implementación

- **Auth en repositories**: se usa `useAuthStore()` al nivel de setup del composable (no `useSupabaseUser()` — no está en uso en este proyecto)
- **`buses` y `hotel_rooms`** no necesitan `owner_id` propio — heredan via `provider_id NOT NULL → providers.owner_id`
- **Políticas anon preservadas**: `travels_anon_confirmed`, `travel_activities_anon_select`, `travel_services_anon_select`, `travel_media_anon_select`, `gallery_anon_select`
- **Remote**: reset con `supabase db reset --linked --no-seed` para evitar que el seed corra
- **Bucket idempotente**: `20260506230530` usa `ON CONFLICT (id) DO NOTHING` para evitar error en re-runs

---

## Bug fix: store cache leak on logout

`handleLogout` en `user-menu.vue` usaba `router.push('/login')` (navegación client-side) — los stores de Pinia no se limpiaban entre usuarios. Fix: `window.location.href = '/login'` para forzar full page reload.

Commit: `1b67e7a fix(auth): force full page reload on logout to clear Pinia store cache`

**Verificado**: aislamiento completo entre isaac@gmail.com y ale@gmail.com confirmado en producción.
