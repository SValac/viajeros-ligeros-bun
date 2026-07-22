# Código de Acceso al Viaje — Fase 1: Esquema de tablas nuevas

**Objetivo:** Crear las tablas `travel_access_codes` (el código hasheado por viaje) y
`travel_access_attempts` (log de intentos, para throttling), más la función de
normalización de teléfono `normalize_phone_last10` y su índice.

**Dependencia:** [Fase 0](travel-access-fase0-rename-status.md) — necesita
`status = 'published'` ya renombrado, porque las funciones de la Fase 2 van a
referenciarlo.
**Estado:** Completada ✅

**Commit:** `96f5656` (rama `fase1-new-tables-schema`)

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el SQL y corre
`bun run db:reset` para aplicarlo.

---

## Por qué una tabla nueva y no una columna en `travels`

`anon` ya tiene `SELECT ... USING (status = 'published')` sobre `travels`
(`travels_anon_confirmed`, sin renombrar — ver Fase 0). Cualquier columna nueva ahí
—aunque esté hasheada— se filtraría a `anon` en cada `GET /travels`. Una tabla
separada, sin ninguna policy para `anon`, es la única forma de garantizar que el
código nunca sale por ese camino público existente; solo será alcanzable a través de
los RPCs `SECURITY DEFINER` de la Fase 2.

## Por qué hashear el código en vez de guardarlo en texto plano

Aunque es un código de bajo riesgo (gatea itinerario, no pagos), guardarlo hasheado
con `pgcrypto` (`crypt()` + `gen_salt('bf')`, bcrypt) evita que una fuga de la base de
datos (backup, dump, acceso indebido) revele códigos activos de viajes en curso. La
consecuencia práctica: el código en texto plano solo puede mostrarse **una vez**, en el
momento de generarlo (igual que un token de API) — la Fase 2 y la Fase 4/5 están
diseñadas alrededor de esa restricción.

## Por qué normalizar el teléfono

`travelers.phone` es texto libre sin normalizar (números locales de 10 dígitos, sin
código de país, ej. `'8181234001'`). Un viajero en Android puede escribir su número
con espacios, guiones o el código de país. `normalize_phone_last10` (quita todo lo que
no sea dígito, toma los últimos 10) permite que `"8181234001"`, `"+52 818 123 4001"` y
`"0181234001"` matcheen al mismo viajero, sin migrar/normalizar el dato ya existente.
Se indexa como función `immutable` para que el RPC de la Fase 2 pueda usar un índice en
vez de escanear toda la tabla.

---

## Migración — `travel_access_codes_schema`

```sql
create extension if not exists pgcrypto with schema extensions;

create table public.travel_access_codes (
  id uuid primary key default gen_random_uuid(),
  travel_id uuid not null references public.travels(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Garantiza "un código activo por viaje": un 2do INSERT concurrente mientras
-- uno sigue activo lanza unique_violation (se captura en el RPC de la Fase 2).
create unique index travel_access_codes_active_travel_idx
  on public.travel_access_codes (travel_id) where revoked_at is null;
create index travel_access_codes_travel_id_idx on public.travel_access_codes (travel_id);

alter table public.travel_access_codes enable row level security;

-- El admin puede ver metadata (nunca code_hash) de sus propios viajes.
create policy "travel_access_codes_owner_select" on public.travel_access_codes
  for select to authenticated
  using (exists (select 1 from public.travels t where t.id = travel_id and t.owner_id = auth.uid()));
-- Sin insert/update/delete para authenticated (solo vía RPC) y sin ninguna policy para anon.

-- Log de intentos, para throttling por teléfono. Sin policies (solo el RPC accede).
create table public.travel_access_attempts (
  id uuid primary key default gen_random_uuid(),
  phone_normalized text not null,
  travel_id uuid references public.travels(id) on delete set null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index travel_access_attempts_phone_created_idx
  on public.travel_access_attempts (phone_normalized, created_at desc);
alter table public.travel_access_attempts enable row level security;

-- Normalización de teléfono: quita todo lo que no sea dígito y toma los últimos 10.
create or replace function public.normalize_phone_last10(p_phone text)
returns text language sql immutable set search_path = ''
as $$ select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10); $$;

create index travelers_phone_normalized_idx
  on public.travelers (public.normalize_phone_last10(phone));
```

---

## Pasos de implementación

**1.1** Generar el archivo:
```
supabase migration new travel_access_codes_schema
```

**1.2** Pegar el SQL de arriba completo.

**1.3** Aplicar:
```
bun run db:reset
```

**1.4** Regenerar tipos (para que `travel_access_codes`/`travel_access_attempts`
aparezcan en `app/types/database.types.ts`, necesario para la Fase 3):
```
bun run db:types
```

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Tabla separada en vez de columna en `travels` | Evitar que `anon` la lea vía la policy `travels_anon_confirmed` existente |
| `code_hash` con bcrypt (`pgcrypto`) en vez de texto plano | Proteger contra fuga de datos; el código solo se puede mostrar una vez |
| Índice único parcial `WHERE revoked_at IS NULL` | Garantiza "un código activo por viaje" a nivel de base de datos, no solo en la app |
| `travel_access_attempts` sin ninguna policy (ni anon ni authenticated) | Solo el RPC `SECURITY DEFINER` de la Fase 2 debe poder leer/escribir ahí |
| `normalize_phone_last10` como función `immutable` indexable | Permite que el RPC de redención use un índice en vez de escanear `travelers` completa |

---

## Verificación

- `bun run db:reset` corre sin errores.
- En Supabase Studio (`http://127.0.0.1:54323`): las tablas `travel_access_codes` y
  `travel_access_attempts` existen, con RLS habilitado y las policies esperadas.
- `select public.normalize_phone_last10('+52 818-123-4001');` en el SQL editor local
  devuelve `'8181234001'`.
- `bun run db:types` no reporta errores y el diff de `database.types.ts` incluye las
  dos tablas nuevas.
