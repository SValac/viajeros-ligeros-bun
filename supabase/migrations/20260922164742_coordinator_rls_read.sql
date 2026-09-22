-- travels: el encabezado. Ya no tiene columnas financieras.
CREATE POLICY "travels_coordinator_select" ON public.travels
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(id));

-- travel_buses: operadores y datos del vehículo. Ya no tiene rental_price.
CREATE POLICY "travel_buses_coordinator_select" ON public.travel_buses
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_activities_coordinator_select" ON public.travel_activities
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travelers_coordinator_select" ON public.travelers
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_media_coordinator_select" ON public.travel_media
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_accommodations_coordinator_select" ON public.travel_accommodations
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_services_coordinator_select" ON public.travel_services
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "travel_coordinators_coordinator_select" ON public.travel_coordinators
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));


--  Bloque 2 (coordinators para compañeros de coordinación, y providers)
CREATE POLICY "coordinators_coordinator_select" ON public.coordinators
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_coordinators tc
    WHERE tc.coordinator_id = coordinators.id
      AND private.is_travel_coordinator(tc.travel_id)
  ));

CREATE POLICY "providers_coordinator_select" ON public.providers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travel_accommodations ta
    WHERE ta.provider_id = providers.id AND private.is_travel_coordinator(ta.travel_id)
  ) OR EXISTS (
    SELECT 1 FROM public.travel_buses tb
    WHERE tb.provider_id = providers.id AND private.is_travel_coordinator(tb.travel_id)
  ));