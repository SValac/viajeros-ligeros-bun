CREATE OR REPLACE FUNCTION public.generate_travel_access_code(p_travel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_travel public.travels%ROWTYPE;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea;
  i integer;
  v_row public.travel_access_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_travel from public.travels WHERE id = p_travel_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'travel_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_travel.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_travel.status NOT IN ('published', 'in_progress') THEN
    RAISE EXCEPTION 'travel_not_eligible' USING ERRCODE = 'P0001';
  END IF;

  v_bytes := extensions.gen_random_bytes(6);
  FOR i IN 0..5 LOOP
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  END LOOP;

  UPDATE public.travel_access_codes
  SET revoked_at = now()
  WHERE travel_id = p_travel_id AND revoked_at IS NULL;

  INSERT INTO public.travel_access_codes (travel_id, code_hash, expires_at, created_by)
  VALUES (
    p_travel_id,
    extensions.crypt(v_code, extensions.gen_salt('bf', 8)),
    (v_travel.end_date + INTERVAL '1 day'),
    auth.uid()
  )

  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'travelId', v_row.travel_id,
    'code', v_code,
    'expiresAt', v_row.expires_at,
    'createdAt', v_row.created_at,
    'createdBy', v_row.created_by 
  );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'code_generation_conflict' USING ERRCODE = 'P0001';
  END;
  $$;

  REVOKE EXECUTE ON FUNCTION public.generate_travel_access_code(uuid) FROM public;
  GRANT EXECUTE ON FUNCTION public.generate_travel_access_code(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.generate_travel_access_code(uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.revoke_travel_access_code(p_travel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_travel public.travels%ROWTYPE;
  v_row public.travel_access_codes%ROWTYPE;
BEGIN
  SELECT * into v_travel FROM public.travels WHERE id = p_travel_id;
  If NOT FOUND THEN
    RAISE EXCEPTION 'travel_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_travel.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.travel_access_codes
  SET revoked_at = now()
  WHERE travel_id = p_travel_id AND revoked_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_code' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
      'travelId', p_travel_id,
      'revokedAt', v_row.revoked_at
    );

END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_travel_access_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_travel_access_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_travel_access_code(uuid) TO service_role;



CREATE OR REPLACE FUNCTION public.redeem_travel_access(p_phone text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone_normalized text;
  v_code_normalized text;
  v_failed_count integer;
  v_traveler public.travelers%ROWTYPE;
  v_access_code public.travel_access_codes%ROWTYPE;
  v_travel public.travels%ROWTYPE;
  v_matched_travel_id uuid;
  v_any_traveler boolean := false;
  v_error text := null;
BEGIN
  v_phone_normalized := public.normalize_phone_last10(p_phone);
  v_code_normalized := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  IF length(v_phone_normalized) <> 10 THEN
    v_error := 'invalid_phone';
  ELSIF length(v_code_normalized) <> 6 THEN
    v_error := 'invalid_code';
  ELSE
    SELECT count(*) INTO v_failed_count
    FROM public.travel_access_attempts
    WHERE phone_normalized = v_phone_normalized
      AND success = false
      AND created_at > now() - INTERVAL '15 minutes';

    IF v_failed_count >= 10 THEN
      v_error := 'too_many_attempts';
    ELSE
      FOR v_traveler IN
        SELECT * FROM public.travelers
        WHERE public.normalize_phone_last10(phone) = v_phone_normalized
      LOOP
        v_any_traveler := true;

        SELECT * INTO v_access_code
        FROM public.travel_access_codes
        WHERE travel_id = v_traveler.travel_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND AND extensions.crypt(v_code_normalized, v_access_code.code_hash) = v_access_code.code_hash THEN
          v_matched_travel_id := v_traveler.travel_id;
          EXIT;
        END IF;
      END LOOP;

      IF v_matched_travel_id IS NULL THEN
        v_error := CASE WHEN NOT v_any_traveler THEN 'phone_not_registered' ELSE 'invalid_code' END;
      ELSE
        SELECT * INTO v_travel FROM public.travels WHERE id = v_matched_travel_id;

        IF v_access_code.revoked_at IS NOT NULL THEN
          v_error := 'code_revoked';
        ELSIF v_access_code.expires_at <= now() THEN
          v_error := 'code_expired';
        ELSIF v_travel.status NOT IN ('published', 'in_progress') THEN
          v_error := 'travel_not_eligible';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.travel_access_attempts (phone_normalized, travel_id, success)
  VALUES (v_phone_normalized, v_matched_travel_id, v_error IS NULL);

  IF v_error IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', v_error);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'travel', jsonb_build_object(
      'id', v_travel.id,
      'label', v_travel.label,
      'destination', v_travel.destination,
      'startDate', v_travel.start_date,
      'endDate', v_travel.end_date,
      'description', v_travel.description,
      'imageUrl', v_travel.image_url,
      'status', v_travel.status
    ),
    'traveler', jsonb_build_object(
      'id', v_traveler.id,
      'firstName', v_traveler.first_name,
      'lastName', v_traveler.last_name,
      'seat', v_traveler.seat,
      'boardingPoint', v_traveler.boarding_point,
      'isRepresentative', v_traveler.is_representative
    ),
    'bus', (
      SELECT jsonb_build_object('id', tb.id, 'model', tb.model, 'brand', tb.brand, 'seatCount', tb.seat_count)
      FROM public.travel_buses tb
      WHERE tb.id = v_traveler.travel_bus_id
    ),
    'activities', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ta.id, 'day', ta.day, 'title', ta.title, 'description', ta.description,
        'time', ta.time, 'location', ta.location, 'mapLocation', ta.map_location
      ) order by ta.day)
      FROM public.travel_activities ta
      WHERE ta.travel_id = v_matched_travel_id
    ), '[]'::jsonb),
    'services', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ts.id, 'name', ts.name, 'description', ts.description, 'included', ts.included
      ))
      FROM public.travel_services ts
      WHERE ts.travel_id = v_matched_travel_id
    ), '[]'::jsonb),
    'media', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tm.id, 'publicUrl', tm.public_url, 'mediaType', tm.media_type, 'caption', tm.caption
      ) order by tm.display_order)
      FROM public.travel_media tm
      WHERE tm.travel_id = v_matched_travel_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_travel_access(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_travel_access(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.redeem_travel_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_travel_access(text, text) TO service_role;