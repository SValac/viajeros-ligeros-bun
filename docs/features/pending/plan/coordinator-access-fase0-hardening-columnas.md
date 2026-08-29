# Fase 0 — Cerrar la exposición de columnas financieras a `anon`

**Estado:** Pendiente
**Dependencia:** Ninguna (independiente de la Fase 1, se puede hacer en cualquier orden)
**Migración:** `supabase migration new travels_anon_column_grants`

---

## Por qué esta fase existe

Se encontró analizando el problema de columnas de esta feature, pero **es un bug
preexistente e independiente**. Se corrige acá porque es exactamente la misma clase de
problema (RLS filtra filas, no columnas) y el arreglo es barato.

### El bug

```sql
-- 20260424031824_travels.sql:323
grant select on table "public"."travels" to "anon";

-- 20260506230433_rls_single_admin_policies.sql
CREATE POLICY "travels_anon_confirmed" ON public.travels
  FOR SELECT TO anon USING (status = 'confirmed');   -- hoy 'published'
```

El `GRANT` es sobre **la tabla entera** y la policy habilita cualquier viaje `published`.
Resultado: con solo la anon key —que por diseño es pública y viaja en el bundle del
cliente— se puede leer de todos los viajes publicados:

- `total_operation_cost` — el costo real de operación
- `projected_profit` — el margen de la agencia
- `internal_notes` — notas internas

La policy anon se creó pensando en una futura landing page, y esa intención es correcta;
lo que faltó fue acotar **qué columnas** se exponen.

### Por qué acá el `GRANT` por columnas sí funciona

En la Fase 2 se descarta el grant por columnas para coordinadores porque comparten el rol
`authenticated` con el admin. Con `anon` no pasa: **es un rol de Postgres propio y
distinto**, así que se le puede recortar el grant sin afectar a nadie más.

---

## Implementación

```sql
-- Revocar el grant de tabla completa y reemplazarlo por uno por columnas.
REVOKE SELECT ON public.travels FROM anon;

GRANT SELECT (
  id,
  destination,
  start_date,
  end_date,
  price,              -- precio de venta al público: sí es información pública
  description,
  image_url,
  status,
  minimum_seats,
  accumulated_travelers,
  created_at,
  updated_at
) ON public.travels TO anon;
```

Columnas deliberadamente **excluidas**: `total_operation_cost`, `projected_profit`,
`internal_notes`, `owner_id`.

`price` **sí** se incluye: es el precio de venta, ya visible para viajeros y para la
landing page. Lo sensible es el costo y el margen, no el precio.

`owner_id` se excluye por higiene — no aporta nada a un consumidor anónimo y filtra el
UUID del usuario dueño de la agencia.

---

## Gotchas

1. **Un `SELECT *` como `anon` ahora falla** con `permission denied for table travels`, en
   vez de devolver la fila recortada. Postgres exige permiso sobre **cada** columna
   solicitada, y `*` las pide todas. Cualquier consumidor `anon` debe pedir columnas
   explícitas. Hoy no hay ninguno en producción (la landing page todavía no existe), así
   que es el momento barato para hacerlo — pero **cuando se construya la landing, hay que
   listar columnas en el `.select()`**, nunca `select('*')`.

2. **Verificar primero si algo `anon` consume `travels` hoy.** Buscar en el código:
   ```bash
   grep -rn "from('travels')" app/
   ```
   Todo lo que corra autenticado no se ve afectado (el grant de `authenticated` queda
   intacto). Solo importa lo que use la anon key sin sesión.

3. **Los grants por columna no aparecen en `supabase db diff` de forma obvia.** Escribir la
   migración a mano; no confiar en que el diff la genere.

4. **No tocar la policy `travels_anon_confirmed`.** Sigue siendo correcta: define *qué
   filas* ve `anon`. Esta fase define *qué columnas*. Son dos mecanismos
   complementarios, no alternativos.

---

## Verificación

```sql
-- Como anon: debe FALLAR con permission denied
SET ROLE anon;
SELECT * FROM public.travels LIMIT 1;

-- Como anon: debe FALLAR (columna prohibida, aunque sea explícita)
SELECT projected_profit FROM public.travels LIMIT 1;
SELECT total_operation_cost, internal_notes FROM public.travels LIMIT 1;

-- Como anon: debe FUNCIONAR y devolver solo viajes 'published'
SELECT id, destination, price, status FROM public.travels;

RESET ROLE;
```

Checklist:

- [ ] `SELECT *` como `anon` → `permission denied`
- [ ] `SELECT projected_profit` como `anon` → `permission denied`
- [ ] `SELECT total_operation_cost` / `internal_notes` como `anon` → `permission denied`
- [ ] `SELECT` de columnas permitidas como `anon` → funciona, y **solo** trae `published`
- [ ] Como `authenticated` dueño: la app web sigue funcionando igual (sin regresión)
- [ ] `grep -rn "from('travels')" app/` revisado: ningún consumidor `anon` roto
- [ ] Advisors sin hallazgos nuevos

---

## Comandos (los corre el usuario)

```bash
supabase migration new travels_anon_column_grants
# escribir el SQL en el archivo generado
bun run db:reset
supabase db advisors --local   # o MCP get_advisors
```

> Recordar el hallazgo #3 de la feature de código de acceso: editar un archivo de migración
> **ya aplicado** no alcanza — `schema_migrations` trackea por versión, no por contenido.
> Si se corrige el SQL después de haberlo corrido, hay que `db:reset` de nuevo.

> `bun run db:reset` deja la base vacía (`seed.sql` está roto desde multi-tenancy) — hay
> que crear viaje/viajero a mano vía la app después de cada reset.
