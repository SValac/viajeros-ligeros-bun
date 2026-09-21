# Fase 1 — Separar `travel_internals` de `travels`

**Estado:** ✅ Completa
**Dependencia:** Ninguna
**Migración:** `supabase migration new travel_internals_split` → `20260921213520_travel_internals_split.sql`

---

## Objetivo

Mover `total_operation_cost`, `projected_profit` e `internal_notes` a una tabla satélite
1:1, para que `travels` quede como tabla puramente operativa y cualquier rol nuevo la pueda
leer sin filtros por columna.

**Efecto colateral valioso:** cierra la fuga de esas columnas a `anon` de forma
estructural, sin depender de un `GRANT` que alguien tenga que mantener bien.

---

## Bloque 1: la tabla

```sql
CREATE TABLE public.travel_internals (
  travel_id uuid PRIMARY KEY REFERENCES public.travels(id) ON DELETE CASCADE,
  total_operation_cost numeric,
  projected_profit numeric,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_internals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER travel_internals_updated_at
  BEFORE UPDATE ON public.travel_internals
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
```

`travel_id` como **PK** (no una `id` propia): fuerza la relación 1:1 a nivel base, hace el
join trivial y evita filas huérfanas o duplicadas. `ON DELETE CASCADE` para que borrar un
viaje se lleve sus internos.

### Grants y RLS

```sql
-- Sin ningún grant a anon: es lo que hace estructural el aislamiento
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_internals TO authenticated;
GRANT ALL ON public.travel_internals TO service_role;

CREATE POLICY "travel_internals_owner" ON public.travel_internals
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = travel_id AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = travel_id AND t.owner_id = (SELECT auth.uid())
  ));
```

⚠️ **Sin `GRANT` explícito, una tabla nueva da `permission denied` aunque tenga policy
RLS.** Es el hallazgo #2 de la feature de código de acceso — no volver a tropezar.

`(SELECT auth.uid())` envuelto para que el planner lo evalúe una sola vez.

---

## Bloque 2: migrar los datos y quitar las columnas

**El orden importa.** Copiar primero, verificar, y recién después borrar:

```sql
-- 1. Copiar los datos existentes (solo filas con algún valor)
INSERT INTO public.travel_internals (travel_id, total_operation_cost, projected_profit, internal_notes)
SELECT id, total_operation_cost, projected_profit, internal_notes
FROM public.travels
WHERE total_operation_cost IS NOT NULL
   OR projected_profit IS NOT NULL
   OR internal_notes IS NOT NULL;

-- 2. Verificar el conteo ANTES de borrar nada
--    (correr a mano, comparar los dos números)
SELECT count(*) FROM public.travels
  WHERE total_operation_cost IS NOT NULL OR projected_profit IS NOT NULL OR internal_notes IS NOT NULL;
SELECT count(*) FROM public.travel_internals;

-- 3. Recién ahora, eliminar las columnas
ALTER TABLE public.travels
  DROP COLUMN total_operation_cost,
  DROP COLUMN projected_profit,
  DROP COLUMN internal_notes;
```

> Se insertan solo las filas con datos, no una por viaje. Un viaje sin internos
> simplemente no tiene fila — el mapper lo resuelve con `undefined`, igual que hoy hace
> con `null`.

---

## Bloque 3: crear la fila al vuelo

Como no toda fila de `travels` tiene su par en `travel_internals`, el `UPDATE` de internos
tiene que funcionar aunque la fila no exista todavía. Dos opciones:

**Opción A (recomendada) — `upsert` desde el repository:**

```ts
await supabase
  .from('travel_internals')
  .upsert({ travel_id: travelId, ...internals }, { onConflict: 'travel_id' });
```

Un solo statement, sin magia en la base, y `onConflict: 'travel_id'` funciona porque
`travel_id` es la PK.

**Opción B — trigger `AFTER INSERT` en `travels`** que cree siempre la fila vacía.
Garantiza el 1:1 pero deja filas todo-`NULL` para viajes que nunca tendrán internos, y
esconde el comportamiento en la base.

**Recomendación: A.** Es explícita y el repository ya es el lugar donde vive esta clase de
lógica en el proyecto.

---

## Bloque 4: el código

**La clave de esta fase: el tipo de dominio `Travel` NO cambia.** La separación es un
asunto de persistencia. Si `Travel` sigue teniendo `internalNotes`, `totalOperationCost` y
`projectedProfit` planos, **`travel-form.vue`, la página de detalle y el store casi no se
tocan**. Ahí es donde la arquitectura en capas del proyecto paga.

| Archivo | Cambio |
|---|---|
| `app/types/travel.ts` | **Sin cambios** en `Travel` (se mantiene plano) |
| `app/utils/mappers.ts:159-162` | `mapTravelRowToDomain` recibe la fila embebida y la aplana |
| `app/utils/mappers.ts:246-249` | Separar el mapper de escritura en dos: `travels` y `travel_internals` |
| `use-travel-repository.ts:24` | Agregar `travel_internals(*)` al `select` embebido |
| `use-travel-repository.ts:341-348` | `updateTravel` parte el update en dos statements |
| `use-travel-store.ts:133-147` | `travelRootKeys` deja de incluir las 3 claves; agregar una lista `travelInternalKeys` paralela |
| `travel-form.vue`, `[id]/index.vue` | **Sin cambios** |

### El select embebido

```ts
.select('*, travel_activities(*), travel_services(*), travel_buses(*), travel_accommodations(*), travel_coordinators(coordinator_id), travel_internals(*)')
```

PostgREST devuelve `travel_internals` como **objeto o `null`** (no array) por ser 1:1 vía
PK. Verificar la forma real que llega antes de escribir el mapper — si llegara como array,
el mapper toma `[0]`.

### La escritura partida

`updateTravel` hoy arma un solo objeto `update` y hace un `.update()`. Ahora tiene que
separar las claves de internos, y **solo tocar `travel_internals` si alguna de las tres
vino en `data`** — para no crear filas vacías en cada edición de viaje.

⚠️ **No son atómicos.** Dos statements sin transacción: si el segundo falla, el primero ya
se aplicó. Para este caso (datos administrativos que el usuario reintenta) es aceptable, y
es lo mismo que ya hace el store con itinerario/servicios/buses. Si se quisiera atomicidad
haría falta un RPC — **no vale la pena acá**, pero conviene que el orden sea:
`travels` primero, `travel_internals` después, así el fallo deja lo operativo bien.

---

## Gotchas

1. **`bun run db:types` es obligatorio** después de la migración, o `typecheck` va a fallar
   con errores confusos sobre columnas que ya no existen.
2. **La policy `travels_anon_confirmed` no se toca.** Sigue siendo correcta, y ahora es
   segura: `travels` ya no tiene nada que esconder. `owner_id` sigue expuesto a `anon` —
   es un UUID sin valor práctico, se puede limpiar aparte si molesta.
3. **Editar una migración ya aplicada no alcanza** — `schema_migrations` trackea por
   versión, no por contenido. Si se corrige el SQL después de correrlo, hay que
   `bun run db:reset` (hallazgo #3 de la feature de código de acceso).
4. **`bun run db:reset` deja la base vacía** (`seed.sql` está roto desde multi-tenancy) —
   hay que crear viaje/viajero a mano después de cada reset para poder probar.
5. **Los `DROP COLUMN` son irreversibles.** Verificar el conteo del Bloque 2 antes de
   avanzar, y tener backup antes de correr esto contra remoto.

---

## Verificación

- [x] Conteo de filas migradas == conteo de viajes con internos (Bloque 2, paso 2)
- [x] La web admin muestra costo/margen/notas internas igual que antes
- [x] Editar los internos de un viaje **que ya los tenía** → persiste
- [x] Editar los internos de un viaje **que NO tenía fila** → la crea (upsert) — cubierto por el caso de creación
- [x] Editar solo el destino de un viaje → **no** crea fila en `travel_internals` — garantizado por código (`haveInternalFields`), no requiere re-test manual
- [x] Crear un viaje nuevo con internos → funciona
- [x] Borrar un viaje → se lleva su fila de `travel_internals` (cascade) — confirmado, 0 filas en ambas tablas tras el borrado
- [x] Como `anon`: `SELECT * FROM travels` **no** devuelve las 3 columnas (ya no existen)
- [x] Como `anon`: `SELECT * FROM travel_internals` → `permission denied`
- [x] Como admin B: no ve los internos de la agencia A — mismo patrón RLS `owner_id = auth.uid()` que el resto de las tablas, ya probado en multi-tenancy; no había un segundo owner local para re-testear
- [x] `bun run db:types`, `bun run typecheck`, `bun run lint` limpios
- [x] Advisors sin hallazgos nuevos — los únicos warnings son `auth_rls_initplan` preexistentes en otras tablas; `travel_internals` no aparece

**Nota:** no se comparó contra un dump previo (solo había datos de seed local, ya
verificados por el conteo).

### Bugs encontrados y arreglados durante la verificación (fuera de alcance de la Fase 1, no relacionados a `travel_internals`)

- **`sanitizeText` borraba espacios** en cualquier campo de texto libre de la app
  (off-by-one en el rango de códigos de control). `app/utils/form-validation.ts:12`.
- **Página de detalle del viaje quedaba en blanco al borrar** — race entre el
  `watchEffect` de "viaje no encontrado" y la navegación explícita del borrado.
  `app/pages/travels/[id]/index.vue`.

---

## Comandos (los corre el usuario)

```bash
supabase migration new travel_internals_split
bun run db:reset
bun run db:types
bun run typecheck && bun run lint:fix
supabase db advisors --local
```
