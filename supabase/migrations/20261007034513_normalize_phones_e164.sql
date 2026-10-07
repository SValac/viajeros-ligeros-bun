-- Normaliza a E.164 (+523121273023) los teléfonos guardados en otros formatos.
-- La app ya guarda E.164 con <PhoneInput>; esto convierte los registros viejos.
--
-- Solo cambia lo que se reconoce sin ambigüedad como número de México:
--   10 dígitos sin `+` (312-127-3023, (312) 127 3023)  -> +52 + 10 dígitos
--   52 + 10 dígitos (con o sin `+`, con espacios)        -> +52 + 10 dígitos
--   52 1 + 10 dígitos (prefijo móvil de antes de 2019)   -> +52 + 10 dígitos
-- Todo lo demás (otro país, dígitos de más o de menos) se queda igual.
-- Reversible: quitar el `+52` devuelve los 10 dígitos. No borra ni cambia columnas.
--
-- El acceso de viajeros (normalize_phone_last10) compara los últimos 10 dígitos,
-- así que no se ve afectado.

CREATE FUNCTION pg_temp.to_e164_mx(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL THEN NULL
    WHEN d ~ '^\d{10}$' AND p_phone !~ '^\s*\+' THEN '+52' || d
    WHEN d ~ '^52\d{10}$' THEN '+' || d
    WHEN d ~ '^521\d{10}$' THEN '+52' || right(d, 10)
    ELSE p_phone
  END
  FROM (SELECT regexp_replace(p_phone, '\D', '', 'g') AS d) AS digits;
$$;

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Coordinadores primero: el trigger coordinators_sync_travelers copia el teléfono
  -- a sus filas de travelers (kind = 'coordinator').
  UPDATE public.coordinators
  SET phone = pg_temp.to_e164_mx(phone)
  WHERE pg_temp.to_e164_mx(phone) IS DISTINCT FROM phone;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'coordinators.phone: % normalizados', v_count;

  UPDATE public.travelers
  SET phone = pg_temp.to_e164_mx(phone)
  WHERE pg_temp.to_e164_mx(phone) IS DISTINCT FROM phone;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'travelers.phone: % normalizados', v_count;

  UPDATE public.providers
  SET contact_phone = pg_temp.to_e164_mx(contact_phone)
  WHERE pg_temp.to_e164_mx(contact_phone) IS DISTINCT FROM contact_phone;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'providers.contact_phone: % normalizados', v_count;

  UPDATE public.agency_profiles
  SET phone = pg_temp.to_e164_mx(phone)
  WHERE pg_temp.to_e164_mx(phone) IS DISTINCT FROM phone;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'agency_profiles.phone: % normalizados', v_count;

  UPDATE public.travel_buses
  SET operator1_phone = pg_temp.to_e164_mx(operator1_phone),
      operator2_phone = pg_temp.to_e164_mx(operator2_phone)
  WHERE pg_temp.to_e164_mx(operator1_phone) IS DISTINCT FROM operator1_phone
     OR pg_temp.to_e164_mx(operator2_phone) IS DISTINCT FROM operator2_phone;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'travel_buses.operator*_phone: % normalizados', v_count;
END;
$$;
