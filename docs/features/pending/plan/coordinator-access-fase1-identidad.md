# Fase 1 — Identidad del coordinador

**Estado:** Pendiente
**Dependencia:** Ninguna
**Migración:** `supabase migration new coordinator_identity`

---

## Objetivo

Darle al coordinador una identidad de Supabase Auth vinculada a su registro existente, y
crear los dos helpers que van a usar **todas** las políticas de las Fases 2 y 3.

Esta fase **no otorga ningún permiso nuevo**. Al terminarla, un coordinador logueado sigue
sin ver nada — y eso es exactamente lo que hay que verificar. Los permisos llegan en la
Fase 2.

---

## Bloque 1: vincular `coordinators` a `auth.users`

```sql
ALTER TABLE public.coordinators
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
```

Tres decisiones dentro de esa línea:

- **`NULL` permitido, a propósito.** `coordinators` es el directorio de la agencia y sigue
  siendo la fuente de verdad de los datos del coordinador (`name`, `age`, `phone`,
  `notes`). La cuenta es un **añadido opcional**: se siguen dando de alta coordinadores
  como hoy, y solo se invita a la app a los que corresponda. Nada del flujo actual se
  rompe.
- **`UNIQUE`.** Un usuario de auth no puede estar vinculado a dos registros de coordinador.
  Además crea el índice que los helpers necesitan (ver Bloque 3).
- **`ON DELETE SET NULL`.** Si se borra el usuario de auth, el registro del coordinador
  sobrevive con su historial y sus asignaciones; simplemente pierde el acceso a la app.
  Con `CASCADE` se perdería el registro entero del directorio.

> **Nota multi-tenant:** `coordinators.owner_id` sigue siendo la agencia dueña del
> registro. `user_id` es la persona que se loguea. Son dos cosas distintas y ambas
> conviven.

---

## Bloque 2: schema `private` para los helpers

```sql
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
```

**Por qué un schema aparte y no `public`:** los helpers son `SECURITY DEFINER`, y una
función `SECURITY DEFINER` en un schema expuesto queda publicada como endpoint RPC de
PostgREST. Estos helpers no son endpoints — son detalle interno de las políticas.

`supabase/config.toml` expone solo `["public", "graphql_public"]`, así que `private` queda
fuera de la API automáticamente. El `GRANT USAGE` es necesario igual: las expresiones de
una policy RLS se evalúan **con los privilegios del rol que consulta**, así que
`authenticated` tiene que poder llegar a la función.

> Esto es distinto de los RPCs de la feature de código de acceso
> (`redeem_travel_access`, etc.), que **sí** van en `public` porque su propósito *es* ser
> endpoints.

---

## Bloque 3: los dos helpers

```sql
-- Membresía pura: ¿este usuario coordina este viaje?
CREATE OR REPLACE FUNCTION private.is_travel_coordinator(p_travel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_coordinators tc
    JOIN public.coordinators c ON c.id = tc.coordinator_id
    WHERE tc.travel_id = p_travel_id
      AND c.user_id = (SELECT auth.uid())
  );
$$;

-- Membresía + ventana de edición
CREATE OR REPLACE FUNCTION private.can_coordinator_edit(p_travel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_coordinators tc
    JOIN public.coordinators c ON c.id = tc.coordinator_id
    JOIN public.travels t ON t.id = tc.travel_id
    WHERE tc.travel_id = p_travel_id
      AND c.user_id = (SELECT auth.uid())
      AND t.status IN ('published', 'in_progress')
  );
$$;

REVOKE ALL ON FUNCTION private.is_travel_coordinator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_coordinator_edit(uuid)   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_travel_coordinator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_coordinator_edit(uuid)  TO authenticated;
```

### Por qué dos funciones y no una

Separan **leer** de **escribir**:

- `is_travel_coordinator` → **lectura**, sin importar el estado. El coordinador conserva el
  historial de los viajes que ya terminaron (`completed`). Perder el acceso a lo que
  coordinaste el mes pasado sería un mal comportamiento.
- `can_coordinator_edit` → **escritura**, solo con el viaje en `published` o
  `in_progress`. Un viaje `completed` o `cancelled` queda congelado; uno en `pending`
  todavía se está armando y es territorio del admin.

### Detalles que no son opcionales

| Cláusula | Por qué |
|---|---|
| `SECURITY DEFINER` | La función lee `coordinators`, que tiene RLS `owner_id = auth.uid()`. Sin `DEFINER`, el coordinador no puede leer su propia fila y la función devuelve siempre `false`. **Este es el punto más fácil de errar de toda la fase.** |
| `SET search_path = ''` | Obligatorio en toda función `SECURITY DEFINER`: sin esto, un schema malicioso en el `search_path` del llamador puede secuestrar la resolución de nombres. Obliga a calificar todo (`public.travels`), que es justamente lo que se hace arriba. |
| `STABLE` | Permite a Postgres cachear el resultado dentro de la misma sentencia en vez de reevaluar por fila. |
| `(SELECT auth.uid())` | Envuelto en subquery para que el planner lo trate como **InitPlan** y lo evalúe una sola vez. Sin el `SELECT`, `auth.uid()` se llama una vez por fila (documentado en `security-rls-performance.md`, 5-10x de diferencia). |

---

## Bloque 4: índices

```sql
CREATE INDEX IF NOT EXISTS coordinators_owner_id_idx ON public.coordinators (owner_id);
```

El `UNIQUE` de `user_id` del Bloque 1 ya crea el índice que los helpers usan para el
lookup por `auth.uid()`. `travel_coordinators` ya tiene `travel_coordinators_pkey
(travel_id, coordinator_id)` más índices sueltos en ambas columnas
(`20260424031824_travels.sql`), así que el `JOIN` de los helpers está cubierto.

El índice en `owner_id` es aprovechar el viaje: hoy no existe y **todas** las policies
`coordinators_owner` lo filtran.

---

## Verificación

El resultado esperado de esta fase es **que el coordinador siga sin ver nada**. Confirmar
el fail-closed acá es lo que hace segura la Fase 2.

Preparación: crear un usuario de auth de prueba (desde Studio, `http://localhost:54323`),
anotar su UUID, y vincularlo a un coordinador que esté asignado a un viaje `published`:

```sql
UPDATE public.coordinators SET user_id = '<uuid-del-usuario>' WHERE id = '<coordinator-id>';
```

```sql
-- Los helpers, ejecutados como el coordinador
SELECT private.is_travel_coordinator('<travel-id-asignado>');    -- true
SELECT private.is_travel_coordinator('<travel-id-NO-asignado>'); -- false
SELECT private.can_coordinator_edit('<travel-id-published>');    -- true
SELECT private.can_coordinator_edit('<travel-id-completed>');    -- false
```

Checklist:

- [ ] Los 4 helpers devuelven lo esperado ejecutados **como el usuario coordinador** (no
      como `postgres`; usar `SET request.jwt.claims` o probar vía la app/PostgREST)
- [ ] `SELECT * FROM travels` como el coordinador → **0 filas** (fail-closed confirmado)
- [ ] `SELECT * FROM travel_activities` como el coordinador → **0 filas**
- [ ] `SELECT * FROM travelers` como el coordinador → **0 filas**
- [ ] La web admin sigue funcionando sin cambios para el admin dueño
- [ ] `private.is_travel_coordinator` **no** aparece como endpoint:
      `curl "$SUPABASE_URL/rest/v1/rpc/is_travel_coordinator"` → 404
- [ ] `bun run db:types` corrido y `bun run typecheck` limpio (la columna `user_id` nueva
      aparece en `database.types.ts`)
- [ ] Advisors sin hallazgos nuevos

---

## Comandos (los corre el usuario)

```bash
supabase migration new coordinator_identity
# escribir el SQL
bun run db:reset
bun run db:types
bun run typecheck
supabase db advisors --local
```
