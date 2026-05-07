-- Replace all permissive allow_all policies with proper single-admin RLS.
-- authenticated = the single admin (full access to everything)
-- anon = future Landing page (SELECT only on public-facing tables, confirmed travels only)

-- =============================================
-- PUBLIC-FACING TABLES (admin + anon read)
-- =============================================

-- travels
DROP POLICY "travels_allow_all" ON public.travels;
CREATE POLICY "travels_authenticated_all" ON public.travels
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "travels_anon_confirmed" ON public.travels
  FOR SELECT TO anon USING (status = 'confirmed');

-- travel_activities
DROP POLICY "travel_activities_allow_all" ON public.travel_activities;
CREATE POLICY "travel_activities_authenticated_all" ON public.travel_activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "travel_activities_anon_select" ON public.travel_activities
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND status = 'confirmed'));

-- travel_services
DROP POLICY "travel_services_allow_all" ON public.travel_services;
CREATE POLICY "travel_services_authenticated_all" ON public.travel_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "travel_services_anon_select" ON public.travel_services
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.travels WHERE id = travel_id AND status = 'confirmed'));

-- =============================================
-- PRIVATE TABLES (admin only, no anon access)
-- =============================================

-- travel_buses
DROP POLICY "travel_buses_allow_all" ON public.travel_buses;
CREATE POLICY "travel_buses_authenticated_all" ON public.travel_buses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- travel_coordinators
DROP POLICY "travel_coordinators_allow_all" ON public.travel_coordinators;
CREATE POLICY "travel_coordinators_authenticated_all" ON public.travel_coordinators
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- coordinators
DROP POLICY "coordinators_allow_all" ON public.coordinators;
CREATE POLICY "coordinators_authenticated_all" ON public.coordinators
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- providers
DROP POLICY "providers_allow_all" ON public.providers;
CREATE POLICY "providers_authenticated_all" ON public.providers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- travelers
DROP POLICY "travelers_allow_all" ON public.travelers;
CREATE POLICY "travelers_authenticated_all" ON public.travelers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- traveler_account_configs
DROP POLICY "traveler_account_configs_allow_all" ON public.traveler_account_configs;
CREATE POLICY "traveler_account_configs_authenticated_all" ON public.traveler_account_configs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- payments
DROP POLICY "payments_allow_all" ON public.payments;
CREATE POLICY "payments_authenticated_all" ON public.payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- accommodation_payments
DROP POLICY "accommodation_payments_allow_all" ON public.accommodation_payments;
CREATE POLICY "accommodation_payments_authenticated_all" ON public.accommodation_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bus_payments
DROP POLICY "bus_payments_allow_all" ON public.bus_payments;
CREATE POLICY "bus_payments_authenticated_all" ON public.bus_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- provider_payments
DROP POLICY "provider_payments_allow_all" ON public.provider_payments;
CREATE POLICY "provider_payments_authenticated_all" ON public.provider_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- buses
DROP POLICY "buses_allow_all" ON public.buses;
CREATE POLICY "buses_authenticated_all" ON public.buses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hotel_rooms
DROP POLICY "hotel_rooms_allow_all" ON public.hotel_rooms;
CREATE POLICY "hotel_rooms_authenticated_all" ON public.hotel_rooms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- hotel_room_types
DROP POLICY "hotel_room_types_allow_all" ON public.hotel_room_types;
CREATE POLICY "hotel_room_types_authenticated_all" ON public.hotel_room_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotations
DROP POLICY "quotations_allow_all" ON public.quotations;
CREATE POLICY "quotations_authenticated_all" ON public.quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotation_buses
DROP POLICY "quotation_buses_allow_all" ON public.quotation_buses;
CREATE POLICY "quotation_buses_authenticated_all" ON public.quotation_buses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotation_accommodations
DROP POLICY "quotation_accommodations_allow_all" ON public.quotation_accommodations;
CREATE POLICY "quotation_accommodations_authenticated_all" ON public.quotation_accommodations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotation_accommodation_details
DROP POLICY "quotation_accommodation_details_allow_all" ON public.quotation_accommodation_details;
CREATE POLICY "quotation_accommodation_details_authenticated_all" ON public.quotation_accommodation_details
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotation_providers
DROP POLICY "quotation_providers_allow_all" ON public.quotation_providers;
CREATE POLICY "quotation_providers_authenticated_all" ON public.quotation_providers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quotation_public_prices
DROP POLICY "quotation_public_prices_allow_all" ON public.quotation_public_prices;
CREATE POLICY "quotation_public_prices_authenticated_all" ON public.quotation_public_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
