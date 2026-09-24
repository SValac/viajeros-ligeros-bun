# Fase 2 — Tabla `agency_profiles`

**Estado:** Completada ✅ (local). `db:reset` y el seed pasan: el FK de `travels` confirma que
el trigger creó el perfil de dev. Los tipos generados incluyen las relaciones
`travels → agency_profiles` y `agency_profiles → country_states`. Las pruebas de acceso
(anon / A contra B / coordinador) se corren en la matriz de la Fase 7.
**Dependencia:** Fase 1
**Migración:** `20260924035704_agency_profiles.sql`

[← Volver al plan](../../pending/agency-profile/PLAN.md)

---

## Objetivo

Crear la tabla del perfil, garantizar que **todo dueño de viajes tenga su fila** (trigger +
backfill), exponerla a `anon` solo para agencias con viajes publicados y conectar
`travels → agency_profiles` con un FK para que la web pueda hacer embed.

## Orden dentro de la migración (importa)

1. Tabla + constraints + trigger `updated_at`
2. Función + trigger de alta en `auth.users`
3. **Backfill** de usuarios existentes (excepto coordinadores)
4. Índice `travels(owner_id)`
5. **FK** `travels.owner_id → agency_profiles(id)`. Si fuera antes del backfill, fallaría
   con cualquier viaje existente.
6. RLS + grants

## 1. Tabla

```sql
-- Todas las columnas de esta tabla son PÚBLICAS (anon las lee vía embed desde la web).
-- Un dato privado de la agencia NO va acá: va en una tabla satélite con policy de dueño.
CREATE TABLE public.agency_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  company_name text,
  country_code text NOT NULL DEFAULT 'MX' REFERENCES public.countries (code),
  state_code text,
  phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agency_profiles_state_fk
    FOREIGN KEY (country_code, state_code) REFERENCES public.country_states (country_code, code),
  CONSTRAINT agency_profiles_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT agency_profiles_primary_color_hex CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT agency_profiles_secondary_color_hex CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT agency_profiles_company_name_not_blank CHECK (btrim(company_name) <> '')
);

CREATE TRIGGER agency_profiles_updated_at BEFORE UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
```

Notas:
- El FK compuesto usa `MATCH SIMPLE` (default): con `state_code` nulo no se valida, que es
  justo lo que queremos para un perfil recién creado.
- Los `CHECK` con `NULL` pasan (`NULL ~ ...` es `NULL`, no `false`), así que todos los
  campos opcionales pueden quedar vacíos.
- `company_name_not_blank` evita que `'   '` cuente como "perfil completo" en la Fase 5.

## 2. Trigger de alta

```sql
CREATE FUNCTION private.handle_new_agency_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Los coordinadores invitados llegan con coordinator_id en user_metadata
  -- (invite-coordinator → inviteUserByEmail data). No son dueños de viajes.
  IF NEW.raw_user_meta_data ? 'coordinator_id' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.agency_profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_agency_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_agency_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_agency_profile();
```

- **`REVOKE`** (`security-rls-performance` del skill; mismo patrón que
  `coordinator_identity.sql:43`): Postgres le da `EXECUTE` a `PUBLIC` en toda función nueva.
  Postgres no revisa ese permiso cuando **dispara** un trigger (solo al crearlo), así que
  revocarlo no afecta el alta y cierra cualquier otra vía de ejecución.

- **Por qué `raw_user_meta_data` y no `app_metadata.role`:** el rol `coordinator` lo setea
  `invite-coordinator` en un `updateUserById` **posterior** al insert. Cuando dispara este
  trigger todavía no existe. `coordinator_id` sí viaja en el INSERT original.
- **Riesgo a tener presente:** si esta función lanza un error, el **registro del usuario
  falla**. Por eso es mínima (un INSERT con `ON CONFLICT DO NOTHING`) y no valida nada más.
- Va en el schema `private` (no expuesto por PostgREST), igual que los helpers de
  coordinator-access.

## 3. Backfill

```sql
INSERT INTO public.agency_profiles (id)
SELECT u.id FROM auth.users u
WHERE NOT (u.raw_user_meta_data ? 'coordinator_id')
ON CONFLICT (id) DO NOTHING;
```

Por seguridad, además, cualquier dueño de un viaje que por algún motivo sea coordinador
(no debería existir) también necesita fila para que el FK no falle:

```sql
INSERT INTO public.agency_profiles (id)
SELECT DISTINCT owner_id FROM public.travels
ON CONFLICT (id) DO NOTHING;
```

## 4-5. Índice + FK desde `travels`

```sql
CREATE INDEX IF NOT EXISTS travels_owner_id_idx ON public.travels (owner_id);

-- FK compuesto de ubicación: el advisor de performance marca FKs sin índice,
-- y sirve si algún día la web filtra por estado del lado del servidor.
CREATE INDEX IF NOT EXISTS agency_profiles_location_idx
  ON public.agency_profiles (country_code, state_code);

ALTER TABLE public.travels
  ADD CONSTRAINT travels_owner_agency_profile_fkey
  FOREIGN KEY (owner_id) REFERENCES public.agency_profiles (id);
```

- `travels.owner_id` hoy **no tiene índice**. Lo usan tanto la policy `anon` de abajo
  (`EXISTS` por `owner_id`) como el embed de la web y las policies `*_owner`.
- El FK existente a `auth.users` queda **igual**. Ambos son `NO ACTION`, como el actual:
  borrar un usuario que tiene viajes sigue fallando, igual que hoy.
- Con dos FKs sobre la misma columna, PostgREST solo ve el de `agency_profiles`, porque
  `auth` no está expuesto. El embed `agency_profiles(...)` desde `travels` no es ambiguo.

## 6. RLS + grants

```sql
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_profiles_owner_select" ON public.agency_profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "agency_profiles_owner_update" ON public.agency_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Solo agencias con algo publicado son visibles desde la web.
CREATE POLICY "agency_profiles_anon_published" ON public.agency_profiles
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.owner_id = agency_profiles.id AND t.status = 'published'
  ));

GRANT SELECT, UPDATE ON public.agency_profiles TO authenticated;
GRANT SELECT ON public.agency_profiles TO anon;
GRANT ALL ON public.agency_profiles TO service_role;
```

- **Sin INSERT ni DELETE** para `authenticated`: la fila nace con el trigger y muere con el
  `CASCADE` de `auth.users`. El CRM solo hace `UPDATE`.
- `(SELECT auth.uid())` en lugar de `auth.uid()`: el planner lo evalúa una sola vez por
  consulta (recomendación de `supabase-postgres-best-practices`).
- El `EXISTS` corre con el RLS de `anon` sobre `travels`, que ya limita a `published`. La
  condición explícita de estado queda igual por claridad y para que no dependa de otra
  policy.

## Verificación

- [ ] `bun run db:reset` sin errores; el usuario del seed (`dev@viajeros-ligeros.local`)
      tiene fila en `agency_profiles`
- [ ] Registrar un usuario nuevo desde `/register` → aparece su fila
- [ ] Invitar un coordinador → **no** aparece fila para su `user_id`
- [ ] Como `anon`: `GET /rest/v1/travels?select=id,agency_profiles(company_name)&status=eq.published`
      devuelve el perfil incrustado
- [ ] Como `anon`: `GET /rest/v1/agency_profiles` **no** devuelve agencias sin viajes publicados
- [ ] Como usuario A: no puede leer ni actualizar el perfil de B (0 filas afectadas; usar
      `.select()` tras el update, ver [[bugfix_revoke_coordinator_silent_noop]])
- [ ] `phone = '3312345678'` (sin `+52`) → rechazado por el CHECK
- [ ] `state_code = 'XXX'` → rechazado por el FK
- [ ] `bun run db:types`
