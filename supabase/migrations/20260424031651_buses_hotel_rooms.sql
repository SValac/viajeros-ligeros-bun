
  create table "public"."buses" (
    "id" uuid not null default gen_random_uuid(),
    "provider_id" uuid not null,
    "model" text,
    "brand" text,
    "year" integer,
    "seat_count" integer not null,
    "rental_price" numeric not null,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."buses" enable row level security;


  create table "public"."hotel_room_types" (
    "id" uuid not null default gen_random_uuid(),
    "hotel_room_id" uuid not null,
    "max_occupancy" integer not null,
    "room_count" integer not null,
    "beds" jsonb not null default '[]'::jsonb,
    "price_per_night" numeric not null,
    "cost_per_person" numeric not null,
    "additional_details" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."hotel_room_types" enable row level security;


  create table "public"."hotel_rooms" (
    "id" uuid not null default gen_random_uuid(),
    "provider_id" uuid not null,
    "total_rooms" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."hotel_rooms" enable row level security;

CREATE INDEX buses_active_idx ON public.buses USING btree (active);

CREATE UNIQUE INDEX buses_pkey ON public.buses USING btree (id);

CREATE INDEX buses_provider_id_idx ON public.buses USING btree (provider_id);

CREATE INDEX hotel_room_types_hotel_room_id_idx ON public.hotel_room_types USING btree (hotel_room_id);

CREATE UNIQUE INDEX hotel_room_types_pkey ON public.hotel_room_types USING btree (id);

CREATE UNIQUE INDEX hotel_rooms_pkey ON public.hotel_rooms USING btree (id);

CREATE INDEX hotel_rooms_provider_id_idx ON public.hotel_rooms USING btree (provider_id);

alter table "public"."buses" add constraint "buses_pkey" PRIMARY KEY using index "buses_pkey";

alter table "public"."hotel_room_types" add constraint "hotel_room_types_pkey" PRIMARY KEY using index "hotel_room_types_pkey";

alter table "public"."hotel_rooms" add constraint "hotel_rooms_pkey" PRIMARY KEY using index "hotel_rooms_pkey";

alter table "public"."buses" add constraint "buses_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE not valid;

alter table "public"."buses" validate constraint "buses_provider_id_fkey";

alter table "public"."hotel_room_types" add constraint "hotel_room_types_hotel_room_id_fkey" FOREIGN KEY (hotel_room_id) REFERENCES public.hotel_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."hotel_room_types" validate constraint "hotel_room_types_hotel_room_id_fkey";

alter table "public"."hotel_rooms" add constraint "hotel_rooms_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE not valid;

alter table "public"."hotel_rooms" validate constraint "hotel_rooms_provider_id_fkey";

grant delete on table "public"."buses" to "anon";

grant insert on table "public"."buses" to "anon";

grant references on table "public"."buses" to "anon";

grant select on table "public"."buses" to "anon";

grant trigger on table "public"."buses" to "anon";

grant truncate on table "public"."buses" to "anon";

grant update on table "public"."buses" to "anon";

grant delete on table "public"."buses" to "authenticated";

grant insert on table "public"."buses" to "authenticated";

grant references on table "public"."buses" to "authenticated";

grant select on table "public"."buses" to "authenticated";

grant trigger on table "public"."buses" to "authenticated";

grant truncate on table "public"."buses" to "authenticated";

grant update on table "public"."buses" to "authenticated";

grant delete on table "public"."buses" to "service_role";

grant insert on table "public"."buses" to "service_role";

grant references on table "public"."buses" to "service_role";

grant select on table "public"."buses" to "service_role";

grant trigger on table "public"."buses" to "service_role";

grant truncate on table "public"."buses" to "service_role";

grant update on table "public"."buses" to "service_role";

grant delete on table "public"."hotel_room_types" to "anon";

grant insert on table "public"."hotel_room_types" to "anon";

grant references on table "public"."hotel_room_types" to "anon";

grant select on table "public"."hotel_room_types" to "anon";

grant trigger on table "public"."hotel_room_types" to "anon";

grant truncate on table "public"."hotel_room_types" to "anon";

grant update on table "public"."hotel_room_types" to "anon";

grant delete on table "public"."hotel_room_types" to "authenticated";

grant insert on table "public"."hotel_room_types" to "authenticated";

grant references on table "public"."hotel_room_types" to "authenticated";

grant select on table "public"."hotel_room_types" to "authenticated";

grant trigger on table "public"."hotel_room_types" to "authenticated";

grant truncate on table "public"."hotel_room_types" to "authenticated";

grant update on table "public"."hotel_room_types" to "authenticated";

grant delete on table "public"."hotel_room_types" to "service_role";

grant insert on table "public"."hotel_room_types" to "service_role";

grant references on table "public"."hotel_room_types" to "service_role";

grant select on table "public"."hotel_room_types" to "service_role";

grant trigger on table "public"."hotel_room_types" to "service_role";

grant truncate on table "public"."hotel_room_types" to "service_role";

grant update on table "public"."hotel_room_types" to "service_role";

grant delete on table "public"."hotel_rooms" to "anon";

grant insert on table "public"."hotel_rooms" to "anon";

grant references on table "public"."hotel_rooms" to "anon";

grant select on table "public"."hotel_rooms" to "anon";

grant trigger on table "public"."hotel_rooms" to "anon";

grant truncate on table "public"."hotel_rooms" to "anon";

grant update on table "public"."hotel_rooms" to "anon";

grant delete on table "public"."hotel_rooms" to "authenticated";

grant insert on table "public"."hotel_rooms" to "authenticated";

grant references on table "public"."hotel_rooms" to "authenticated";

grant select on table "public"."hotel_rooms" to "authenticated";

grant trigger on table "public"."hotel_rooms" to "authenticated";

grant truncate on table "public"."hotel_rooms" to "authenticated";

grant update on table "public"."hotel_rooms" to "authenticated";

grant delete on table "public"."hotel_rooms" to "service_role";

grant insert on table "public"."hotel_rooms" to "service_role";

grant references on table "public"."hotel_rooms" to "service_role";

grant select on table "public"."hotel_rooms" to "service_role";

grant trigger on table "public"."hotel_rooms" to "service_role";

grant truncate on table "public"."hotel_rooms" to "service_role";

grant update on table "public"."hotel_rooms" to "service_role";


  create policy "buses_allow_all"
  on "public"."buses"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "hotel_room_types_allow_all"
  on "public"."hotel_room_types"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "hotel_rooms_allow_all"
  on "public"."hotel_rooms"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER buses_updated_at BEFORE UPDATE ON public.buses FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER hotel_room_types_updated_at BEFORE UPDATE ON public.hotel_room_types FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER hotel_rooms_updated_at BEFORE UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


