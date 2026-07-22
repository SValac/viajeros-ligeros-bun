# Código de Acceso al Viaje — Fase 2: Los 3 RPCs

**Objetivo:** Crear `generate_travel_access_code`, `revoke_travel_access_code` y
`redeem_travel_access` — este último es **el endpoint que consumirá la app Android**.

**Dependencia:** [Fase 1](travel-access-fase1-schema.md) — necesita las tablas
`travel_access_codes`/`travel_access_attempts` y `normalize_phone_last10` ya creadas.
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el SQL, corre
`bun run db:reset` y prueba los RPCs con `curl`/SQL editor.

---

## Por qué este diseño

Las tres funciones viven en `public` (único esquema expuesto por PostgREST junto a
`graphql_public`, ver `supabase/config.toml`), son `security definer` con
`set search_path = ''` y toda referencia va completamente calificada (`public.travels`,
`extensions.crypt`, …) — más estricto que el `set search_path = public` del RPC de
referencia (`move_or_swap_traveler_seat`), y sin SQL dinámico en ningún punto (sin
superficie de inyección). Sigue el mismo estilo que
`supabase/migrations/20260426052101_traveler_seat_swap_rpc.sql`: `plpgsql`, retorno
`jsonb`, errores vía `raise exception '<mensaje>' using errcode = 'P0001'`, grants
explícitos por rol.

⚠️ **Importante:** `CREATE FUNCTION` otorga `EXECUTE` a `PUBLIC` por defecto. Cada
función de admin debe incluir `revoke execute ... from public` antes del `grant`
explícito a `authenticated`/`service_role`, para que `anon` no pueda generar ni revocar
códigos.

---

## 2.1 — `generate_travel_access_code(p_travel_id uuid) returns jsonb`

Solo `authenticated`. Verifica que el caller sea el owner del viaje y que
`status in ('published', 'in_progress')`; revoca el código activo previo si existe;
genera un código de 6 caracteres desde `gen_random_bytes(6)` sobre el alfabeto
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `O/0/I/1`, para evitar confusión al
transcribir); guarda `crypt(code, gen_salt('bf', 8))`; `expires_at` =
`travels.end_date + 1 día`. **Devuelve el código en texto plano, una sola vez.**

```sql
create or replace function public.generate_travel_access_code(p_travel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_travel public.travels%rowtype;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea;
  i integer;
  v_row public.travel_access_codes%rowtype;
begin
  select * into v_travel from public.travels where id = p_travel_id for update;

  if not found then
    raise exception 'travel_not_found' using errcode = 'P0001';
  end if;

  if v_travel.owner_id is distinct from auth.uid() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_travel.status not in ('published', 'in_progress') then
    raise exception 'travel_not_eligible' using errcode = 'P0001';
  end if;

  v_bytes := extensions.gen_random_bytes(6);
  for i in 0..5 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  update public.travel_access_codes
  set revoked_at = now()
  where travel_id = p_travel_id and revoked_at is null;

  insert into public.travel_access_codes (travel_id, code_hash, expires_at, created_by)
  values (
    p_travel_id,
    extensions.crypt(v_code, extensions.gen_salt('bf', 8)),
    (v_travel.end_date + interval '1 day'),
    auth.uid()
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'travelId', v_row.travel_id,
    'code', v_code,
    'expiresAt', v_row.expires_at,
    'createdAt', v_row.created_at,
    'createdBy', v_row.created_by
  );
exception
  when unique_violation then
    raise exception 'code_generation_conflict' using errcode = 'P0001';
end;
$$;

revoke execute on function public.generate_travel_access_code(uuid) from public;
grant execute on function public.generate_travel_access_code(uuid) to authenticated;
grant execute on function public.generate_travel_access_code(uuid) to service_role;
```

---

## 2.2 — `revoke_travel_access_code(p_travel_id uuid) returns jsonb`

Solo `authenticated`, mismo chequeo de owner, marca `revoked_at = now()`.

```sql
create or replace function public.revoke_travel_access_code(p_travel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_travel public.travels%rowtype;
  v_row public.travel_access_codes%rowtype;
begin
  select * into v_travel from public.travels where id = p_travel_id;

  if not found then
    raise exception 'travel_not_found' using errcode = 'P0001';
  end if;

  if v_travel.owner_id is distinct from auth.uid() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  update public.travel_access_codes
  set revoked_at = now()
  where travel_id = p_travel_id and revoked_at is null
  returning * into v_row;

  if not found then
    raise exception 'no_active_code' using errcode = 'P0001';
  end if;

  return jsonb_build_object('travelId', p_travel_id, 'revokedAt', v_row.revoked_at);
end;
$$;

revoke execute on function public.revoke_travel_access_code(uuid) from public;
grant execute on function public.revoke_travel_access_code(uuid) to authenticated;
grant execute on function public.revoke_travel_access_code(uuid) to service_role;
```

---

## 2.3 — `redeem_travel_access(p_phone text, p_code text) returns jsonb` — el endpoint de Android

Otorgado a `anon`. Algoritmo (todas las comparaciones con variables enlazadas, nada de
SQL dinámico):

1. Normaliza teléfono (últimos 10 dígitos) y código (mayúsculas, solo alfanumérico).
2. Valida formato → `invalid_phone` / `invalid_code`.
3. **Rate limit primero**: si hay ≥10 intentos fallidos para ese teléfono en los
   últimos 15 minutos → `too_many_attempts`.
4. Busca todos los `travelers` cuyo teléfono normalizado coincide (puede estar en
   varios viajes).
5. Para cada viaje candidato, compara el código contra el hash del código más
   reciente de ese viaje (`crypt(code, code_hash) = code_hash`). Solo **después** de
   un match de hash se evalúa `revoked_at`/`expires_at`/`status` — así un código
   incorrecto siempre devuelve `invalid_code`, sin filtrar si ese viaje/teléfono tiene
   o no un código válido (evita usar el mensaje de error como oráculo).
6. Cada intento (éxito o fallo) se registra en `travel_access_attempts`.

**Errores** (`raise exception '<mensaje>' using errcode = 'P0001'` → PostgREST
devuelve HTTP 400 con `{"code":"P0001","message":"<mensaje>"}`):

| `message` | Causa |
|---|---|
| `invalid_phone` / `invalid_code` | formato inválido |
| `phone_not_registered` | el teléfono no está en ningún viajero |
| `invalid_code` | código no coincide |
| `code_revoked` | el código coincidió pero fue revocado/rotado |
| `code_expired` | el código coincidió pero ya expiró |
| `travel_not_eligible` | código válido pero el viaje no está `published`/`in_progress` |
| `too_many_attempts` | throttling por teléfono |

**Contrato de respuesta (para el equipo Android)**:
```json
{
  "travel": { "id": "uuid", "label": "...", "destination": "...", "startDate": "...", "endDate": "...", "description": "...", "imageUrl": "...", "status": "published" },
  "traveler": { "id": "uuid", "firstName": "...", "lastName": "...", "seat": 12, "boardingPoint": "...", "isRepresentative": true },
  "bus": { "id": "uuid", "model": "...", "brand": "...", "seatCount": 44 },
  "activities": [{ "id": "uuid", "day": 1, "title": "...", "description": "...", "time": "09:00", "location": "...", "mapLocation": { "lat": 0, "lng": 0 } }],
  "services": [{ "id": "uuid", "name": "...", "description": "...", "included": true }],
  "media": [{ "id": "uuid", "publicUrl": "...", "mediaType": "image", "caption": "..." }]
}
```
Explícitamente **excluido**: otros viajeros, campos de `travel_buses`
(operadores/costos), `travel_coordinators`, `internal_notes`/costos de `travels`, y la
tabla `travel_access_codes` en sí.

```sql
grant execute on function public.redeem_travel_access(text, text) to anon;
grant execute on function public.redeem_travel_access(text, text) to authenticated;
grant execute on function public.redeem_travel_access(text, text) to service_role;
```
(`authenticated` también recibe grant, igual que `move_or_swap_traveler_seat`, para
que el admin pueda probar el flujo desde su propia sesión.)

> El cuerpo `plpgsql` completo de `redeem_travel_access` se escribe junto con el
> usuario durante la sesión de implementación, siguiendo el algoritmo de arriba paso a
> paso — no se pega de una sola vez, para poder revisar cada bloque (normalización →
> rate limit → búsqueda de traveler → verificación de hash → branch de estado →
> logging del intento → construcción del jsonb de respuesta).

---

## Pasos de implementación

**2.1** Generar el archivo:
```
supabase migration new travel_access_rpc
```

**2.2** Escribir `generate_travel_access_code` (bloque 2.1 de arriba), aplicar
(`bun run db:reset`) y probarla manualmente contra un viaje `published` como owner.

**2.3** Escribir `revoke_travel_access_code` (bloque 2.2), aplicar y probar.

**2.4** Escribir `redeem_travel_access` bloque por bloque (algoritmo de la sección
2.3), aplicar y probar cada rama de error con `curl` (ver Fase 6 para el detalle
completo de casos).

---

## Verificación

```bash
curl -s -X POST "http://127.0.0.1:54321/rest/v1/rpc/redeem_travel_access" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_phone":"8181234001","p_code":"AB3K9Q"}'
```
- Código correcto → 200 con el JSON completo (revisar que nunca aparezcan otros
  viajeros, datos de `travel_buses`/costos, ni `travel_access_codes`).
- Código incorrecto → 400 `invalid_code`.
- `anon` **no puede** ejecutar `generate_travel_access_code` ni
  `revoke_travel_access_code` (permission denied).
- Correr los advisors de Supabase (`get_advisors` / `supabase db advisors`) y resolver
  cualquier hallazgo nuevo antes de pasar a la Fase 3.
