create unique index travelers_unique_travel_bus_seat
on public.travelers using btree (travel_bus_id, seat)
where travel_bus_id is not null;
