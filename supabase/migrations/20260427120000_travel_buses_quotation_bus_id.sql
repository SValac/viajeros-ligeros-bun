alter table "public"."travel_buses"
  add column "quotation_bus_id" uuid
  references public.quotation_buses(id) on delete cascade;

create index travel_buses_quotation_bus_id_idx
  on public.travel_buses using btree (quotation_bus_id);
