# Fase 2 — Segundo eje de RLS: lectura

**Estado:** Pendiente
**Dependencia:** Fase 1 (los helpers `private.*`) · **y el
[saneamiento del modelo de datos](../../completed/data-model-cleanup-PLAN.md) mergeado a `main`**
**Migración:** `supabase migration new coordinator_rls_read`

---

## Objetivo

Abrir el acceso de **solo lectura** del coordinador a los viajes que tiene asignados. Nada
de escritura todavía — eso es la Fase 3.

**Principio de la fase:** todas las políticas nuevas son **aditivas**. Las `*_owner`
existentes no se tocan. Las policies permissive de Postgres se combinan con `OR`, así que
el admin conserva exactamente el acceso que ya tiene.

---

## ⚠️ Requisito: el saneamiento del modelo de datos va primero

Esta fase asume que ya corrieron las Fases 1-3 de
[saneamiento del modelo de datos](../../completed/data-model-cleanup-PLAN.md):

- `travels` ya **no** tiene `total_operation_cost`, `projected_profit` ni `internal_notes`
  (viven en `travel_internals`)
- `travel_buses` ya **no** tiene `rental_price`

Si esas migraciones no están aplicadas, **estas policies filtran datos financieros**.
Verificar antes de escribir una sola línea:

```sql
-- Las dos deben devolver 0 filas
SELECT column_name FROM information_schema.columns
WHERE table_name = 'travels'
  AND column_name IN ('total_operation_cost', 'projected_profit', 'internal_notes');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'travel_buses' AND column_name = 'rental_price';
```

> **Contexto histórico:** una versión anterior de este plan resolvía el problema con dos
> vistas (`coordinator_travels`, `coordinator_travel_buses`) y `security_invoker = false`,
> porque RLS filtra filas y no columnas. Se descartó a favor de separar las columnas aguas
> arriba: aquello era **fail-open** (una columna financiera nueva en `travels` no se
> filtraba sola), esto es **fail-safe**. Si por algún motivo el saneamiento no se hiciera,
> ese enfoque sigue documentado en el historial de git de este archivo.

---

## Las tablas de esta fase

Con las columnas financieras fuera del camino, **todas** las tablas operativas van con
policy directa. No hacen falta vistas ni excepciones.

| Tabla | Acceso del coordinador |
|---|---|
| `travels` | ✅ Policy `SELECT` |
| `travel_buses` | ✅ Policy `SELECT` |
| `travel_activities` | ✅ Policy `SELECT` |
| `travelers` | ✅ Policy `SELECT` |
| `travel_media` | ✅ Policy `SELECT` |
| `travel_accommodations` | ✅ Policy `SELECT` |
| `travel_services` | ✅ Policy `SELECT` |
| `travel_coordinators` | ✅ Policy `SELECT` |
| `travel_internals` | ❌ **Sin política** |
| `quotations`, `quotation_*` | ❌ **Sin política** |
| `payments`, `provider_payments`, `bus_payments`, `accommodation_payments` | ❌ **Sin política** |
| `buses`, `hotel_rooms`, `hotel_room_types` | ❌ **Sin política** |

Las del último grupo simplemente no reciben policy: sin policy, el coordinador no las puede
leer. **El fail-closed hace el trabajo.**

---

## Bloque 1: el viaje y sus tablas hijas

```sql
-- travels: el encabezado. Ya no tiene columnas financieras.
CREATE POLICY "travels_coordinator_select" ON public.travels
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(id));

-- travel_buses: operadores y datos del vehículo. Ya no tiene rental_price.
CREATE POLICY "travel_buses_coordinator_select" ON public.travel_buses
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_activities_coordinator_select" ON public.travel_activities
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travelers_coordinator_select" ON public.travelers
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_media_coordinator_select" ON public.travel_media
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_accommodations_coordinator_select" ON public.travel_accommodations
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_services_coordinator_select" ON public.travel_services
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_coordinators_coordinator_select" ON public.travel_coordinators
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));
```

Ojo con la primera: sobre `travels` la columna es **`id`**, no `travel_id`.

Todas usan `is_travel_coordinator` (membresía pura, sin filtro de estado): el coordinador
conserva el historial de los viajes ya `completed`.

**`travel_internals` no recibe policy.** Es lo que mantiene los costos y el margen fuera de
su alcance — y ahora es una propiedad del esquema, no de una lista de columnas que alguien
tiene que mantener.

---

## Bloque 2: proveedores (confirmado) y compañeros (abierto)

### 2a. ¿Ve a sus compañeros de coordinación?

Para mostrar "quién más coordina este viaje" hace falta leer `coordinators`:

```sql
CREATE POLICY "coordinators_coordinator_select" ON public.coordinators
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_coordinators tc
    WHERE tc.coordinator_id = coordinators.id
      AND private.is_travel_coordinator(tc.travel_id)
  ));
```

Esta policy además le permite leer **su propia fila**, que la app va a necesitar para la
pantalla de perfil.

⚠️ **Pero `coordinators` tiene `notes` y `age`.** Si `notes` son observaciones internas de
la agencia sobre esa persona (desempeño, condiciones de pago), esto es una fuga — y es
**exactamente el mismo problema** que el saneamiento acaba de resolver en `travels`.

**La solución consistente no es una vista, es aplicar el mismo criterio:** mover `notes` (y
`age`, si tampoco es operativo) a una tabla `coordinator_internals`, igual que
`travel_internals`. Es una migración de la misma forma que la Fase 1 del saneamiento, y
deja el modelo coherente.

**Decisión pendiente:** ¿qué guarda hoy `coordinators.notes`? Si es información interna, la
separación va **antes** de esta policy.

### 2b. Datos de los proveedores — ✅ **confirmado: sí**

Decisión del usuario (2026-08-29): *"`travel_buses` es para saber qué autobuses están
registrados en ese viaje, y de qué agencia son — eso es totalmente visible para el
coordinador. Lo único que no debería poder ver es el costo del autobús que se pone cuando
se hace la cotización."*

Saber **de qué agencia** es el autobús exige leer `providers`. La tabla no tiene columnas de
costo (viven en `quotation_*`), así que se expone entera, acotada a los proveedores usados
por sus viajes:

```sql
CREATE POLICY "providers_coordinator_select" ON public.providers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_accommodations ta
    WHERE ta.provider_id = providers.id AND private.is_travel_coordinator(ta.travel_id)
  ) OR EXISTS (
    SELECT 1 FROM public.travel_buses tb
    WHERE tb.provider_id = providers.id AND private.is_travel_coordinator(tb.travel_id)
  ));
```

Se limita a los proveedores **usados por sus viajes**, no al catálogo completo de la
agencia. Cubre tanto la agencia del autobús como el hotel — ambos son datos operativos que
el coordinador necesita en ruta.

### 🔴 Consecuencia para el saneamiento: `travel_buses` NO debe perder sus columnas

Esta decisión **invalida la Fase 4 (opcional) del
[saneamiento](../../completed/data-model-cleanup-PLAN.md)** tal como está escrita.

Esa fase proponía quitar de `travel_buses` las columnas que "duplican" `quotation_buses`:
`provider_id`, `model`, `seat_count`. Pero el coordinador **no tiene ni puede tener acceso a
`quotation_buses`** — es la tabla donde vive el costo. Si esas columnas se van, la
información que el usuario acaba de confirmar como visible deja de ser alcanzable.

**La duplicación no es redundancia: es la proyección operativa del autobús, del lado
correcto de la frontera de seguridad.** `quotation_buses` es la vista comercial (admin);
`travel_buses` es la vista operativa (admin + coordinador). Que ambas tengan el número de
unidad y la capacidad es deliberado, no un descuido.

Lo que sí hay que corregir es un bug real de esa duplicación: **`updateBus`
(`use-quotation-repository.ts:588-630`) sincroniza únicamente `rental_price`**. Si el admin
cambia `provider_id`, `unit_number` o `capacity` en la cotización, `travel_buses` queda
desactualizado en silencio — y `seat_count` alimenta el mapa de asientos
(`traveler-form.vue:58`, `travelers/index.vue:798`), así que una capacidad vieja es un bug
visible para el usuario.

**Reescribir la Fase 4 del saneamiento como "arreglar la sincronización", no como "quitar
las columnas".**

---

## Gotchas

1. **Las policies que consultan otras tablas están sujetas al RLS de esas tablas.** Es la
   razón por la que los helpers son `SECURITY DEFINER`. La policy de `providers` (2b)
   funciona porque el coordinador ya tiene policy sobre `travel_accommodations` y
   `travel_buses` gracias al Bloque 1 — si se omitiera alguna, esa mitad devolvería
   siempre `false` **sin ningún error**.

2. **`travelers` incluye `phone` de los viajeros.** Es dato personal, pero es exactamente
   lo que un coordinador necesita en ruta. Se expone a propósito; queda anotado porque es
   la información más sensible que esta fase abre.

3. **`travel_internals` necesita RLS habilitado y sin policy para coordinadores.** Sonaría
   redundante decirlo, pero es el punto que sostiene toda la separación: si alguien le
   agrega una policy "para que el coordinador vea el presupuesto", vuelve el problema
   original.

4. **`max_rows = 1000`** en `config.toml` aplica a todas estas consultas.

---

## Verificación

Con el usuario coordinador de prueba de la Fase 1, asignado a un viaje A y **no** asignado
a un viaje B:

- [ ] Las dos queries de `information_schema` del requisito devuelven 0 filas
- [ ] `SELECT * FROM travels` → **solo el viaje A**
- [ ] La respuesta de `travels` no incluye columnas financieras (ya no existen en la tabla)
- [ ] `SELECT * FROM travel_internals` → **0 filas**
- [ ] `SELECT * FROM travel_buses` → buses del viaje A, sin columnas de costo
- [ ] `travel_activities` / `travelers` / `travel_media` / `travel_accommodations` /
      `travel_services` → solo filas del viaje A
- [ ] Ninguna fila del viaje B en ninguna consulta
- [ ] `SELECT * FROM quotations` → **0 filas**
- [ ] `SELECT * FROM payments` → **0 filas**
- [ ] `SELECT * FROM provider_payments / bus_payments / accommodation_payments` → **0 filas**
- [ ] `SELECT * FROM buses / hotel_rooms / hotel_room_types` → **0 filas**
- [ ] `SELECT * FROM travel_access_codes` → **0 filas**
- [ ] **Escritura todavía bloqueada:** `UPDATE travel_activities SET title='x'` → 0 filas
- [ ] Como admin dueño: la web sigue igual, sin regresiones
- [ ] Como `anon`: sin cambios respecto de antes de esta fase
- [ ] `EXPLAIN ANALYZE` de `SELECT * FROM travels` como coordinador: el helper no se
      reevalúa por fila
- [ ] Advisors sin hallazgos nuevos

---

## Comandos (los corre el usuario)

```bash
supabase migration new coordinator_rls_read
bun run db:reset
bun run db:types
bun run typecheck
supabase db advisors --local
```
