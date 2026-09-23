# Validaciones de sanitización en Supabase (defense-in-depth)

Fecha del plan: 2026-08-25. Fase 2 del trabajo de sanitización de formularios (Fase 1 = frontend, ya implementada y commiteada en `feature/form-fields-sanitization`).

## Contexto

Ya implementamos sanitización en el frontend (`app/utils/form-validation.ts`): 4 funciones/schemas reutilizables de Zod —`nameSchema`, `phoneSchema`, `businessNameSchema`, `textSchema`— aplicadas en ~20 componentes Vue para evitar que se guarden nombres con números, teléfonos con letras, etc. Esa validación solo corre en el navegador: cualquier escritura que no pase por esos formularios (RPCs, el editor SQL de Supabase, un bug futuro en el front, un cliente API directo) puede seguir guardando datos inválidos. Esta fase agrega la misma validación como `CHECK` constraints en Postgres, para que la base de datos rechace esos datos sin importar por dónde entren.

Decisiones ya confirmadas (no reabrir al implementar):

1. Los campos de texto libre (notes/remarks/description que en el front usan `textSchema`, no `businessNameSchema`) solo llevan `CHECK` de longitud, sin restringir caracteres.
2. Antes de exigir la regla sobre filas ya existentes, se audita el dato actual (no se valida a ciegas) — por eso los constraints se agregan `NOT VALID` y el `VALIDATE CONSTRAINT` es un paso posterior y separado.
3. Ninguno de los ~35 campos objetivo vive en JSONB (confirmado por exploración) — todos son columnas `text` planas, así que no hace falta manejar `->>'key'`.

## Enfoque

Igual que en el frontend (reutilizar una función en vez de repetir el regex en cada campo), se crean **3 funciones SQL reutilizables** en `public`, espejo exacto de los 3 regex con charset restringido del frontend (el 4to, `textSchema`, no restringe charset así que no necesita función, solo `char_length`):

- `public.is_valid_person_name(text)` → espejo de `NAME_REGEX`
- `public.is_valid_phone(text)` → espejo de `PHONE_REGEX`
- `public.is_valid_business_name(text)` → espejo de `BUSINESS_NAME_REGEX`

**Traducción de Unicode**: el regex de Postgres (`~`, POSIX ARE) no soporta `\p{L}`/`\p{N}` como Zod/JS. En vez de depender de `[[:alpha:]]` (cuyo comportamiento depende del `LC_CTYPE` del servidor — frágil e implícito), se usa el rango explícito `À-ÖØ-öø-ÿ` (Latin-1 Supplement, excluyendo `×`/`÷` que caen en los huecos), determinista sin importar el locale de la instancia. Cubre español/latín igual que el `\p{L}` del frontend; no cubre otros alfabetos, consistente con que la app es solo en español.

**Estilo SQL**: `LANGUAGE sql IMMUTABLE SET search_path = ''` — exactamente el patrón ya usado en `public.normalize_phone_last10` (`supabase/migrations/20260722031205_travel_access_codes_schema.sql:54-56`), así que no se introduce un estilo nuevo. Se agrega también `btrim(value) = value` en cada función (el frontend hace `.trim()` antes de validar formato; esto asegura que la DB exija lo mismo, no solo el charset).

**Estrategia de rollout segura**: cada `CHECK` se agrega con `NOT VALID` — protege de inmediato todo `INSERT`/`UPDATE` nuevo, pero no escanea ni falla sobre filas existentes. Un script de auditoría (aparte, no es una migración) permite revisar qué filas violarían cada regla antes de decidir si correr `VALIDATE CONSTRAINT` (que sí escanea el histórico).

## Mapeo campo → categoría → tabla.columna

Auditado contra el código real de cada `.vue` (no solo contra el resumen inicial de exploración — se encontraron y corrigieron 2 discrepancias, ver más abajo).

| Categoría                | Función/regla                                                                 | Columnas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **name**                 | `is_valid_person_name`                                                        | `travelers.first_name`, `travelers.last_name`, `coordinators.name`, `providers.location_city/state/country`, `providers.contact_name` (nullable), `travel_buses.operator1_name`, `travel_buses.operator2_name` (nullable)                                                                                                                                                                                                                                                                                                                                    |
| **phone**                | `is_valid_phone`                                                              | `travelers.phone`, `coordinators.phone`, `providers.contact_phone` (nullable), `travel_buses.operator1_phone`, `travel_buses.operator2_phone` (nullable)                                                                                                                                                                                                                                                                                                                                                                                                     |
| **businessName**         | `is_valid_business_name`                                                      | `providers.name`, `travel_buses.brand/model` (nullable), `buses.brand/model` (nullable), `travels.label`, `travels.destination` (nullable), `travel_activities.title`, `travel_services.name`, `travelers.boarding_point`, `quotation_buses.unit_number`, `quotation_public_prices.price_type/description/room_type/age_group`                                                                                                                                                                                                                               |
| **text (solo longitud)** | `char_length(col) <= N` (o `BETWEEN min AND max` si el frontend exige mínimo) | `coordinators.notes`(500), `providers.description`(500)/`contact_notes`(300), `travels.description`(10-3000)/`internal_notes`(500), `travel_activities.description`(10-500)/`location`(200), `travel_services.description`(300), `quotations.notes`(1000), `quotation_buses.remarks/notes`(500), `quotation_providers.service_description`(3-200)/`remarks`(500), `quotation_public_prices.notes`(500), `bus_payments/provider_payments/accommodation_payments.concept`(200)/`notes`(500), `payments.notes`(500), `hotel_room_types.additional_details`(500) |

Todas las columnas nullable llevan `col IS NULL OR <regla>` para no romper el `NULL` legítimo.

**Dos correcciones vs. el inventario inicial de exploración** (verificadas contra el `.vue` real):

- `travel_activities.location` va en **text**, no businessName — `travel-activity-form.vue` usa `textSchema({max:200})`.
- `quotation_public_prices.description` va en **businessName**, no text — `cotizacion-precio-publico-section.vue` usa `businessNameSchema`, a diferencia de las otras columnas `description`.
- `quotations.notes` faltaba en el inventario inicial (es la tabla padre de la cotización, distinta de `quotation_buses`) — ya está cubierta en el front por `crearNotesInput`/`paramsNotesInput` en `pages/travels/[id]/cotizacion.vue`.

## Archivo 1 — `supabase/migrations/20260825120000_add_field_sanitization_constraints.sql`

Timestamp posterior a la última migración existente (`20260722180623`). Contenido completo:

```sql
-- Validación de entrada a nivel de base de datos (defense-in-depth), espejo de las
-- 4 categorías de sanitización ya implementadas en app/utils/form-validation.ts.
--
-- Todas las restricciones se agregan con NOT VALID: se aplican de inmediato a todo
-- INSERT/UPDATE nuevo, pero NO escanean ni fallan sobre filas existentes. Antes de
-- correr VALIDATE CONSTRAINT (ver migración de seguimiento), auditar datos existentes
-- con supabase/scripts/audit_sanitization_constraints.sql.

-- ============================================================================
-- BLOQUE 1: funciones de validación reutilizables
-- ============================================================================

-- Nombres de persona/lugar: letras unicode (rango Latin-1, sin × ni ÷), espacios,
-- apóstrofe, punto y guion; debe contener al menos una letra; sin espacios al
-- borde (mismo resultado que el .trim() del frontend).
-- Se usa el rango explícito À-ÖØ-öø-ÿ en vez de [[:alpha:]] porque este último
-- depende del LC_CTYPE del servidor (locale-dependent); el rango explícito es
-- determinista sin importar el collation/locale de la instancia de Postgres.
CREATE OR REPLACE FUNCTION public.is_valid_person_name(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT value IS NOT NULL
    AND btrim(value) = value
    AND value ~ '^[A-Za-zÀ-ÖØ-öø-ÿ\s''.-]+$'
    AND value ~ '[A-Za-zÀ-ÖØ-öø-ÿ]';
$$;

COMMENT ON FUNCTION public.is_valid_person_name(text) IS
  'Espejo de NAME_REGEX en app/utils/form-validation.ts (nameSchema): letras unicode (Latin-1), espacios, apóstrofe, punto y guion; exige al menos una letra.';

-- Teléfonos: + opcional al inicio, dígitos/espacios/guiones/paréntesis; al menos
-- 7 caracteres numéricos en total.
CREATE OR REPLACE FUNCTION public.is_valid_phone(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT value IS NOT NULL
    AND btrim(value) = value
    AND value ~ '^\+?[0-9\s()-]+$'
    AND length(regexp_replace(value, '[^0-9]', '', 'g')) >= 7;
$$;

COMMENT ON FUNCTION public.is_valid_phone(text) IS
  'Espejo de PHONE_REGEX en app/utils/form-validation.ts (phoneSchema): + opcional, dígitos, espacios, guiones y paréntesis; exige al menos 7 dígitos.';

-- Nombres de negocio / etiquetas cortas: letras y números unicode (Latin-1),
-- espacios, y la puntuación típica de un nombre de negocio: ' & . , / ( ) ° # -
-- Debe contener al menos una letra o un número.
CREATE OR REPLACE FUNCTION public.is_valid_business_name(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT value IS NOT NULL
    AND btrim(value) = value
    AND value ~ '^[A-Za-z0-9À-ÖØ-öø-ÿ\s''&.,/()°#-]+$'
    AND value ~ '[A-Za-z0-9À-ÖØ-öø-ÿ]';
$$;

COMMENT ON FUNCTION public.is_valid_business_name(text) IS
  'Espejo de BUSINESS_NAME_REGEX en app/utils/form-validation.ts (businessNameSchema): letras/números unicode (Latin-1) + '' & . , / ( ) ° # - ; exige al menos una letra o número.';

-- ============================================================================
-- BLOQUE 2: travelers
-- ============================================================================

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_first_name_check CHECK (public.is_valid_person_name(first_name)) NOT VALID;

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_last_name_check CHECK (public.is_valid_person_name(last_name)) NOT VALID;

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_phone_check CHECK (public.is_valid_phone(phone)) NOT VALID;

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_boarding_point_check CHECK (public.is_valid_business_name(boarding_point)) NOT VALID;

-- ============================================================================
-- BLOQUE 3: coordinators
-- ============================================================================

ALTER TABLE public.coordinators
  ADD CONSTRAINT coordinators_name_check CHECK (public.is_valid_person_name(name)) NOT VALID;

ALTER TABLE public.coordinators
  ADD CONSTRAINT coordinators_phone_check CHECK (public.is_valid_phone(phone)) NOT VALID;

ALTER TABLE public.coordinators
  ADD CONSTRAINT coordinators_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 4: providers
-- ============================================================================

ALTER TABLE public.providers
  ADD CONSTRAINT providers_name_check CHECK (public.is_valid_business_name(name)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_location_city_check CHECK (public.is_valid_person_name(location_city)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_location_state_check CHECK (public.is_valid_person_name(location_state)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_location_country_check CHECK (public.is_valid_person_name(location_country)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_contact_name_check CHECK (contact_name IS NULL OR public.is_valid_person_name(contact_name)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_contact_phone_check CHECK (contact_phone IS NULL OR public.is_valid_phone(contact_phone)) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_description_check CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_contact_notes_check CHECK (contact_notes IS NULL OR char_length(contact_notes) <= 300) NOT VALID;

-- ============================================================================
-- BLOQUE 5: travel_buses
-- ============================================================================

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_operator1_name_check CHECK (public.is_valid_person_name(operator1_name)) NOT VALID;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_operator2_name_check CHECK (operator2_name IS NULL OR public.is_valid_person_name(operator2_name)) NOT VALID;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_operator1_phone_check CHECK (public.is_valid_phone(operator1_phone)) NOT VALID;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_operator2_phone_check CHECK (operator2_phone IS NULL OR public.is_valid_phone(operator2_phone)) NOT VALID;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_brand_check CHECK (brand IS NULL OR public.is_valid_business_name(brand)) NOT VALID;

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_model_check CHECK (model IS NULL OR public.is_valid_business_name(model)) NOT VALID;

-- ============================================================================
-- BLOQUE 6: buses (catálogo)
-- ============================================================================

ALTER TABLE public.buses
  ADD CONSTRAINT buses_brand_check CHECK (brand IS NULL OR public.is_valid_business_name(brand)) NOT VALID;

ALTER TABLE public.buses
  ADD CONSTRAINT buses_model_check CHECK (model IS NULL OR public.is_valid_business_name(model)) NOT VALID;

-- ============================================================================
-- BLOQUE 7: travels
-- ============================================================================

ALTER TABLE public.travels
  ADD CONSTRAINT travels_label_check CHECK (public.is_valid_business_name(label)) NOT VALID;

ALTER TABLE public.travels
  ADD CONSTRAINT travels_destination_check CHECK (destination IS NULL OR public.is_valid_business_name(destination)) NOT VALID;

ALTER TABLE public.travels
  ADD CONSTRAINT travels_description_check CHECK (char_length(description) BETWEEN 10 AND 3000) NOT VALID;

ALTER TABLE public.travels
  ADD CONSTRAINT travels_internal_notes_check CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 8: travel_activities
-- ============================================================================

ALTER TABLE public.travel_activities
  ADD CONSTRAINT travel_activities_title_check CHECK (public.is_valid_business_name(title)) NOT VALID;

ALTER TABLE public.travel_activities
  ADD CONSTRAINT travel_activities_description_check CHECK (char_length(description) BETWEEN 10 AND 500) NOT VALID;

-- Nota: location es categoría "text" (sin restricción de charset), no "businessName";
-- travel-activity-form.vue usa textSchema({ max: 200 }) para este campo.
ALTER TABLE public.travel_activities
  ADD CONSTRAINT travel_activities_location_check CHECK (location IS NULL OR char_length(location) <= 200) NOT VALID;

-- ============================================================================
-- BLOQUE 9: travel_services
-- ============================================================================

ALTER TABLE public.travel_services
  ADD CONSTRAINT travel_services_name_check CHECK (public.is_valid_business_name(name)) NOT VALID;

ALTER TABLE public.travel_services
  ADD CONSTRAINT travel_services_description_check CHECK (description IS NULL OR char_length(description) <= 300) NOT VALID;

-- ============================================================================
-- BLOQUE 10: quotations
-- ============================================================================

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_notes_check CHECK (notes IS NULL OR char_length(notes) <= 1000) NOT VALID;

-- ============================================================================
-- BLOQUE 11: quotation_buses
-- ============================================================================

ALTER TABLE public.quotation_buses
  ADD CONSTRAINT quotation_buses_unit_number_check CHECK (public.is_valid_business_name(unit_number)) NOT VALID;

ALTER TABLE public.quotation_buses
  ADD CONSTRAINT quotation_buses_remarks_check CHECK (remarks IS NULL OR char_length(remarks) <= 500) NOT VALID;

ALTER TABLE public.quotation_buses
  ADD CONSTRAINT quotation_buses_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 12: quotation_providers
-- ============================================================================

ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_service_description_check CHECK (char_length(service_description) BETWEEN 3 AND 200) NOT VALID;

ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_remarks_check CHECK (remarks IS NULL OR char_length(remarks) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 13: quotation_public_prices
-- ============================================================================

ALTER TABLE public.quotation_public_prices
  ADD CONSTRAINT quotation_public_prices_price_type_check CHECK (public.is_valid_business_name(price_type)) NOT VALID;

-- Nota: description aquí es categoría "businessName" (cotizacion-precio-publico-section.vue
-- usa businessNameSchema, no textSchema, a diferencia de otras columnas "description").
ALTER TABLE public.quotation_public_prices
  ADD CONSTRAINT quotation_public_prices_description_check CHECK (public.is_valid_business_name(description)) NOT VALID;

ALTER TABLE public.quotation_public_prices
  ADD CONSTRAINT quotation_public_prices_room_type_check CHECK (room_type IS NULL OR public.is_valid_business_name(room_type)) NOT VALID;

ALTER TABLE public.quotation_public_prices
  ADD CONSTRAINT quotation_public_prices_age_group_check CHECK (age_group IS NULL OR public.is_valid_business_name(age_group)) NOT VALID;

ALTER TABLE public.quotation_public_prices
  ADD CONSTRAINT quotation_public_prices_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 14: pagos (bus_payments, provider_payments, accommodation_payments, payments)
-- ============================================================================

ALTER TABLE public.bus_payments
  ADD CONSTRAINT bus_payments_concept_check CHECK (concept IS NULL OR char_length(concept) <= 200) NOT VALID;

ALTER TABLE public.bus_payments
  ADD CONSTRAINT bus_payments_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

ALTER TABLE public.provider_payments
  ADD CONSTRAINT provider_payments_concept_check CHECK (concept IS NULL OR char_length(concept) <= 200) NOT VALID;

ALTER TABLE public.provider_payments
  ADD CONSTRAINT provider_payments_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

ALTER TABLE public.accommodation_payments
  ADD CONSTRAINT accommodation_payments_concept_check CHECK (concept IS NULL OR char_length(concept) <= 200) NOT VALID;

ALTER TABLE public.accommodation_payments
  ADD CONSTRAINT accommodation_payments_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

-- Nota: payments (pagos de traveler) no tiene columna concept, y su campo notes
-- hoy no tiene validación de longitud en el frontend (payment-form.vue usa un ref
-- sin schema). Se aplica el mismo tope de 500 que sus tablas hermanas por
-- consistencia; considerar agregar textSchema({ max: 500 }) también en el frontend.
ALTER TABLE public.payments
  ADD CONSTRAINT payments_notes_check CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID;

-- ============================================================================
-- BLOQUE 15: hotel_room_types
-- ============================================================================

ALTER TABLE public.hotel_room_types
  ADD CONSTRAINT hotel_room_types_additional_details_check CHECK (additional_details IS NULL OR char_length(additional_details) <= 500) NOT VALID;
```

Total: 3 funciones + 51 `NOT VALID` CHECK constraints en 16 tablas.

### Endurecimiento opcional (no bloqueante)

Las 3 funciones en `public` quedan auto-expuestas por PostgREST como RPCs (`POST /rest/v1/rpc/is_valid_phone`, etc.) — inofensivo (deterministas, sin acceso a datos), pero si se prefiere no crecer la superficie pública, agregar al final de la migración:

```sql
REVOKE EXECUTE ON FUNCTION public.is_valid_person_name(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_valid_phone(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_valid_business_name(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_valid_person_name(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_valid_phone(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_valid_business_name(text) TO authenticated, service_role;
```

Esto no afecta la evaluación de los `CHECK` (corren con el rol que escribe, que sí tendría el grant).

## Archivo 2 — `supabase/scripts/audit_sanitization_constraints.sql` (nuevo directorio, NO es una migración)

Se corre manualmente (Studio o `psql`) contra la base local **después** de aplicar la migración 1 y **antes** de correr cualquier `VALIDATE CONSTRAINT`. Un resultado vacío en cada bloque significa que esa restricción es segura de validar.

```sql
-- Auditoría de datos existentes contra las nuevas restricciones de sanitización.
-- Ejecutar DESPUÉS de aplicar 20260825120000_add_field_sanitization_constraints.sql
-- (las funciones is_valid_* deben existir) y ANTES de correr VALIDATE CONSTRAINT.
-- Un resultado vacío en cada bloque significa que esa restricción es segura de validar.

-- travelers
SELECT id, first_name FROM public.travelers WHERE NOT public.is_valid_person_name(first_name);
SELECT id, last_name FROM public.travelers WHERE NOT public.is_valid_person_name(last_name);
SELECT id, phone FROM public.travelers WHERE NOT public.is_valid_phone(phone);
SELECT id, boarding_point FROM public.travelers WHERE NOT public.is_valid_business_name(boarding_point);

-- coordinators
SELECT id, name FROM public.coordinators WHERE NOT public.is_valid_person_name(name);
SELECT id, phone FROM public.coordinators WHERE NOT public.is_valid_phone(phone);
SELECT id, char_length(notes) AS len FROM public.coordinators WHERE notes IS NOT NULL AND char_length(notes) > 500;

-- providers
SELECT id, name FROM public.providers WHERE NOT public.is_valid_business_name(name);
SELECT id, location_city FROM public.providers WHERE NOT public.is_valid_person_name(location_city);
SELECT id, location_state FROM public.providers WHERE NOT public.is_valid_person_name(location_state);
SELECT id, location_country FROM public.providers WHERE NOT public.is_valid_person_name(location_country);
SELECT id, contact_name FROM public.providers WHERE contact_name IS NOT NULL AND NOT public.is_valid_person_name(contact_name);
SELECT id, contact_phone FROM public.providers WHERE contact_phone IS NOT NULL AND NOT public.is_valid_phone(contact_phone);
SELECT id, char_length(description) AS len FROM public.providers WHERE description IS NOT NULL AND char_length(description) > 500;
SELECT id, char_length(contact_notes) AS len FROM public.providers WHERE contact_notes IS NOT NULL AND char_length(contact_notes) > 300;

-- travel_buses
SELECT id, operator1_name FROM public.travel_buses WHERE NOT public.is_valid_person_name(operator1_name);
SELECT id, operator2_name FROM public.travel_buses WHERE operator2_name IS NOT NULL AND NOT public.is_valid_person_name(operator2_name);
SELECT id, operator1_phone FROM public.travel_buses WHERE NOT public.is_valid_phone(operator1_phone);
SELECT id, operator2_phone FROM public.travel_buses WHERE operator2_phone IS NOT NULL AND NOT public.is_valid_phone(operator2_phone);
SELECT id, brand FROM public.travel_buses WHERE brand IS NOT NULL AND NOT public.is_valid_business_name(brand);
SELECT id, model FROM public.travel_buses WHERE model IS NOT NULL AND NOT public.is_valid_business_name(model);

-- buses (catálogo)
SELECT id, brand FROM public.buses WHERE brand IS NOT NULL AND NOT public.is_valid_business_name(brand);
SELECT id, model FROM public.buses WHERE model IS NOT NULL AND NOT public.is_valid_business_name(model);

-- travels
SELECT id, label FROM public.travels WHERE NOT public.is_valid_business_name(label);
SELECT id, destination FROM public.travels WHERE destination IS NOT NULL AND NOT public.is_valid_business_name(destination);
SELECT id, char_length(description) AS len FROM public.travels WHERE char_length(description) < 10 OR char_length(description) > 3000;
SELECT id, char_length(internal_notes) AS len FROM public.travels WHERE internal_notes IS NOT NULL AND char_length(internal_notes) > 500;

-- travel_activities
SELECT id, title FROM public.travel_activities WHERE NOT public.is_valid_business_name(title);
SELECT id, char_length(description) AS len FROM public.travel_activities WHERE char_length(description) < 10 OR char_length(description) > 500;
SELECT id, char_length(location) AS len FROM public.travel_activities WHERE location IS NOT NULL AND char_length(location) > 200;

-- travel_services
SELECT id, name FROM public.travel_services WHERE NOT public.is_valid_business_name(name);
SELECT id, char_length(description) AS len FROM public.travel_services WHERE description IS NOT NULL AND char_length(description) > 300;

-- quotations
SELECT id, char_length(notes) AS len FROM public.quotations WHERE notes IS NOT NULL AND char_length(notes) > 1000;

-- quotation_buses
SELECT id, unit_number FROM public.quotation_buses WHERE NOT public.is_valid_business_name(unit_number);
SELECT id, char_length(remarks) AS len FROM public.quotation_buses WHERE remarks IS NOT NULL AND char_length(remarks) > 500;
SELECT id, char_length(notes) AS len FROM public.quotation_buses WHERE notes IS NOT NULL AND char_length(notes) > 500;

-- quotation_providers
SELECT id, char_length(service_description) AS len FROM public.quotation_providers WHERE char_length(service_description) < 3 OR char_length(service_description) > 200;
SELECT id, char_length(remarks) AS len FROM public.quotation_providers WHERE remarks IS NOT NULL AND char_length(remarks) > 500;

-- quotation_public_prices
SELECT id, price_type FROM public.quotation_public_prices WHERE NOT public.is_valid_business_name(price_type);
SELECT id, description FROM public.quotation_public_prices WHERE NOT public.is_valid_business_name(description);
SELECT id, room_type FROM public.quotation_public_prices WHERE room_type IS NOT NULL AND NOT public.is_valid_business_name(room_type);
SELECT id, age_group FROM public.quotation_public_prices WHERE age_group IS NOT NULL AND NOT public.is_valid_business_name(age_group);
SELECT id, char_length(notes) AS len FROM public.quotation_public_prices WHERE notes IS NOT NULL AND char_length(notes) > 500;

-- pagos
SELECT id, char_length(concept) AS len FROM public.bus_payments WHERE concept IS NOT NULL AND char_length(concept) > 200;
SELECT id, char_length(notes) AS len FROM public.bus_payments WHERE notes IS NOT NULL AND char_length(notes) > 500;
SELECT id, char_length(concept) AS len FROM public.provider_payments WHERE concept IS NOT NULL AND char_length(concept) > 200;
SELECT id, char_length(notes) AS len FROM public.provider_payments WHERE notes IS NOT NULL AND char_length(notes) > 500;
SELECT id, char_length(concept) AS len FROM public.accommodation_payments WHERE concept IS NOT NULL AND char_length(concept) > 200;
SELECT id, char_length(notes) AS len FROM public.accommodation_payments WHERE notes IS NOT NULL AND char_length(notes) > 500;
SELECT id, char_length(notes) AS len FROM public.payments WHERE notes IS NOT NULL AND char_length(notes) > 500;

-- hotel_room_types
SELECT id, char_length(additional_details) AS len FROM public.hotel_room_types WHERE additional_details IS NOT NULL AND char_length(additional_details) > 500;
```

## Archivo 3 (diferido, opcional) — `supabase/migrations/<timestamp-posterior>_validate_field_sanitization_constraints.sql`

Solo cuando se confirme (vía el script de auditoría) que una constraint no tiene filas violadoras — o después de limpiarlas — se agrega su `VALIDATE CONSTRAINT` correspondiente. Las `NOT VALID` ya protegen toda escritura nueva indefinidamente, así que esto puede posponerse o aplicarse constraint por constraint, a discreción. `VALIDATE CONSTRAINT` solo toma un lock `SHARE UPDATE EXCLUSIVE` (no bloquea lecturas/escrituras).

```sql
-- Validar contra datos históricos las restricciones agregadas en
-- 20260825120000_add_field_sanitization_constraints.sql, una vez confirmado
-- (via supabase/scripts/audit_sanitization_constraints.sql) que no hay filas
-- existentes que las violen.

ALTER TABLE public.travelers VALIDATE CONSTRAINT travelers_first_name_check;
ALTER TABLE public.travelers VALIDATE CONSTRAINT travelers_last_name_check;
ALTER TABLE public.travelers VALIDATE CONSTRAINT travelers_phone_check;
ALTER TABLE public.travelers VALIDATE CONSTRAINT travelers_boarding_point_check;

ALTER TABLE public.coordinators VALIDATE CONSTRAINT coordinators_name_check;
ALTER TABLE public.coordinators VALIDATE CONSTRAINT coordinators_phone_check;
ALTER TABLE public.coordinators VALIDATE CONSTRAINT coordinators_notes_check;

ALTER TABLE public.providers VALIDATE CONSTRAINT providers_name_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_location_city_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_location_state_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_location_country_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_contact_name_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_contact_phone_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_description_check;
ALTER TABLE public.providers VALIDATE CONSTRAINT providers_contact_notes_check;

ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_operator1_name_check;
ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_operator2_name_check;
ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_operator1_phone_check;
ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_operator2_phone_check;
ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_brand_check;
ALTER TABLE public.travel_buses VALIDATE CONSTRAINT travel_buses_model_check;

ALTER TABLE public.buses VALIDATE CONSTRAINT buses_brand_check;
ALTER TABLE public.buses VALIDATE CONSTRAINT buses_model_check;

ALTER TABLE public.travels VALIDATE CONSTRAINT travels_label_check;
ALTER TABLE public.travels VALIDATE CONSTRAINT travels_destination_check;
ALTER TABLE public.travels VALIDATE CONSTRAINT travels_description_check;
ALTER TABLE public.travels VALIDATE CONSTRAINT travels_internal_notes_check;

ALTER TABLE public.travel_activities VALIDATE CONSTRAINT travel_activities_title_check;
ALTER TABLE public.travel_activities VALIDATE CONSTRAINT travel_activities_description_check;
ALTER TABLE public.travel_activities VALIDATE CONSTRAINT travel_activities_location_check;

ALTER TABLE public.travel_services VALIDATE CONSTRAINT travel_services_name_check;
ALTER TABLE public.travel_services VALIDATE CONSTRAINT travel_services_description_check;

ALTER TABLE public.quotations VALIDATE CONSTRAINT quotations_notes_check;

ALTER TABLE public.quotation_buses VALIDATE CONSTRAINT quotation_buses_unit_number_check;
ALTER TABLE public.quotation_buses VALIDATE CONSTRAINT quotation_buses_remarks_check;
ALTER TABLE public.quotation_buses VALIDATE CONSTRAINT quotation_buses_notes_check;

ALTER TABLE public.quotation_providers VALIDATE CONSTRAINT quotation_providers_service_description_check;
ALTER TABLE public.quotation_providers VALIDATE CONSTRAINT quotation_providers_remarks_check;

ALTER TABLE public.quotation_public_prices VALIDATE CONSTRAINT quotation_public_prices_price_type_check;
ALTER TABLE public.quotation_public_prices VALIDATE CONSTRAINT quotation_public_prices_description_check;
ALTER TABLE public.quotation_public_prices VALIDATE CONSTRAINT quotation_public_prices_room_type_check;
ALTER TABLE public.quotation_public_prices VALIDATE CONSTRAINT quotation_public_prices_age_group_check;
ALTER TABLE public.quotation_public_prices VALIDATE CONSTRAINT quotation_public_prices_notes_check;

ALTER TABLE public.bus_payments VALIDATE CONSTRAINT bus_payments_concept_check;
ALTER TABLE public.bus_payments VALIDATE CONSTRAINT bus_payments_notes_check;
ALTER TABLE public.provider_payments VALIDATE CONSTRAINT provider_payments_concept_check;
ALTER TABLE public.provider_payments VALIDATE CONSTRAINT provider_payments_notes_check;
ALTER TABLE public.accommodation_payments VALIDATE CONSTRAINT accommodation_payments_concept_check;
ALTER TABLE public.accommodation_payments VALIDATE CONSTRAINT accommodation_payments_notes_check;
ALTER TABLE public.payments VALIDATE CONSTRAINT payments_notes_check;

ALTER TABLE public.hotel_room_types VALIDATE CONSTRAINT hotel_room_types_additional_details_check;
```

Si la auditoría revela filas sucias solo en algunas tablas, se pueden correr únicamente las líneas `VALIDATE CONSTRAINT` de las que sí están limpias, y dejar el resto para después.

## Hallazgo colateral (fuera de alcance de esta fase, solo para que quede registrado)

`app/components/payment-form.vue` (pagos de viajero, tabla `payments`) no tiene ningún schema Zod en su campo `notes` — es un `ref<string>` sin límite de longitud en el front, a diferencia de sus tablas hermanas (`bus_payments`, `provider_payments`, `accommodation_payments`, que sí usan `textSchema({max:500})`). Se le agrega el mismo `CHECK <= 500` en la DB por consistencia, pero si se quiere cerrar el hueco en el frontend también, es un cambio de una línea (agregar `notes: textSchema({ max: 500 })` + el proxy `useSanitizedModel` correspondiente, mismo patrón que el resto de los pago-\*-form.vue).

## Pasos de implementación y verificación (a correr por el usuario, no por Claude)

1. Crear los archivos 1 y 2 de arriba en las rutas indicadas (`supabase/migrations/...` y `supabase/scripts/...`).
2. `bun run db:reset` (o `supabase db reset`) — aplica la migración en local.
3. Correr `supabase/scripts/audit_sanitization_constraints.sql` en Studio/psql y revisar cada bloque.
4. Para cualquier fila violadora: decidir si se limpia el dato o se deja esa constraint específica sin validar por ahora.
5. Prueba manual de rechazo/aceptación, ej.:
   ```sql
   insert into public.coordinators (name, age, phone, email)
   values ('Ana3', 30, '5512345678', 'ana@test.com');
   -- esperado: ERROR, viola "coordinators_name_check"
   ```
   y repetir con `'Ana'` (debe insertar bien).
6. Cuando se quiera, aplicar la migración de seguimiento (archivo 3) con los `VALIDATE CONSTRAINT` ya confirmados limpios.
7. `bun run db:types` — el diff en `app/types/database.types.ts` debe salir vacío (los `CHECK` no cambian el tipo generado; es el resultado esperado, no una señal de error).
8. `supabase db advisors` (o MCP `get_advisors`) como pase final de seguridad/lint.
9. Solo al final, y por decisión propia, `bun run db:push` para subirlo al proyecto remoto — correr y compartir el resultado, igual que con typecheck/lint.
