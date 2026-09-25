-- Readable public URL for a travel: /viajes/<slug> instead of /viajes/<uuid>.
--
-- The slug is owned by the database: it is generated the first time a travel
-- becomes 'published' and never changes afterwards (not even if the label or
-- the date change), so links already shared keep working. Clients cannot set
-- or edit it.
--
-- Unique across ALL agencies: the public site lists every agency's travels
-- under the same /viajes path.

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.travels
  ADD COLUMN "slug" text,
  ADD CONSTRAINT travels_slug_key UNIQUE (slug),
  ADD CONSTRAINT travels_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 100
  );

-- Base slug: label + "<month>-<year>" of start_date.
-- "Santuario de Mariposas Monarca, Michoacán" / 2026-11-20
--   -> santuario-de-mariposas-monarca-michoacan-nov-2026
-- The label part is cut to 80 chars on a word boundary; if nothing usable is
-- left, falls back to viaje-<first 8 chars of the id>.
CREATE FUNCTION private.travel_slug_base(p_label text, p_start_date date, p_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_label text;
  v_date text;
  v_base text;
BEGIN
  -- Two-arg unaccent: the one-arg form resolves the dictionary through
  -- search_path, which is empty here.
  v_label := lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_label, '')));
  v_label := btrim(regexp_replace(v_label, '[^a-z0-9]+', '-', 'g'), '-');

  IF char_length(v_label) > 80 THEN
    -- Keep 81 chars and drop the trailing (possibly cut) word. A single word
    -- longer than 80 chars is hard-cut instead.
    v_label := CASE
      WHEN strpos(left(v_label, 81), '-') > 0
        THEN regexp_replace(left(v_label, 81), '-[^-]*$', '')
      ELSE left(v_label, 80)
    END;
  END IF;

  IF p_start_date IS NOT NULL THEN
    v_date := (ARRAY['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])
                [extract(month FROM p_start_date)::int]
              || '-' || extract(year FROM p_start_date)::int;
  END IF;

  v_base := concat_ws('-', nullif(v_label, ''), v_date);

  IF v_base = '' THEN
    v_base := 'viaje-' || left(p_id::text, 8);
  END IF;

  RETURN v_base;
END;
$$;

-- First free slug for the travel: base, base-2, base-3, ...
-- Collisions are checked against every agency's travels, so it must run
-- without RLS: it is only called from the SECURITY DEFINER trigger below and
-- from the backfill, never by API roles.
CREATE FUNCTION private.next_travel_slug(p_label text, p_start_date date, p_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_base text := private.travel_slug_base(p_label, p_start_date, p_id);
  v_candidate text := v_base;
  v_n int := 1;
BEGIN
  -- Serialize concurrent publishes of travels sharing the same base, so two
  -- of them cannot both pick the same free candidate.
  PERFORM pg_advisory_xact_lock(hashtext('travel_slug:' || v_base));

  WHILE EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.slug = v_candidate AND t.id <> p_id
  ) LOOP
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  END LOOP;

  RETURN v_candidate;
END;
$$;

REVOKE ALL ON FUNCTION private.travel_slug_base(text, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.next_travel_slug(text, date, uuid) FROM PUBLIC, anon, authenticated;

-- Backfill already-published travels, oldest first so they keep the
-- un-suffixed slug. Row by row so each one sees the slugs assigned before it.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, label, start_date FROM public.travels
    WHERE status = 'published' AND slug IS NULL
    ORDER BY created_at, id
  LOOP
    UPDATE public.travels
    SET slug = private.next_travel_slug(r.label, r.start_date, r.id)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- The trigger owns the column: whatever the client sends is ignored.
--
-- SECURITY DEFINER so next_travel_slug() sees the slugs of every agency, not
-- just the caller's (RLS). A trigger function cannot be called through the
-- API, and the only thing it reveals is whether a slug is already taken.
CREATE FUNCTION private.assign_travel_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := NULL;
  ELSE
    NEW.slug := OLD.slug;
  END IF;

  IF NEW.status = 'published' AND NEW.slug IS NULL THEN
    NEW.slug := private.next_travel_slug(NEW.label, NEW.start_date, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.assign_travel_slug() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER travels_assign_slug
  BEFORE INSERT OR UPDATE OF status, slug ON public.travels
  FOR EACH ROW EXECUTE FUNCTION private.assign_travel_slug();
