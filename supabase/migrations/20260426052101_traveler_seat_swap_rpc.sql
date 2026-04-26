create or replace function public.move_or_swap_traveler_seat(
  p_traveler_id uuid,
  p_target_seat integer,
  p_travel_bus_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_source public.travelers%rowtype;
  v_target public.travelers%rowtype;
  v_temp_seat integer;
begin
  if p_travel_bus_id is null then
    raise exception 'invalid_travel_bus' using errcode = 'P0001';
  end if;

  if p_target_seat is null or p_target_seat <= 0 then
    raise exception 'invalid_target_seat' using errcode = 'P0001';
  end if;

  select *
  into v_source
  from public.travelers t
  where t.id = p_traveler_id
    and t.travel_bus_id = p_travel_bus_id
  for update;

  if not found then
    raise exception 'traveler_not_found' using errcode = 'P0001';
  end if;

  if v_source.seat = p_target_seat then
    raise exception 'same_seat_selected' using errcode = 'P0001';
  end if;

  perform 1
  from public.travelers t
  where t.travel_bus_id = p_travel_bus_id
    and (t.id = v_source.id or t.seat = p_target_seat)
  order by t.id
  for update;

  select *
  into v_target
  from public.travelers t
  where t.travel_bus_id = p_travel_bus_id
    and t.seat = p_target_seat;

  if not found then
    update public.travelers
    set seat = p_target_seat
    where id = v_source.id;

    return jsonb_build_object(
      'operation', 'moved',
      'travelId', v_source.travel_id,
      'sourceTravelerId', v_source.id,
      'targetTravelerId', null,
      'sourceSeat', p_target_seat,
      'targetSeat', p_target_seat,
      'travelers', jsonb_build_array(
        jsonb_build_object(
          'id', v_source.id,
          'seat', p_target_seat
        )
      )
    );
  end if;

  select coalesce(max(t.seat), 0) + 1
  into v_temp_seat
  from public.travelers t
  where t.travel_bus_id = p_travel_bus_id;

  update public.travelers
  set seat = v_temp_seat
  where id = v_source.id;

  update public.travelers
  set seat = v_source.seat
  where id = v_target.id;

  update public.travelers
  set seat = p_target_seat
  where id = v_source.id;

  return jsonb_build_object(
    'operation', 'swapped',
    'travelId', v_source.travel_id,
    'sourceTravelerId', v_source.id,
    'targetTravelerId', v_target.id,
    'sourceSeat', p_target_seat,
    'targetSeat', v_source.seat,
    'travelers', jsonb_build_array(
      jsonb_build_object(
        'id', v_source.id,
        'seat', p_target_seat
      ),
      jsonb_build_object(
        'id', v_target.id,
        'seat', v_source.seat
      )
    )
  );
exception
  when unique_violation then
    raise exception 'seat_conflict' using errcode = 'P0001';
end;
$$;

grant execute on function public.move_or_swap_traveler_seat(uuid, integer, uuid) to anon;
grant execute on function public.move_or_swap_traveler_seat(uuid, integer, uuid) to authenticated;
grant execute on function public.move_or_swap_traveler_seat(uuid, integer, uuid) to service_role;
