# Multi-Tenancy: Usuarios Independientes

## Objetivo

Permitir que múltiples usuarios se registren en `/register` y cada uno gestione sus propios datos de forma aislada: viajes, proveedores, coordinadores, camiones, cotizaciones, viajeros, pagos y galería.

## Estado actual

Single-admin. Las políticas RLS usan `USING (true)` — cualquier usuario autenticado ve y modifica todos los datos. La página `/register` ya existe.

---

## Plan de implementación

### Fase 1 — Schema: columna `owner_id` en tablas raíz

Agregar `owner_id uuid NOT NULL REFERENCES auth.users(id)` a las tablas que son raíz de su dominio:

| Tabla | Notas |
|---|---|
| `travels` | Raíz principal — la mayoría de tablas dependen de esta |
| `providers` | Independiente |
| `coordinators` | Independiente |
| `buses` | Independiente |

Las tablas **hijas no necesitan** `owner_id` — se aíslan via FK al padre:
- `travelers`, `travel_buses`, `travel_activities`, `travel_services`, `travel_accommodations`, `travel_media` → filtran por `travel_id` → `travels.owner_id`
- `quotations`, `quotation_buses`, `quotation_accommodations`, `quotation_providers`, `quotation_public_prices` → filtran por `travel_id`
- `payments`, `traveler_account_configs`, `accommodation_payments`, `bus_payments`, `provider_payments` → filtran por `travel_id`

```sql
ALTER TABLE public.travels     ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
ALTER TABLE public.providers   ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
ALTER TABLE public.coordinators ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
ALTER TABLE public.buses       ADD COLUMN owner_id uuid NOT NULL REFERENCES auth.users(id);
```

### Fase 2 — RLS: políticas por usuario

Reemplazar las políticas `authenticated_all` en tablas raíz:

```sql
-- Tablas raíz: solo ves lo tuyo
CREATE POLICY "travels_owner" ON public.travels
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Mismo patrón para providers, coordinators, buses
```

Tablas hijas: filtrar por JOIN al padre:

```sql
-- Ejemplo: travelers
CREATE POLICY "travelers_owner" ON public.travelers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels
    WHERE id = travel_id AND owner_id = auth.uid()
  ));
```

### Fase 3 — Stores/Repositories: poblar `owner_id` al insertar

En cada repositorio que hace INSERT en tablas raíz, agregar `owner_id: useSupabaseUser().value?.id`:

```ts
// use-travel-repository.ts
await supabase.from('travels').insert({
  ...data,
  owner_id: useSupabaseUser().value!.id,
});
```

### Fase 4 — Datos existentes

Si hay datos en producción sin `owner_id`, asignarlos al admin original antes de aplicar `NOT NULL`:

```sql
UPDATE public.travels SET owner_id = '<admin-user-id>' WHERE owner_id IS NULL;
```

---

## Consideraciones

- **Página de registro**: ya existe en `/register` — revisar que no haya lógica que asuma single-admin.
- **No usar `user_metadata`** para autorización en RLS — es editable por el usuario. Usar solo `auth.uid()`.
- **Storage `travel-gallery`**: las políticas actuales son por bucket, no por usuario. Cuando se implemente multi-tenancy, el `storage_path` ya incluye `travel_id` como prefijo — agregar RLS a `storage.objects` filtrando por `owner_id` del viaje correspondiente.
- **Landing page (anon)**: las políticas `anon` en `travels` y tablas públicas ya filtran por `status = 'confirmed'` — seguirán funcionando sin cambios.

---

## Orden recomendado de implementación

1. Empezar por `travels` (impacta todo el sistema)
2. Luego `providers`, `coordinators`, `buses` (independientes entre sí)
3. Tablas hijas de `travels` (en lote, son mecánicas)
4. Storage
5. UI: ocultar datos de otros usuarios si quedara algún leak en consultas
