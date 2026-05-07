-- Table linking travels to their gallery files in Supabase Storage.
-- storage_path = path inside the travel-gallery bucket
-- public_url = full CDN URL for display (no auth required)

CREATE TABLE public.travel_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  travel_id uuid NOT NULL REFERENCES public.travels(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_media ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX travel_media_pkey ON public.travel_media USING btree (id);
CREATE INDEX travel_media_travel_id_idx ON public.travel_media USING btree (travel_id);
CREATE INDEX travel_media_order_idx ON public.travel_media USING btree (travel_id, display_order);

ALTER TABLE public.travel_media ADD CONSTRAINT travel_media_pkey PRIMARY KEY USING INDEX travel_media_pkey;

-- Admin: full access
CREATE POLICY "travel_media_authenticated_all" ON public.travel_media
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon: read media only for confirmed travels (Landing page)
CREATE POLICY "travel_media_anon_select" ON public.travel_media
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.travels WHERE id = travel_id AND status = 'confirmed'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_media TO authenticated;
GRANT SELECT ON public.travel_media TO anon;
GRANT ALL ON public.travel_media TO service_role;
