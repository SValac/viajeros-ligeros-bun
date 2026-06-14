# Multi-Tenancy: Usuarios Independientes

## Objetivo

Permitir que múltiples usuarios se registren en `/register` y cada uno gestione sus propios datos de forma aislada: viajes, proveedores, coordinadores, camiones, cotizaciones, viajeros, pagos y galería.

## Estado actual

Single-admin. Las políticas RLS usan `USING (true)` — cualquier usuario autenticado ve y modifica todos los datos. La página `/register` ya existe.

---

## Mapa completo de tablas

### Tablas raíz — necesitan `owner_id` (columna nueva)

Solo 3 tablas son verdaderamente independientes. `buses` y `hotel_rooms` tienen `provider_id NOT NULL`, por lo que heredan propiedad via `providers`.

| Tabla | Motivo |
|---|---|
| `travels` | Sin FK a ninguna tabla del dominio |
| `providers` | Sin FK a ninguna tabla del dominio |
| `coordinators` | Sin FK a ninguna tabla del dominio |

### Tablas hijas — solo necesitan actualización de RLS

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
| `quotation_accommodation_details` | `quotation_accommodation_id` → `quotation_accommodations.quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `accommodation_payments` | `quotation_accommodation_id` → `quotation_accommodations.quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `bus_payments` | `quotation_bus_id` → `quotation_buses.quotation_id` → `quotations.travel_id` → `travels.owner_id` |
| `provider_payments` | `quotation_provider_id` → `quotation_providers.quotation_id` → `quotations.travel_id` → `travels.owner_id` |

**Storage:**

| Recurso | Cadena |
|---|---|
| `storage.objects` (bucket `travel-gallery`) | path prefix `{travelId}/` → `travels.owner_id` |

---

## Plan de implementación

### Fase 1 — Schema: columna `owner_id` en tablas raíz

```sql
ALTER TABLE public.travels      ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
ALTER TABLE public.providers    ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
ALTER TABLE public.coordinators ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
```

> `buses` y `hotel_rooms` no necesitan `owner_id` propio — heredan via `provider_id NOT NULL → providers.owner_id`.

### Fase 2 — RLS: políticas por usuario

Reemplazar todas las políticas `*_authenticated_all` existentes con políticas que filtren por dueño.

#### Tablas raíz

```sql
-- travels
DROP POLICY "travels_authenticated_all" ON public.travels;
CREATE POLICY "travels_owner" ON public.travels
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
-- La política anon_confirmed ya existente no cambia

-- providers
DROP POLICY "providers_authenticated_all" ON public.providers;
CREATE POLICY "providers_owner" ON public.providers
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- coordinators
DROP POLICY "coordinators_authenticated_all" ON public.coordinators;
CREATE POLICY "coordinators_owner" ON public.coordinators
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```

#### Hijas de `providers` (nivel 1)

```sql
-- buses
DROP POLICY "buses_authenticated_all" ON public.buses;
CREATE POLICY "buses_owner" ON public.buses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers WHERE id = provider_id AND owner_id = auth.uid()
  ));

-- hotel_rooms
DROP POLICY "hotel_rooms_authenticated_all" ON public.hotel_rooms;
CREATE POLICY "hotel_rooms_owner" ON public.hotel_rooms
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers WHERE id = provider_id AND owner_id = auth.uid()
  ));
```

#### Hijas de `hotel_rooms` (nivel 2)

```sql
-- hotel_room_types
DROP POLICY "hotel_room_types_authenticated_all" ON public.hotel_room_types;
CREATE POLICY "hotel_room_types_owner" ON public.hotel_room_types
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hotel_rooms h
    JOIN public.providers p ON p.id = h.provider_id
    WHERE h.id = hotel_room_id AND p.owner_id = auth.uid()
  ));
```

#### Hijas directas de `travels` (nivel 1)

```sql
-- travel_activities (mantiene la política anon_select existente)
DROP POLICY "travel_activities_authenticated_all" ON public.travel_activities;
CREATE POLICY "travel_activities_owner" ON public.travel_activities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_buses
DROP POLICY "travel_buses_authenticated_all" ON public.travel_buses;
CREATE POLICY "travel_buses_owner" ON public.travel_buses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_services (mantiene la política anon_select existente)
DROP POLICY "travel_services_authenticated_all" ON public.travel_services;
CREATE POLICY "travel_services_owner" ON public.travel_services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_accommodations
DROP POLICY "travel_accommodations_authenticated_all" ON public.travel_accommodations;
CREATE POLICY "travel_accommodations_owner" ON public.travel_accommodations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_coordinators
DROP POLICY "travel_coordinators_authenticated_all" ON public.travel_coordinators;
CREATE POLICY "travel_coordinators_owner" ON public.travel_coordinators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_media (mantiene la política anon_select existente)
DROP POLICY "travel_media_authenticated_all" ON public.travel_media;
CREATE POLICY "travel_media_owner" ON public.travel_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travelers
DROP POLICY "travelers_authenticated_all" ON public.travelers;
CREATE POLICY "travelers_owner" ON public.travelers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- traveler_account_configs
DROP POLICY "traveler_account_configs_authenticated_all" ON public.traveler_account_configs;
CREATE POLICY "traveler_account_configs_owner" ON public.traveler_account_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- payments
DROP POLICY "payments_authenticated_all" ON public.payments;
CREATE POLICY "payments_owner" ON public.payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- quotations
DROP POLICY "quotations_authenticated_all" ON public.quotations;
CREATE POLICY "quotations_owner" ON public.quotations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));
```

#### Hijas de `quotations` (nivel 2)

```sql
-- quotation_buses
DROP POLICY "quotation_buses_authenticated_all" ON public.quotation_buses;
CREATE POLICY "quotation_buses_owner" ON public.quotation_buses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_accommodations
DROP POLICY "quotation_accommodations_authenticated_all" ON public.quotation_accommodations;
CREATE POLICY "quotation_accommodations_owner" ON public.quotation_accommodations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_providers
DROP POLICY "quotation_providers_authenticated_all" ON public.quotation_providers;
CREATE POLICY "quotation_providers_owner" ON public.quotation_providers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_public_prices
DROP POLICY "quotation_public_prices_authenticated_all" ON public.quotation_public_prices;
CREATE POLICY "quotation_public_prices_owner" ON public.quotation_public_prices
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));
```

#### Hijas de nivel 3 (pagos y detalles de cotización)

```sql
-- quotation_accommodation_details
DROP POLICY "quotation_accommodation_details_authenticated_all" ON public.quotation_accommodation_details;
CREATE POLICY "quotation_accommodation_details_owner" ON public.quotation_accommodation_details
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_accommodations qa
    JOIN public.quotations q ON q.id = qa.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qa.id = quotation_accommodation_id AND t.owner_id = auth.uid()
  ));

-- accommodation_payments
DROP POLICY "accommodation_payments_authenticated_all" ON public.accommodation_payments;
CREATE POLICY "accommodation_payments_owner" ON public.accommodation_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_accommodations qa
    JOIN public.quotations q ON q.id = qa.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qa.id = quotation_accommodation_id AND t.owner_id = auth.uid()
  ));

-- bus_payments
DROP POLICY "bus_payments_authenticated_all" ON public.bus_payments;
CREATE POLICY "bus_payments_owner" ON public.bus_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_buses qb
    JOIN public.quotations q ON q.id = qb.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qb.id = quotation_bus_id AND t.owner_id = auth.uid()
  ));

-- provider_payments
DROP POLICY "provider_payments_authenticated_all" ON public.provider_payments;
CREATE POLICY "provider_payments_owner" ON public.provider_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_providers qp
    JOIN public.quotations q ON q.id = qp.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qp.id = quotation_provider_id AND t.owner_id = auth.uid()
  ));
```

### Fase 3 — Repositories: poblar `owner_id` al insertar

Solo **3 repositorios** necesitan cambios (los que insertan en tablas raíz):

| Repositorio | Función | Tabla |
|---|---|---|
| `use-travel-repository.ts` | `insertTravel()` | `travels` |
| `use-provider-repository.ts` | `insert()` | `providers` |
| `use-coordinator-repository.ts` | `insert()` | `coordinators` |

`use-bus-repository.ts` y `use-hotel-room-repository.ts` **no necesitan cambios** — sus tablas heredan via `providers`.

```ts
// Patrón para los 3 repositorios afectados
const user = useSupabaseUser();

await supabase.from('travels').insert({
  ...mapTravelToInsert(data),
  owner_id: user.value!.id,
});
```

### Fase 4 — Datos existentes

Antes de aplicar `NOT NULL`, asignar los datos actuales al admin original:

```sql
-- Obtener el ID del admin: SELECT id FROM auth.users LIMIT 1;
UPDATE public.travels      SET owner_id = '<admin-user-id>' WHERE owner_id IS NULL;
UPDATE public.providers    SET owner_id = '<admin-user-id>' WHERE owner_id IS NULL;
UPDATE public.coordinators SET owner_id = '<admin-user-id>' WHERE owner_id IS NULL;
```

### Fase 5 — Storage: RLS por dueño del viaje

La política actual `gallery_authenticated_all` permite que cualquier usuario autenticado opere sobre cualquier archivo del bucket `travel-gallery`. El path de cada archivo incluye el `travelId` como primer segmento (`{travelId}/images/...`, `{travelId}/banner/...`), lo que permite validarlo en RLS.

```sql
-- Eliminar política actual
DROP POLICY "gallery_authenticated_all" ON storage.objects;

-- Nueva política: solo puedes operar archivos de tus propios viajes
CREATE POLICY "gallery_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'travel-gallery'
    AND EXISTS (
      SELECT 1 FROM public.travels
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'travel-gallery'
    AND EXISTS (
      SELECT 1 FROM public.travels
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND owner_id = auth.uid()
    )
  );

-- Anon sigue con read-only sin cambios
```

> `name` en `storage.objects` es el path relativo dentro del bucket. `(string_to_array(name, '/'))[1]` extrae el primer segmento = `travelId`.

---

## Consideraciones

- **Página de registro**: ya existe en `/register` — revisar que no haya lógica que asuma single-admin.
- **No usar `user_metadata`** para autorización en RLS — es editable por el usuario. Usar solo `auth.uid()`.
- **Landing page (anon)**: las políticas `anon` en `travels`, `travel_activities`, `travel_services` y `travel_media` ya filtran por `status = 'confirmed'` — seguirán funcionando sin cambios.
- **Políticas existentes que se conservan**: `travels_anon_confirmed`, `travel_activities_anon_select`, `travel_services_anon_select`, `travel_media_anon_select`, `gallery_anon_select`.

---

## Orden recomendado de implementación

1. **Fase 4 primero** si hay datos existentes (backfill antes de agregar `NOT NULL`)
2. **Fase 1**: agregar `owner_id` a `travels`, `providers`, `coordinators`
3. **Fase 2**: reemplazar RLS en todas las tablas (se puede hacer en una sola migración)
4. **Fase 3**: actualizar los 3 repositorios
5. **Fase 5**: actualizar Storage RLS
6. **UI**: verificar que no queden queries que filtren datos de otros usuarios
