-- seed.sql — Datos mínimos de desarrollo
-- Idempotente: usa ON CONFLICT DO NOTHING o DO UPDATE donde aplica.
-- UUIDs fijos para repetibilidad (solo hex 0-9 a-f).
--
-- UUID scheme (prefijo por entidad):
--   providers (transportation) aa100000-…
--   providers (accommodation)  aa200000-…
--   providers (guides)         aa300000-…
--   providers (bus_agencies)   aa400000-…
--   providers (food_services)  aa500000-…
--   providers (other)          aa600000-…
--   coordinators               bb000000-…
--   buses (agencia 1)          cc410000-…
--   buses (agencia 2)          cc420000-…
--   buses (agencia 3)          cc430000-…
--   hotel_rooms (hotel 1)      dd210000-…
--   hotel_rooms (hotel 2)      dd220000-…
--   hotel_rooms (hotel 3)      dd230000-…
--   hotel_room_types (hotel 1) ee210000-…
--   hotel_room_types (hotel 2) ee220000-…
--   hotel_room_types (hotel 3) ee230000-…
--   travels                    ff000000-…
--   travel_buses               ab000000-…
--   travelers                  ac000000-…

-- ============================================================
-- PROVIDERS — transportation
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa100000-0000-0000-0000-000000000001',
  'Aerovías del Sur',
  'transportation',
  'Traslados aéreos y coordinación de vuelos grupales',
  'Monterrey', 'Nuevo León', 'México',
  'Patricia Leal', '8181001001', 'pleal@aeroviasdelsur.mx', true
),
(
  'aa100000-0000-0000-0000-000000000002',
  'Conexiones Turísticas MTY',
  'transportation',
  'Servicio de shuttles y traslados privados para grupos',
  'Monterrey', 'Nuevo León', 'México',
  'Ernesto Valdés', '8181002002', 'evaldes@conexionesmty.mx', true
),
(
  'aa100000-0000-0000-0000-000000000003',
  'Renta de Vans Premium',
  'transportation',
  'Renta de vans de lujo para grupos pequeños',
  'Guadalajara', 'Jalisco', 'México',
  'Claudia Reyes', '3312003003', 'creyes@vanspremium.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- PROVIDERS — accommodation
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa200000-0000-0000-0000-000000000001',
  'Hotel Sierra Madre',
  'accommodation',
  'Hotel boutique en la sierra con vista panorámica',
  'Arteaga', 'Coahuila', 'México',
  'Ana Ríos', '8441234567', 'arios@hsierramadre.mx', true
),
(
  'aa200000-0000-0000-0000-000000000002',
  'Posada Los Pinos',
  'accommodation',
  'Posada rústica de montaña, ideal para grupos de naturaleza',
  'San Cristóbal de las Casas', 'Chiapas', 'México',
  'Tomás Cifuentes', '9671002002', 'tcifuentes@posaladospinos.mx', true
),
(
  'aa200000-0000-0000-0000-000000000003',
  'Hotel Colonial Zacatecas',
  'accommodation',
  'Hotel de estilo colonial en el centro histórico',
  'Zacatecas', 'Zacatecas', 'México',
  'Rebeca Montes', '4921003003', 'rmontes@hcolonialzac.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- PROVIDERS — guides
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa300000-0000-0000-0000-000000000001',
  'Guías de Montaña MTY',
  'guides',
  'Guías certificados para senderismo y escalada',
  'Monterrey', 'Nuevo León', 'México',
  'Luis Garza', '8121234567', 'lgarza@guiasmty.mx', true
),
(
  'aa300000-0000-0000-0000-000000000002',
  'Ecoturismo Noreste',
  'guides',
  'Guías especializados en flora y fauna del noreste',
  'Linares', 'Nuevo León', 'México',
  'Marcela Fuentes', '8211002002', 'mfuentes@ecoturismonoreste.mx', true
),
(
  'aa300000-0000-0000-0000-000000000003',
  'Aventura y Senderos MX',
  'guides',
  'Expediciones y rutas extremas en el norte del país',
  'Chihuahua', 'Chihuahua', 'México',
  'Jorge Andrade', '6141003003', 'jandrade@avysenderr.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- PROVIDERS — bus_agencies
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa400000-0000-0000-0000-000000000001',
  'Transportes Del Norte',
  'bus_agencies',
  'Empresa de autobuses de largo recorrido y charters grupales',
  'Monterrey', 'Nuevo León', 'México',
  'Carlos Vega', '8181234567', 'cvega@tdnorte.mx', true
),
(
  'aa400000-0000-0000-0000-000000000002',
  'Autobuses Ejecutivos del Bajío',
  'bus_agencies',
  'Autobuses de lujo para grupos ejecutivos y turísticos',
  'León', 'Guanajuato', 'México',
  'Humberto Solís', '4771002002', 'hsolis@aebajio.mx', true
),
(
  'aa400000-0000-0000-0000-000000000003',
  'Flecha Roja Noreste',
  'bus_agencies',
  'Servicio económico de autobuses para grupos escolares y turismo social',
  'Saltillo', 'Coahuila', 'México',
  'Irma Castillo', '8441003003', 'icastillo@flecharojanoreste.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- PROVIDERS — food_services
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa500000-0000-0000-0000-000000000001',
  'Catering Viajes México',
  'food_services',
  'Servicio de catering y lunch box para grupos en viaje',
  'Ciudad de México', 'Ciudad de México', 'México',
  'Sandra Huerta', '5551001001', 'shuerta@cateringviajes.mx', true
),
(
  'aa500000-0000-0000-0000-000000000002',
  'Comedor El Camino Real',
  'food_services',
  'Restaurante de carretera con menú para grupos y paradas programadas',
  'San Luis Potosí', 'San Luis Potosí', 'México',
  'Benjamín Ortiz', '4441002002', 'bortiz@caminoreal.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- PROVIDERS — other
-- ============================================================
insert into public.providers (
  id, name, category, description,
  location_city, location_state, location_country,
  contact_name, contact_phone, contact_email, active
) values
(
  'aa600000-0000-0000-0000-000000000001',
  'Seguros Turísticos Nacional',
  'other',
  'Pólizas de seguro de viaje para grupos nacionales',
  'Ciudad de México', 'Ciudad de México', 'México',
  'Fabiola Mora', '5552001001', 'fmora@segurosturisticos.mx', true
)
on conflict (id) do nothing;

-- ============================================================
-- COORDINATORS
-- ============================================================
insert into public.coordinators (
  id, name, age, phone, email, notes
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
),
(
  'bb000000-0000-0000-0000-000000000003',
  'Valeria Salinas',
  31,
  '8195551234',
  'valeria.salinas@viajeros.mx',
  'Especialista en destinos de naturaleza'
)
on conflict (id) do nothing;

-- ============================================================
-- BUSES — Transportes Del Norte (aa400000-…-001)
-- ============================================================
insert into public.buses (
  id, provider_id, model, brand, year, seat_count, rental_price, active
) values
(
  'cc410000-0000-0000-0000-000000000001',
  'aa400000-0000-0000-0000-000000000001',
  'OF-1722', 'Mercedes-Benz', 2022, 44, 12500.00, true
),
(
  'cc410000-0000-0000-0000-000000000002',
  'aa400000-0000-0000-0000-000000000001',
  'K310', 'Volvo', 2021, 40, 11000.00, true
),
(
  'cc410000-0000-0000-0000-000000000003',
  'aa400000-0000-0000-0000-000000000001',
  'OF-1721', 'Mercedes-Benz', 2020, 44, 10500.00, true
)
on conflict (id) do nothing;

-- ============================================================
-- BUSES — Autobuses Ejecutivos del Bajío (aa400000-…-002)
-- ============================================================
insert into public.buses (
  id, provider_id, model, brand, year, seat_count, rental_price, active
) values
(
  'cc420000-0000-0000-0000-000000000001',
  'aa400000-0000-0000-0000-000000000002',
  'Tourismo', 'Mercedes-Benz', 2023, 46, 15000.00, true
),
(
  'cc420000-0000-0000-0000-000000000002',
  'aa400000-0000-0000-0000-000000000002',
  'Touring HD', 'Scania', 2022, 44, 14000.00, true
)
on conflict (id) do nothing;

-- ============================================================
-- BUSES — Flecha Roja Noreste (aa400000-…-003)
-- ============================================================
insert into public.buses (
  id, provider_id, model, brand, year, seat_count, rental_price, active
) values
(
  'cc430000-0000-0000-0000-000000000001',
  'aa400000-0000-0000-0000-000000000003',
  '9700', 'Volvo', 2020, 50, 9000.00, true
),
(
  'cc430000-0000-0000-0000-000000000002',
  'aa400000-0000-0000-0000-000000000003',
  'Troner Plus', 'Dina', 2019, 48, 8500.00, true
)
on conflict (id) do nothing;

-- ============================================================
-- HOTEL ROOMS — Hotel Sierra Madre (aa200000-…-001)
-- ============================================================
insert into public.hotel_rooms (id, provider_id, total_rooms) values
(
  'dd210000-0000-0000-0000-000000000001',
  'aa200000-0000-0000-0000-000000000001',
  30
)
on conflict (id) do nothing;

insert into public.hotel_room_types (
  id, hotel_room_id, max_occupancy, room_count, beds,
  price_per_night, cost_per_person, additional_details
) values
(
  'ee210000-0000-0000-0000-000000000001',
  'dd210000-0000-0000-0000-000000000001',
  2, 10,
  '[{"type": "double", "count": 1}]'::jsonb,
  850.00, 425.00, 'Habitación doble con vista al jardín'
),
(
  'ee210000-0000-0000-0000-000000000002',
  'dd210000-0000-0000-0000-000000000001',
  4, 8,
  '[{"type": "double", "count": 2}]'::jsonb,
  1400.00, 350.00, 'Suite familiar con balcón'
),
(
  'ee210000-0000-0000-0000-000000000003',
  'dd210000-0000-0000-0000-000000000001',
  3, 6,
  '[{"type": "single", "count": 1}, {"type": "double", "count": 1}]'::jsonb,
  1050.00, 350.00, 'Habitación triple con vista a la sierra'
)
on conflict (id) do nothing;

-- ============================================================
-- HOTEL ROOMS — Posada Los Pinos (aa200000-…-002)
-- ============================================================
insert into public.hotel_rooms (id, provider_id, total_rooms) values
(
  'dd220000-0000-0000-0000-000000000001',
  'aa200000-0000-0000-0000-000000000002',
  20
)
on conflict (id) do nothing;

insert into public.hotel_room_types (
  id, hotel_room_id, max_occupancy, room_count, beds,
  price_per_night, cost_per_person, additional_details
) values
(
  'ee220000-0000-0000-0000-000000000001',
  'dd220000-0000-0000-0000-000000000001',
  2, 8,
  '[{"type": "double", "count": 1}]'::jsonb,
  1200.00, 600.00, 'Cabaña doble con chimenea y vista al bosque'
),
(
  'ee220000-0000-0000-0000-000000000002',
  'dd220000-0000-0000-0000-000000000001',
  4, 6,
  '[{"type": "double", "count": 2}]'::jsonb,
  2000.00, 500.00, 'Cabaña cuádruple con terraza privada'
)
on conflict (id) do nothing;

-- ============================================================
-- HOTEL ROOMS — Hotel Colonial Zacatecas (aa200000-…-003)
-- ============================================================
insert into public.hotel_rooms (id, provider_id, total_rooms) values
(
  'dd230000-0000-0000-0000-000000000001',
  'aa200000-0000-0000-0000-000000000003',
  40
)
on conflict (id) do nothing;

insert into public.hotel_room_types (
  id, hotel_room_id, max_occupancy, room_count, beds,
  price_per_night, cost_per_person, additional_details
) values
(
  'ee230000-0000-0000-0000-000000000001',
  'dd230000-0000-0000-0000-000000000001',
  1, 10,
  '[{"type": "single", "count": 1}]'::jsonb,
  700.00, 700.00, 'Habitación sencilla en patio colonial'
),
(
  'ee230000-0000-0000-0000-000000000002',
  'dd230000-0000-0000-0000-000000000001',
  2, 20,
  '[{"type": "double", "count": 1}]'::jsonb,
  950.00, 475.00, 'Habitación doble estándar'
),
(
  'ee230000-0000-0000-0000-000000000003',
  'dd230000-0000-0000-0000-000000000001',
  2, 10,
  '[{"type": "king", "count": 1}]'::jsonb,
  1500.00, 750.00, 'Suite junior con jacuzzi y vista a la catedral'
)
on conflict (id) do nothing;

-- ============================================================
-- TRAVELS
-- ============================================================
insert into public.travels (
  id, destination, start_date, end_date, price, description,
  status, minimum_seats, internal_notes
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
  status      = excluded.status;

-- ============================================================
-- TRAVEL COORDINATORS
-- ============================================================
insert into public.travel_coordinators (travel_id, coordinator_id) values
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
  id, travel_id, bus_id, provider_id,
  model, brand, year,
  operator1_name, operator1_phone,
  seat_count, rental_price
) values
(
  'ab000000-0000-0000-0000-000000000001',
  'ff000000-0000-0000-0000-000000000001',
  'cc410000-0000-0000-0000-000000000001',
  'aa400000-0000-0000-0000-000000000001',
  'OF-1722', 'Mercedes-Benz', 2022,
  'Fernando Salinas', '8181112233',
  44, 12500.00
)
on conflict (id) do nothing;

-- ============================================================
-- TRAVELERS
-- Representatives first (is_representative = true, representative_id = NULL)
-- ============================================================
insert into public.travelers (
  id, travel_id, travel_bus_id, representative_id, is_representative,
  first_name, last_name, phone, seat, boarding_point
) values
(
  'ac000000-0000-0000-0000-000000000001',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  null, true,
  'Marco', 'Torres', '8181234001', 1,
  'Monterrey — Terminal Norte'
),
(
  'ac000000-0000-0000-0000-000000000002',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  null, true,
  'Valentina', 'Cruz', '8181234002', 2,
  'Monterrey — Terminal Norte'
),
(
  'ac000000-0000-0000-0000-000000000003',
  'ff000000-0000-0000-0000-000000000002',
  null, null, true,
  'Diego', 'Hernández', '8181234003', 1,
  'Monterrey — Terminal Sur'
)
on conflict (id) do nothing;

-- Non-representative traveler (linked to representative ac000000-…-001)
insert into public.travelers (
  id, travel_id, travel_bus_id, representative_id, is_representative,
  first_name, last_name, phone, seat, boarding_point
) values
(
  'ac000000-0000-0000-0000-000000000004',
  'ff000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000001',
  'ac000000-0000-0000-0000-000000000001',
  false,
  'Elena', 'Torres', '8181234004', 3,
  'Monterrey — Terminal Norte'
)
on conflict (id) do nothing;
