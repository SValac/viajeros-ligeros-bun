
  create table "public"."bus_payments" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_bus_id" uuid not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "payment_type" public.payment_type not null,
    "concept" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."bus_payments" enable row level security;


  create table "public"."provider_payments" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_provider_id" uuid not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "payment_type" public.payment_type not null,
    "concept" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."provider_payments" enable row level security;


  create table "public"."quotation_accommodation_details" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_accommodation_id" uuid not null,
    "hotel_room_type_id" uuid not null,
    "quantity" integer not null,
    "price_per_night" numeric not null,
    "max_occupancy" integer not null
      );


alter table "public"."quotation_accommodation_details" enable row level security;


  create table "public"."quotation_accommodations" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_id" uuid not null,
    "provider_id" uuid not null,
    "night_count" integer not null,
    "total_cost" numeric not null,
    "payment_method" public.payment_type not null,
    "confirmed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quotation_accommodations" enable row level security;


  create table "public"."quotation_buses" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_id" uuid not null,
    "provider_id" uuid not null,
    "unit_number" text not null,
    "capacity" integer not null,
    "status" public.quotation_bus_status not null default 'pending'::public.quotation_bus_status,
    "total_cost" numeric not null,
    "split_type" public.cost_split_type not null,
    "payment_method" public.payment_type not null,
    "remarks" text,
    "confirmed" boolean not null default false,
    "notes" text,
    "coordinator_ids" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quotation_buses" enable row level security;


  create table "public"."quotation_providers" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_id" uuid not null,
    "provider_id" uuid not null,
    "service_description" text not null,
    "remarks" text,
    "total_cost" numeric not null,
    "payment_method" public.payment_type not null,
    "split_type" public.cost_split_type not null,
    "confirmed" boolean not null default false
      );


alter table "public"."quotation_providers" enable row level security;


  create table "public"."quotation_public_prices" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_id" uuid not null,
    "price_type" text not null,
    "description" text not null,
    "price_per_person" numeric not null,
    "room_type" text,
    "age_group" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quotation_public_prices" enable row level security;


  create table "public"."quotations" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "bus_capacity" integer not null,
    "minimum_seat_target" integer not null,
    "seat_price" numeric not null,
    "status" public.quotation_status not null default 'draft'::public.quotation_status,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."quotations" enable row level security;

CREATE UNIQUE INDEX bus_payments_pkey ON public.bus_payments USING btree (id);

CREATE INDEX bus_payments_quotation_bus_id_idx ON public.bus_payments USING btree (quotation_bus_id);

CREATE UNIQUE INDEX provider_payments_pkey ON public.provider_payments USING btree (id);

CREATE INDEX provider_payments_quotation_provider_id_idx ON public.provider_payments USING btree (quotation_provider_id);

CREATE INDEX quotation_accommodation_details_accommodation_id_idx ON public.quotation_accommodation_details USING btree (quotation_accommodation_id);

CREATE UNIQUE INDEX quotation_accommodation_details_pkey ON public.quotation_accommodation_details USING btree (id);

CREATE INDEX quotation_accommodation_details_room_type_id_idx ON public.quotation_accommodation_details USING btree (hotel_room_type_id);

CREATE UNIQUE INDEX quotation_accommodations_pkey ON public.quotation_accommodations USING btree (id);

CREATE INDEX quotation_accommodations_provider_id_idx ON public.quotation_accommodations USING btree (provider_id);

CREATE INDEX quotation_accommodations_quotation_id_idx ON public.quotation_accommodations USING btree (quotation_id);

CREATE UNIQUE INDEX quotation_buses_pkey ON public.quotation_buses USING btree (id);

CREATE INDEX quotation_buses_provider_id_idx ON public.quotation_buses USING btree (provider_id);

CREATE INDEX quotation_buses_quotation_id_idx ON public.quotation_buses USING btree (quotation_id);

CREATE UNIQUE INDEX quotation_providers_pkey ON public.quotation_providers USING btree (id);

CREATE INDEX quotation_providers_provider_id_idx ON public.quotation_providers USING btree (provider_id);

CREATE INDEX quotation_providers_quotation_id_idx ON public.quotation_providers USING btree (quotation_id);

CREATE UNIQUE INDEX quotation_public_prices_pkey ON public.quotation_public_prices USING btree (id);

CREATE INDEX quotation_public_prices_quotation_id_idx ON public.quotation_public_prices USING btree (quotation_id);

CREATE UNIQUE INDEX quotations_pkey ON public.quotations USING btree (id);

CREATE INDEX quotations_travel_id_idx ON public.quotations USING btree (travel_id);

alter table "public"."bus_payments" add constraint "bus_payments_pkey" PRIMARY KEY using index "bus_payments_pkey";

alter table "public"."provider_payments" add constraint "provider_payments_pkey" PRIMARY KEY using index "provider_payments_pkey";

alter table "public"."quotation_accommodation_details" add constraint "quotation_accommodation_details_pkey" PRIMARY KEY using index "quotation_accommodation_details_pkey";

alter table "public"."quotation_accommodations" add constraint "quotation_accommodations_pkey" PRIMARY KEY using index "quotation_accommodations_pkey";

alter table "public"."quotation_buses" add constraint "quotation_buses_pkey" PRIMARY KEY using index "quotation_buses_pkey";

alter table "public"."quotation_providers" add constraint "quotation_providers_pkey" PRIMARY KEY using index "quotation_providers_pkey";

alter table "public"."quotation_public_prices" add constraint "quotation_public_prices_pkey" PRIMARY KEY using index "quotation_public_prices_pkey";

alter table "public"."quotations" add constraint "quotations_pkey" PRIMARY KEY using index "quotations_pkey";

alter table "public"."bus_payments" add constraint "bus_payments_quotation_bus_id_fkey" FOREIGN KEY (quotation_bus_id) REFERENCES public.quotation_buses(id) ON DELETE CASCADE not valid;

alter table "public"."bus_payments" validate constraint "bus_payments_quotation_bus_id_fkey";

alter table "public"."provider_payments" add constraint "provider_payments_quotation_provider_id_fkey" FOREIGN KEY (quotation_provider_id) REFERENCES public.quotation_providers(id) ON DELETE CASCADE not valid;

alter table "public"."provider_payments" validate constraint "provider_payments_quotation_provider_id_fkey";

alter table "public"."quotation_accommodation_details" add constraint "quotation_accommodation_details_hotel_room_type_id_fkey" FOREIGN KEY (hotel_room_type_id) REFERENCES public.hotel_room_types(id) ON DELETE RESTRICT not valid;

alter table "public"."quotation_accommodation_details" validate constraint "quotation_accommodation_details_hotel_room_type_id_fkey";

alter table "public"."quotation_accommodation_details" add constraint "quotation_accommodation_details_quotation_accommodation_id_fkey" FOREIGN KEY (quotation_accommodation_id) REFERENCES public.quotation_accommodations(id) ON DELETE CASCADE not valid;

alter table "public"."quotation_accommodation_details" validate constraint "quotation_accommodation_details_quotation_accommodation_id_fkey";

alter table "public"."quotation_accommodations" add constraint "quotation_accommodations_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT not valid;

alter table "public"."quotation_accommodations" validate constraint "quotation_accommodations_provider_id_fkey";

alter table "public"."quotation_accommodations" add constraint "quotation_accommodations_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE not valid;

alter table "public"."quotation_accommodations" validate constraint "quotation_accommodations_quotation_id_fkey";

alter table "public"."quotation_buses" add constraint "quotation_buses_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT not valid;

alter table "public"."quotation_buses" validate constraint "quotation_buses_provider_id_fkey";

alter table "public"."quotation_buses" add constraint "quotation_buses_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE not valid;

alter table "public"."quotation_buses" validate constraint "quotation_buses_quotation_id_fkey";

alter table "public"."quotation_providers" add constraint "quotation_providers_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT not valid;

alter table "public"."quotation_providers" validate constraint "quotation_providers_provider_id_fkey";

alter table "public"."quotation_providers" add constraint "quotation_providers_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE not valid;

alter table "public"."quotation_providers" validate constraint "quotation_providers_quotation_id_fkey";

alter table "public"."quotation_public_prices" add constraint "quotation_public_prices_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE not valid;

alter table "public"."quotation_public_prices" validate constraint "quotation_public_prices_quotation_id_fkey";

alter table "public"."quotations" add constraint "quotations_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."quotations" validate constraint "quotations_travel_id_fkey";

alter table "public"."traveler_account_configs" add constraint "traveler_account_configs_public_price_fkey" FOREIGN KEY (public_price_id) REFERENCES public.quotation_public_prices(id) ON DELETE SET NULL not valid;

alter table "public"."traveler_account_configs" validate constraint "traveler_account_configs_public_price_fkey";

grant delete on table "public"."bus_payments" to "anon";

grant insert on table "public"."bus_payments" to "anon";

grant references on table "public"."bus_payments" to "anon";

grant select on table "public"."bus_payments" to "anon";

grant trigger on table "public"."bus_payments" to "anon";

grant truncate on table "public"."bus_payments" to "anon";

grant update on table "public"."bus_payments" to "anon";

grant delete on table "public"."bus_payments" to "authenticated";

grant insert on table "public"."bus_payments" to "authenticated";

grant references on table "public"."bus_payments" to "authenticated";

grant select on table "public"."bus_payments" to "authenticated";

grant trigger on table "public"."bus_payments" to "authenticated";

grant truncate on table "public"."bus_payments" to "authenticated";

grant update on table "public"."bus_payments" to "authenticated";

grant delete on table "public"."bus_payments" to "service_role";

grant insert on table "public"."bus_payments" to "service_role";

grant references on table "public"."bus_payments" to "service_role";

grant select on table "public"."bus_payments" to "service_role";

grant trigger on table "public"."bus_payments" to "service_role";

grant truncate on table "public"."bus_payments" to "service_role";

grant update on table "public"."bus_payments" to "service_role";

grant delete on table "public"."provider_payments" to "anon";

grant insert on table "public"."provider_payments" to "anon";

grant references on table "public"."provider_payments" to "anon";

grant select on table "public"."provider_payments" to "anon";

grant trigger on table "public"."provider_payments" to "anon";

grant truncate on table "public"."provider_payments" to "anon";

grant update on table "public"."provider_payments" to "anon";

grant delete on table "public"."provider_payments" to "authenticated";

grant insert on table "public"."provider_payments" to "authenticated";

grant references on table "public"."provider_payments" to "authenticated";

grant select on table "public"."provider_payments" to "authenticated";

grant trigger on table "public"."provider_payments" to "authenticated";

grant truncate on table "public"."provider_payments" to "authenticated";

grant update on table "public"."provider_payments" to "authenticated";

grant delete on table "public"."provider_payments" to "service_role";

grant insert on table "public"."provider_payments" to "service_role";

grant references on table "public"."provider_payments" to "service_role";

grant select on table "public"."provider_payments" to "service_role";

grant trigger on table "public"."provider_payments" to "service_role";

grant truncate on table "public"."provider_payments" to "service_role";

grant update on table "public"."provider_payments" to "service_role";

grant delete on table "public"."quotation_accommodation_details" to "anon";

grant insert on table "public"."quotation_accommodation_details" to "anon";

grant references on table "public"."quotation_accommodation_details" to "anon";

grant select on table "public"."quotation_accommodation_details" to "anon";

grant trigger on table "public"."quotation_accommodation_details" to "anon";

grant truncate on table "public"."quotation_accommodation_details" to "anon";

grant update on table "public"."quotation_accommodation_details" to "anon";

grant delete on table "public"."quotation_accommodation_details" to "authenticated";

grant insert on table "public"."quotation_accommodation_details" to "authenticated";

grant references on table "public"."quotation_accommodation_details" to "authenticated";

grant select on table "public"."quotation_accommodation_details" to "authenticated";

grant trigger on table "public"."quotation_accommodation_details" to "authenticated";

grant truncate on table "public"."quotation_accommodation_details" to "authenticated";

grant update on table "public"."quotation_accommodation_details" to "authenticated";

grant delete on table "public"."quotation_accommodation_details" to "service_role";

grant insert on table "public"."quotation_accommodation_details" to "service_role";

grant references on table "public"."quotation_accommodation_details" to "service_role";

grant select on table "public"."quotation_accommodation_details" to "service_role";

grant trigger on table "public"."quotation_accommodation_details" to "service_role";

grant truncate on table "public"."quotation_accommodation_details" to "service_role";

grant update on table "public"."quotation_accommodation_details" to "service_role";

grant delete on table "public"."quotation_accommodations" to "anon";

grant insert on table "public"."quotation_accommodations" to "anon";

grant references on table "public"."quotation_accommodations" to "anon";

grant select on table "public"."quotation_accommodations" to "anon";

grant trigger on table "public"."quotation_accommodations" to "anon";

grant truncate on table "public"."quotation_accommodations" to "anon";

grant update on table "public"."quotation_accommodations" to "anon";

grant delete on table "public"."quotation_accommodations" to "authenticated";

grant insert on table "public"."quotation_accommodations" to "authenticated";

grant references on table "public"."quotation_accommodations" to "authenticated";

grant select on table "public"."quotation_accommodations" to "authenticated";

grant trigger on table "public"."quotation_accommodations" to "authenticated";

grant truncate on table "public"."quotation_accommodations" to "authenticated";

grant update on table "public"."quotation_accommodations" to "authenticated";

grant delete on table "public"."quotation_accommodations" to "service_role";

grant insert on table "public"."quotation_accommodations" to "service_role";

grant references on table "public"."quotation_accommodations" to "service_role";

grant select on table "public"."quotation_accommodations" to "service_role";

grant trigger on table "public"."quotation_accommodations" to "service_role";

grant truncate on table "public"."quotation_accommodations" to "service_role";

grant update on table "public"."quotation_accommodations" to "service_role";

grant delete on table "public"."quotation_buses" to "anon";

grant insert on table "public"."quotation_buses" to "anon";

grant references on table "public"."quotation_buses" to "anon";

grant select on table "public"."quotation_buses" to "anon";

grant trigger on table "public"."quotation_buses" to "anon";

grant truncate on table "public"."quotation_buses" to "anon";

grant update on table "public"."quotation_buses" to "anon";

grant delete on table "public"."quotation_buses" to "authenticated";

grant insert on table "public"."quotation_buses" to "authenticated";

grant references on table "public"."quotation_buses" to "authenticated";

grant select on table "public"."quotation_buses" to "authenticated";

grant trigger on table "public"."quotation_buses" to "authenticated";

grant truncate on table "public"."quotation_buses" to "authenticated";

grant update on table "public"."quotation_buses" to "authenticated";

grant delete on table "public"."quotation_buses" to "service_role";

grant insert on table "public"."quotation_buses" to "service_role";

grant references on table "public"."quotation_buses" to "service_role";

grant select on table "public"."quotation_buses" to "service_role";

grant trigger on table "public"."quotation_buses" to "service_role";

grant truncate on table "public"."quotation_buses" to "service_role";

grant update on table "public"."quotation_buses" to "service_role";

grant delete on table "public"."quotation_providers" to "anon";

grant insert on table "public"."quotation_providers" to "anon";

grant references on table "public"."quotation_providers" to "anon";

grant select on table "public"."quotation_providers" to "anon";

grant trigger on table "public"."quotation_providers" to "anon";

grant truncate on table "public"."quotation_providers" to "anon";

grant update on table "public"."quotation_providers" to "anon";

grant delete on table "public"."quotation_providers" to "authenticated";

grant insert on table "public"."quotation_providers" to "authenticated";

grant references on table "public"."quotation_providers" to "authenticated";

grant select on table "public"."quotation_providers" to "authenticated";

grant trigger on table "public"."quotation_providers" to "authenticated";

grant truncate on table "public"."quotation_providers" to "authenticated";

grant update on table "public"."quotation_providers" to "authenticated";

grant delete on table "public"."quotation_providers" to "service_role";

grant insert on table "public"."quotation_providers" to "service_role";

grant references on table "public"."quotation_providers" to "service_role";

grant select on table "public"."quotation_providers" to "service_role";

grant trigger on table "public"."quotation_providers" to "service_role";

grant truncate on table "public"."quotation_providers" to "service_role";

grant update on table "public"."quotation_providers" to "service_role";

grant delete on table "public"."quotation_public_prices" to "anon";

grant insert on table "public"."quotation_public_prices" to "anon";

grant references on table "public"."quotation_public_prices" to "anon";

grant select on table "public"."quotation_public_prices" to "anon";

grant trigger on table "public"."quotation_public_prices" to "anon";

grant truncate on table "public"."quotation_public_prices" to "anon";

grant update on table "public"."quotation_public_prices" to "anon";

grant delete on table "public"."quotation_public_prices" to "authenticated";

grant insert on table "public"."quotation_public_prices" to "authenticated";

grant references on table "public"."quotation_public_prices" to "authenticated";

grant select on table "public"."quotation_public_prices" to "authenticated";

grant trigger on table "public"."quotation_public_prices" to "authenticated";

grant truncate on table "public"."quotation_public_prices" to "authenticated";

grant update on table "public"."quotation_public_prices" to "authenticated";

grant delete on table "public"."quotation_public_prices" to "service_role";

grant insert on table "public"."quotation_public_prices" to "service_role";

grant references on table "public"."quotation_public_prices" to "service_role";

grant select on table "public"."quotation_public_prices" to "service_role";

grant trigger on table "public"."quotation_public_prices" to "service_role";

grant truncate on table "public"."quotation_public_prices" to "service_role";

grant update on table "public"."quotation_public_prices" to "service_role";

grant delete on table "public"."quotations" to "anon";

grant insert on table "public"."quotations" to "anon";

grant references on table "public"."quotations" to "anon";

grant select on table "public"."quotations" to "anon";

grant trigger on table "public"."quotations" to "anon";

grant truncate on table "public"."quotations" to "anon";

grant update on table "public"."quotations" to "anon";

grant delete on table "public"."quotations" to "authenticated";

grant insert on table "public"."quotations" to "authenticated";

grant references on table "public"."quotations" to "authenticated";

grant select on table "public"."quotations" to "authenticated";

grant trigger on table "public"."quotations" to "authenticated";

grant truncate on table "public"."quotations" to "authenticated";

grant update on table "public"."quotations" to "authenticated";

grant delete on table "public"."quotations" to "service_role";

grant insert on table "public"."quotations" to "service_role";

grant references on table "public"."quotations" to "service_role";

grant select on table "public"."quotations" to "service_role";

grant trigger on table "public"."quotations" to "service_role";

grant truncate on table "public"."quotations" to "service_role";

grant update on table "public"."quotations" to "service_role";


  create policy "bus_payments_allow_all"
  on "public"."bus_payments"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "provider_payments_allow_all"
  on "public"."provider_payments"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotation_accommodation_details_allow_all"
  on "public"."quotation_accommodation_details"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotation_accommodations_allow_all"
  on "public"."quotation_accommodations"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotation_buses_allow_all"
  on "public"."quotation_buses"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotation_providers_allow_all"
  on "public"."quotation_providers"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotation_public_prices_allow_all"
  on "public"."quotation_public_prices"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "quotations_allow_all"
  on "public"."quotations"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER quotation_accommodations_updated_at BEFORE UPDATE ON public.quotation_accommodations FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER quotation_buses_updated_at BEFORE UPDATE ON public.quotation_buses FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER quotation_public_prices_updated_at BEFORE UPDATE ON public.quotation_public_prices FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


