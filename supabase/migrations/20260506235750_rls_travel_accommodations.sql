ALTER TABLE public.travel_accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_accommodations_authenticated_all" ON public.travel_accommodations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
