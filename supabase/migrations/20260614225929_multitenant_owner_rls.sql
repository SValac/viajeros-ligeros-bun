-- Multi-tenancy: add owner_id to root tables and update all RLS policies.
-- owner_id is added nullable first; backfill + NOT NULL is done in a separate migration.
-- Policies anon_* are preserved unchanged.

-- =============================================
-- PARTE A: columnas owner_id (nullable)
-- =============================================

ALTER TABLE public.travels      ADD COLUMN owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.providers    ADD COLUMN owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.coordinators ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- =============================================
-- PARTE B: DROP políticas authenticated_all
-- =============================================

DROP POLICY "travels_authenticated_all"                        ON public.travels;
DROP POLICY "travel_activities_authenticated_all"              ON public.travel_activities;
DROP POLICY "travel_services_authenticated_all"                ON public.travel_services;
DROP POLICY "travel_buses_authenticated_all"                   ON public.travel_buses;
DROP POLICY "travel_coordinators_authenticated_all"            ON public.travel_coordinators;
DROP POLICY "travel_accommodations_authenticated_all"          ON public.travel_accommodations;
DROP POLICY "travel_media_authenticated_all"                   ON public.travel_media;
DROP POLICY "travelers_authenticated_all"                      ON public.travelers;
DROP POLICY "traveler_account_configs_authenticated_all"       ON public.traveler_account_configs;
DROP POLICY "payments_authenticated_all"                       ON public.payments;
DROP POLICY "quotations_authenticated_all"                     ON public.quotations;
DROP POLICY "quotation_buses_authenticated_all"                ON public.quotation_buses;
DROP POLICY "quotation_accommodations_authenticated_all"       ON public.quotation_accommodations;
DROP POLICY "quotation_accommodation_details_authenticated_all" ON public.quotation_accommodation_details;
DROP POLICY "quotation_providers_authenticated_all"            ON public.quotation_providers;
DROP POLICY "quotation_public_prices_authenticated_all"        ON public.quotation_public_prices;
DROP POLICY "accommodation_payments_authenticated_all"         ON public.accommodation_payments;
DROP POLICY "bus_payments_authenticated_all"                   ON public.bus_payments;
DROP POLICY "provider_payments_authenticated_all"              ON public.provider_payments;
DROP POLICY "providers_authenticated_all"                      ON public.providers;
DROP POLICY "coordinators_authenticated_all"                   ON public.coordinators;
DROP POLICY "buses_authenticated_all"                          ON public.buses;
DROP POLICY "hotel_rooms_authenticated_all"                    ON public.hotel_rooms;
DROP POLICY "hotel_room_types_authenticated_all"               ON public.hotel_room_types;

-- =============================================
-- PARTE C: nuevas políticas por owner
-- =============================================

-- travels (raíz)
CREATE POLICY "travels_owner" ON public.travels
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- providers (raíz)
CREATE POLICY "providers_owner" ON public.providers
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- coordinators (raíz)
CREATE POLICY "coordinators_owner" ON public.coordinators
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- buses → providers
CREATE POLICY "buses_owner" ON public.buses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers WHERE id = provider_id AND owner_id = auth.uid()
  ));

-- hotel_rooms → providers
CREATE POLICY "hotel_rooms_owner" ON public.hotel_rooms
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers WHERE id = provider_id AND owner_id = auth.uid()
  ));

-- hotel_room_types → hotel_rooms → providers
CREATE POLICY "hotel_room_types_owner" ON public.hotel_room_types
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hotel_rooms h
    JOIN public.providers p ON p.id = h.provider_id
    WHERE h.id = hotel_room_id AND p.owner_id = auth.uid()
  ));

-- travel_activities → travels
CREATE POLICY "travel_activities_owner" ON public.travel_activities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_buses → travels
CREATE POLICY "travel_buses_owner" ON public.travel_buses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_services → travels
CREATE POLICY "travel_services_owner" ON public.travel_services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_accommodations → travels
CREATE POLICY "travel_accommodations_owner" ON public.travel_accommodations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_coordinators → travels
CREATE POLICY "travel_coordinators_owner" ON public.travel_coordinators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travel_media → travels
CREATE POLICY "travel_media_owner" ON public.travel_media
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- travelers → travels
CREATE POLICY "travelers_owner" ON public.travelers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- traveler_account_configs → travels
CREATE POLICY "traveler_account_configs_owner" ON public.traveler_account_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- payments → travels
CREATE POLICY "payments_owner" ON public.payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- quotations → travels
CREATE POLICY "quotations_owner" ON public.quotations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND owner_id = auth.uid()));

-- quotation_buses → quotations → travels
CREATE POLICY "quotation_buses_owner" ON public.quotation_buses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_accommodations → quotations → travels
CREATE POLICY "quotation_accommodations_owner" ON public.quotation_accommodations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_providers → quotations → travels
CREATE POLICY "quotation_providers_owner" ON public.quotation_providers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_public_prices → quotations → travels
CREATE POLICY "quotation_public_prices_owner" ON public.quotation_public_prices
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_id AND t.owner_id = auth.uid()
  ));

-- quotation_accommodation_details → quotation_accommodations → quotations → travels
CREATE POLICY "quotation_accommodation_details_owner" ON public.quotation_accommodation_details
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_accommodations qa
    JOIN public.quotations q ON q.id = qa.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qa.id = quotation_accommodation_id AND t.owner_id = auth.uid()
  ));

-- accommodation_payments → quotation_accommodations → quotations → travels
CREATE POLICY "accommodation_payments_owner" ON public.accommodation_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_accommodations qa
    JOIN public.quotations q ON q.id = qa.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qa.id = quotation_accommodation_id AND t.owner_id = auth.uid()
  ));

-- bus_payments → quotation_buses → quotations → travels
CREATE POLICY "bus_payments_owner" ON public.bus_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_buses qb
    JOIN public.quotations q ON q.id = qb.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qb.id = quotation_bus_id AND t.owner_id = auth.uid()
  ));

-- provider_payments → quotation_providers → quotations → travels
CREATE POLICY "provider_payments_owner" ON public.provider_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_providers qp
    JOIN public.quotations q ON q.id = qp.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qp.id = quotation_provider_id AND t.owner_id = auth.uid()
  ));
