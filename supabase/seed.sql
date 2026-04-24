-- seed.sql — Datos mínimos de desarrollo
-- Idempotente: usa ON CONFLICT DO NOTHING o DO UPDATE donde aplica.
-- UUIDs fijos para repetibilidad (solo hex 0-9 a-f).
--
-- UUID scheme (prefijo por entidad):
--   providers        aa000000-…
--   coordinators     bb000000-…
--   buses            cc000000-…
--   hotel_rooms      dd000000-…
--   hotel_room_types ee000000-…
--   travels          ff000000-…
--   travel_buses     ab000000-…
--   travelers        ac000000-…

-- ============================================================
-- PROVIDERS
-- ============================================================
insert into public.providers (
  id,
  name,
  category,
  description,
  location_city,
  location_state,
  location_country,
  contact_name,
  contact_phone,
  contact_email,
  active
) values
(
  'aa000000-0000-0000-0000-000000000001',
  'Transportes Del Norte',
  'transportation',
  'Empresa de autobuses de largo recorrido',
  'Monterrey',
  'Nuevo León',
  'México',
  'Carlos Vega',
  '8181234567',
  'cvega@tdnorte.mx',
  true
),
(
  'aa000000-0000-0000-0000-000000000002',
  'Hotel Sierra Madre',
  'accommodation',
  'Hotel boutique en la sierra',
  'Arteaga',
  'Coahuila',
  'México',
  'Ana Ríos',
  '8441234567',
  'arios@hsierramadre.mx',
  true
),
(
  'aa000000-0000-0000-0000-000000000003',
  'Guías de Montaña MTY',
  'guides',
  'Servicios de guías certificados',
  'Monterrey',
  'Nuevo León',
  'México',
  'Luis Garza',
  '8121234567',
  'lgarza@guiasmty.mx',
  true
)
on conflict (id) do nothing;

-- ============================================================
-- COORDINATORS
-- ============================================================
insert into public.coordinators (
  id,
  name,
  age,
  phone,
  email,
  notes
) values
(
  'bb000000-0000-0000-0000-000000000001',
  'Sofía Martínez',
  34,
  '8191234567',
  'sofia.martinez@viajeros.mx',
  'Coordinadora principal'
),
(
  'bb000000-0000-0000-0000-000000000002',
  'Rodrigo Pérez',
  28,
  '8199876543',
  'rodrigo.perez@viajeros.mx',
  null
)
on conflict (id) do nothing;

-- ============================================================
-- BUSES
-- ============================================================
insert into public.buses (
  id,
  provider_id,
  model,
  brand,
  year,
  seat_count,
  rental_price,
  active
) values
(
  'cc000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000001',
  'OF-1722',
  'Mercedes-Benz',
  2022,
  44,
  12500.00,
  true
),
(
  'cc000000-0000-0000-0000-000000000002',
  'aa000000-0000-0000-0000-000000000001',
  'K310',
  'Volvo',
  2021,
  40,
  11000.00,
  true
)
on conflict (id) do nothing;

-- ============================================================
-- HOTEL ROOMS
-- ============================================================
insert into public.hotel_rooms (
  id,
  provider_id,
  total_rooms
) values
(
  'dd000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000002',
  20
)
on conflict (id) do nothing;

-- ============================================================
-- HOTEL ROOM TYPES
-- ============================================================
insert into public.hotel_room_types (
  id,
  hotel_room_id,
  max_occupancy,
  room_count,
  beds,
  price_per_night,
  cost_per_person,
  additional_details
) values
(
  'ee000000-0000-0000-0000-000000000001',
  'dd000000-0000-0000-0000-000000000001',
  2,
  10,
  '[{"type": "double", "count": 1}]'::jsonb,
  850.00,
  425.00,
  'Habitación doble con vista al jardín'
),
(
  'ee000000-0000-0000-0000-000000000002',
  'dd000000-0000-0000-0000-000000000001',
  4,
  5,
  '[{"type": "double", "count": 2}]'::jsonb,
  1400.00,
  350.00,
  'Suite familiar'
),
(
  'ee000000-0000-0000-0000-000000000003',
  'dd000000-0000-0000-0000-000000000001',
  3,
  5,
  '[{"type": "single", "count": 1}, {"type": "double", "count": 1}]'::jsonb,
  1050.00,
  350.00,
  'Habitación triple'
)
on conflict (id) do nothing;

-- ============================================================
-- TRAVELS
-- ============================================================
insert into public.travels (
  id,
  destination,
  start_date,
  end_date,
  price,
  description,
  status,
  minimum_seats,
  internal_notes
) values
(
  'ff000000-0000-0000-0000-000000000001',
  'Cañón de Santa Elena, Chihuahua',
  '2026-07-10',
  '2026-07-14',
  3800.00,
  'Aventura de 4 días por el cañón más profundo de América del Norte.',
  'pending',
  20,
  'Confirmar autobús con Transportes Del Norte antes del 1 de junio.'
),
(
  'ff000000-0000-0000-0000-000000000002',
  'Santuario de Mariposas Monarca, Michoacán',
  '2026-11-20',
  '2026-11-24',
  4200.00,
  'Viaje a los bosques donde hibernan las mariposas monarca.',
  'confirmed',
  25,
  null
)
on conflict (id) do update set
  destination = excluded.destination,
  status = excluded.status;

-- ============================================================
-- TRAVEL COORDINATORS
-- ============================================================
insert into public.travel_coordinators (
  travel_id,
  coordinator_id
) values
(
  'ff000000-0000-0000-0000-000000000001',
  'bb000000-0000-0000-0000-000000000001'
),
(
  'ff000000-0000-0000-0000-000000000002',
  'bb000000-0000-0000-0000-000000000001'
),
(
  'ff000000-0000-0000-0000-000000000002',
  'bb000000-0000-0000-0000-000000000002'
)
on conflict (travel_id, coordinator_id) do nothing;

-- ============================================================
-- TRAVEL BUSES
-- ============================================================
insert into public.travel_buses (
  id,
  travel_id,
  bus_id,
  provider_id,
  model,
  brand,
  year,
  operator1_name,
  operator1_phone,
  seat_count,
  rental_price
) values
(
  'ab000000-0000-0000-0000-000000000001',
  'ff000000-0000-0000-0000-000000000001',
  'cc000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000001',
  'OF-1722',
  'Mercedes-Benz',
  2022,
  'Fernando Salinas',
  '8181112233',
  44,
  12500.00
)
on conflict (id) do nothing;

-- ============================================================
-- TRAVELERS
-- Representatives first (is_representative = true, representative_id = NULL)
-- ============================================================
insert into public.travelers (
  id,
  travel_id,
  travel_bus_id,
  representative_id,
  is_representative,
  first_name,
  last_name,
  phone,
  seat,
  boarding_point
) values
(
  'ac000000-0000-0000-0000-000000000001',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  null,
  true,
  'Marco',
  'Torres',
  '8181234001',
  '1A',
  'Monterrey — Terminal Norte'
),
(
  'ac000000-0000-0000-0000-000000000002',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  null,
  true,
  'Valentina',
  'Cruz',
  '8181234002',
  '2A',
  'Monterrey — Terminal Norte'
),
(
  'ac000000-0000-0000-0000-000000000003',
  'ff000000-0000-0000-0000-000000000002',
  null,
  null,
  true,
  'Diego',
  'Hernández',
  '8181234003',
  '1B',
  'Monterrey — Terminal Sur'
)
on conflict (id) do nothing;

-- Non-representative traveler (linked to representative ac000000-…-001)
insert into public.travelers (
  id,
  travel_id,
  travel_bus_id,
  representative_id,
  is_representative,
  first_name,
  last_name,
  phone,
  seat,
  boarding_point
) values
(
  'ac000000-0000-0000-0000-000000000004',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  'ac000000-0000-0000-0000-000000000001',
  false,
  'Elena',
  'Torres',
  '8181234004',
  '1B',
  'Monterrey — Terminal Norte'
)
on conflict (id) do nothing;
