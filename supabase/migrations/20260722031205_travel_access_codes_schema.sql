-- bLOCK 1: create extention pgcrypto to hash the code
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA EXTENSIONS;

-- block 2: create table travel_access_codes
CREATE TABLE IF NOT EXISTS public.travel_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_id uuid NOT NULL REFERENCES public.travels(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- grant 'one code active per travel' at database level: a 2nd INSERT
-- while already exists one with revoked_at ID NULL will throw an unique_violation error
CREATE UNIQUE INDEX travel_access_codes_active_travel_idx
ON public.travel_access_codes (travel_id)
WHERE revoked_at IS NULL;

CREATE INDEX travel_access_codes_travel_id_idx ON public.travel_access_codes (travel_id);

ALTER TABLE public.travel_access_codes
  ENABLE ROW LEVEL SECURITY;

-- admin can see metadata(never code_hash) of own travels
-- note: there is no insert/update/delete for authenticated, it only writes by RPC, and no ANON policy
CREATE POLICY "travel_access_codes_owner_select" ON public.travel_access_codes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t WHERE t.id = travel_id
    AND t.owner_id = auth.uid()
  ));


-- block 3: log attempts table
CREATE TABLE IF NOT EXISTS public.travel_access_attempts (
  id uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL,
  travel_id uuid REFERENCES public.travels(id) ON DELETE set null,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX travel_access_attempts_phone_created_idx
  ON public.travel_access_attempts (phone_normalized, created_at DESC);

-- no policies, either ANON or AUTHENTICATED can't read/write only RPC SECURITY DEFINER
ALTER TABLE public.travel_access_attempts
  ENABLE ROW LEVEL SECURITY;


-- block 4: create phone normalization function
CREATE OR REPLACE FUNCTION public.normalize_phone_last10(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10); $$;

CREATE INDEX travelers_phone_normalized_idx
  ON public.travelers (public.normalize_phone_last10(phone));
