-- Todas las columnas de esta tabla son PÚBLICAS (anon las lee vía embed desde la web).
-- Un dato privado de la agencia NO va acá: va en una tabla satélite con policy de dueño.
CREATE TABLE public.agency_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  country_code text NOT NULL DEFAULT 'MX' REFERENCES public.countries(code),
  state_code text,
  phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agency_profiles_state_fk
    FOREIGN KEY (country_code, state_code) REFERENCES public.country_states(country_code, code),
  CONSTRAINT agency_profiles_phone_e164 CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT agency_profiles_primary_color_hex CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT agency_profiles_secondary_color_hex CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT agency_profiles_company_name_not_blank CHECK (btrim(company_name) <> '')
);

CREATE TRIGGER agency_profiles_updated_at BEFORE UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

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

  INSERT INTO public.agency_profiles(id) VALUES (NEW.id)
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_agency_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_agency_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_agency_profile();

INSERT INTO public.agency_profiles(id)
SELECT u.id FROM auth.users u
WHERE NOT (u.raw_user_meta_data ? 'coordinator_id')
ON CONFLICT(id) DO NOTHING;

-- Red de seguridad: todo dueño de un viaje necesita perfil, o el FK de abajo falla.
INSERT INTO public.agency_profiles(id)
SELECT DISTINCT owner_id FROM public.travels
ON CONFLICT(id) DO NOTHING;

CREATE INDEX IF NOT EXISTS travels_owner_id_idx ON public.travels(owner_id);
CREATE INDEX IF NOT EXISTS agency_profiles_location_idx
  ON public.agency_profiles(country_code, state_code);

ALTER TABLE public.travels
  ADD CONSTRAINT travels_owner_agency_profile_fkey
  FOREIGN KEY(owner_id) REFERENCES public.agency_profiles (id);

ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_profiles_owner_select" ON public.agency_profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "agency_profiles_owner_update" ON public.agency_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "agency_profiles_anon_published" ON public.agency_profiles
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.owner_id = agency_profiles.id AND t.status = 'published'
  ));

GRANT SELECT, UPDATE ON public.agency_profiles TO authenticated;
GRANT SELECT ON public.agency_profiles TO anon;
GRANT ALL ON public.agency_profiles TO service_role;
