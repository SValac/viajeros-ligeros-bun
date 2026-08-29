# Fase 2 — Segundo eje de RLS: lectura

**Estado:** Pendiente
**Dependencia:** Fase 1 (los helpers `private.*`)
**Migración:** `supabase migration new coordinator_rls_read`

---

## Objetivo

Abrir el acceso de **solo lectura** del coordinador a los viajes que tiene asignados, sin
exponer una sola columna financiera. Nada de escritura todavía — eso es la Fase 3.

**Principio de la fase:** todas las políticas nuevas son **aditivas**. Las `*_owner`
existentes no se tocan. Las policies permissive de Postgres se combinan con `OR`, así que
el admin conserva exactamente el acceso que ya tiene.

---

## El problema de columnas, tabla por tabla

RLS filtra **filas**, no columnas, y admin y coordinador comparten el rol `authenticated`
(así que un `GRANT` por columnas tampoco sirve — a diferencia de la Fase 0 con `anon`).
Entonces cada tabla cae en uno de dos grupos:

| Tabla | Columnas financieras | Estrategia |
|---|---|---|
| `travels` | `total_operation_cost`, `projected_profit`, `internal_notes` | 🔒 **Vista** |
| `travel_buses` | `rental_price` | 🔒 **Vista** |
| `travel_activities` | ninguna | ✅ Policy directa |
| `travelers` | ninguna | ✅ Policy directa |
| `travel_media` | ninguna | ✅ Policy directa |
| `travel_accommodations` | ninguna | ✅ Policy directa |
| `travel_services` | ninguna | ✅ Policy directa |
| `travel_coordinators` | ninguna | ✅ Policy directa |
| `quotations`, `payments`, `*_payments` | todas | ❌ **Sin política. No se tocan.** |

Las tablas del último grupo simplemente no reciben policy: sin policy, el coordinador no
las puede leer. **El fail-closed hace el trabajo.**

---

## Bloque 1: vistas con lista de columnas explícita

```sql
CREATE VIEW public.coordinator_travels
WITH (security_barrier = true) AS
SELECT
  t.id, t.destination, t.start_date, t.end_date, t.price, t.description,
  t.image_url, t.status, t.minimum_seats, t.accumulated_travelers,
  t.created_at, t.updated_at
FROM public.travels t
WHERE private.is_travel_coordinator(t.id);

CREATE VIEW public.coordinator_travel_buses
WITH (security_barrier = true) AS
SELECT
  tb.id, tb.travel_id, tb.bus_id, tb.provider_id,
  tb.model, tb.brand, tb.year, tb.seat_count,
  tb.operator1_name, tb.operator1_phone,
  tb.operator2_name, tb.operator2_phone
FROM public.travel_buses tb
WHERE private.is_travel_coordinator(tb.travel_id);

REVOKE ALL ON public.coordinator_travels      FROM anon, public;
REVOKE ALL ON public.coordinator_travel_buses FROM anon, public;
GRANT SELECT ON public.coordinator_travels      TO authenticated;
GRANT SELECT ON public.coordinator_travel_buses TO authenticated;
```

Excluido de `coordinator_travels`: `total_operation_cost`, `projected_profit`,
`internal_notes`, `owner_id`. `price` sí va — es el precio de venta al público, no un
costo (mismo criterio que la Fase 0).

Excluido de `coordinator_travel_buses`: `rental_price` — es lo que la agencia le paga al
proveedor del autobús. Los datos de los operadores (nombre + teléfono de los choferes) sí
van: son justamente lo que un coordinador necesita en ruta.

### ⚠️ Estas vistas usan `security_invoker = false` a propósito

Es el **default** de Postgres, y contradice la recomendación general de usar
`security_invoker = true`. La excepción es deliberada y hay que entender por qué:

Con `security_invoker = true` la vista respeta el RLS de `travels` para el usuario que
consulta. Como el coordinador **no tiene ninguna policy sobre `travels`**, la vista
devolvería 0 filas: inútil. Y si le diéramos esa policy, podría consultar la tabla
directamente por PostgREST y leer las columnas financieras — que es precisamente lo que
estamos evitando.

Entonces: la vista corre como su dueño (`postgres`) y **su cláusula `WHERE` es la frontera
de seguridad**. De ahí las tres mitigaciones:

1. **`security_barrier = true`** — impide que Postgres empuje operadores baratos del
   usuario por debajo del filtro (canal lateral clásico de vistas con filtro de seguridad).
2. **Lista de columnas explícita**, nunca `SELECT *` — si mañana se agrega una columna
   financiera a `travels`, la vista **no** la filtra sola.
3. **`REVOKE ... FROM anon, public`** — Supabase concede privilegios por defecto sobre
   objetos nuevos en `public`; hay que revocar explícitamente.

> **Regla para el futuro:** cualquier columna nueva en `travels` o `travel_buses` obliga a
> decidir conscientemente si entra a estas vistas. Anotarlo en el checklist de code review.

> **Alternativa equivalente:** un RPC `SECURITY DEFINER` que devuelva `jsonb`, igual que
> `redeem_travel_access`. La vista se eligió porque PostgREST le da filtrado, orden y
> paginación gratis a la app móvil, y no necesita un mapper nuevo del lado del cliente.

---

## Bloque 2: policies `SELECT` directas

```sql
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

Todas usan `is_travel_coordinator` (membresía pura, sin filtro de estado): el coordinador
conserva el historial de viajes ya `completed`.

---

## Bloque 3: dos decisiones abiertas

### 3a. ¿Ve a sus compañeros de coordinación?

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
la agencia sobre esa persona (desempeño, condiciones de pago), esto es una fuga y hace
falta una **tercera vista** `coordinator_colleagues` con columnas explícitas
(`id, name, phone, email`) en vez de la policy directa.

**Decisión pendiente:** ¿qué guarda hoy `coordinators.notes`?

### 3b. ¿Ve los datos de los proveedores?

Para mostrar el nombre y contacto del hotel, el coordinador necesita leer `providers`
(que no tiene columnas de costo — los costos viven en `quotation_*`):

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

Nota que se limita a los proveedores **usados por sus viajes** — no al catálogo completo de
la agencia. Si la app móvil no muestra datos del hotel, omitir esta policy.

Ambas son acotables: es más fácil agregarlas después que sacarlas una vez que la app
depende de ellas. **Ante la duda, no las incluyas.**

---

## Gotchas

1. **`travelers` incluye `phone` de los viajeros.** Es dato personal, pero es exactamente
   lo que un coordinador necesita en ruta. Se expone a propósito; queda anotado porque es
   la información más sensible que esta fase abre.

2. **Los tipos generados van a incluir las vistas.** Después de `bun run db:types`,
   `coordinator_travels` aparece en `database.types.ts` bajo `Views`, no `Tables`. Si se
   consume desde la app web hay que tiparlo desde ahí.

3. **No agregar policy a `travels` "por conveniencia".** Es el error que anula toda la
   fase: bastaría una sola policy `SELECT` sobre `travels` para que el coordinador pueda
   pedir `projected_profit` directo por PostgREST, dejando las vistas de adorno.

4. **`max_rows = 1000`** en `config.toml` aplica también a las vistas.

---

## Verificación

Con el usuario coordinador de prueba de la Fase 1, asignado a un viaje A y **no** asignado
a un viaje B:

- [ ] `SELECT * FROM coordinator_travels` → solo el viaje A
- [ ] La respuesta **no** trae `projected_profit`, `total_operation_cost`, `internal_notes`
- [ ] `SELECT * FROM travels` → **0 filas** (sigue sin acceso a la tabla)
- [ ] `SELECT projected_profit FROM travels` → 0 filas o error, nunca un número
- [ ] `SELECT * FROM coordinator_travel_buses` → buses del viaje A, **sin** `rental_price`
- [ ] `SELECT * FROM travel_buses` → 0 filas
- [ ] `travel_activities` / `travelers` / `travel_media` → solo filas del viaje A
- [ ] Ninguna fila del viaje B en ninguna consulta
- [ ] `SELECT * FROM quotations` → **0 filas**
- [ ] `SELECT * FROM payments` → **0 filas**
- [ ] `SELECT * FROM provider_payments / bus_payments / accommodation_payments` → **0 filas**
- [ ] `SELECT * FROM buses / hotel_rooms` → **0 filas**
- [ ] **Escritura todavía bloqueada:** `UPDATE travel_activities SET title='x'` → 0 filas
- [ ] Como admin dueño: la web sigue igual, sin regresiones
- [ ] Como `anon`: las vistas dan `permission denied`
- [ ] `EXPLAIN ANALYZE` de una consulta a `coordinator_travels`: el helper no se reevalúa
      por fila
- [ ] Advisors sin hallazgos nuevos (prestar atención a warnings de vistas)

---

## Comandos (los corre el usuario)

```bash
supabase migration new coordinator_rls_read
bun run db:reset
bun run db:types
bun run typecheck
supabase db advisors --local
```
