
  create table "public"."travel_activities" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "day" integer not null,
    "title" text not null,
    "description" text not null,
    "time" text,
    "location" text
      );


alter table "public"."travel_activities" enable row level security;


  create table "public"."travel_buses" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "bus_id" uuid,
    "provider_id" uuid not null,
    "model" text,
    "brand" text,
    "year" integer,
    "operator1_name" text not null,
    "operator1_phone" text not null,
    "operator2_name" text,
    "operator2_phone" text,
    "seat_count" integer not null,
    "rental_price" numeric not null
      );


alter table "public"."travel_buses" enable row level security;


  create table "public"."travel_coordinators" (
    "travel_id" uuid not null,
    "coordinator_id" uuid not null
      );


alter table "public"."travel_coordinators" enable row level security;


  create table "public"."travel_services" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "name" text not null,
    "description" text,
    "included" boolean not null default true,
    "provider_id" uuid
      );


alter table "public"."travel_services" enable row level security;


  create table "public"."travels" (
    "id" uuid not null default gen_random_uuid(),
    "destination" text not null,
    "start_date" date not null,
    "end_date" date not null,
    "price" numeric not null,
    "description" text not null,
    "image_url" text,
    "status" public.travel_status not null default 'pending'::public.travel_status,
    "internal_notes" text,
    "total_operation_cost" numeric,
    "minimum_seats" integer,
    "projected_profit" numeric,
    "accumulated_travelers" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."travels" enable row level security;

CREATE UNIQUE INDEX travel_activities_pkey ON public.travel_activities USING btree (id);

CREATE INDEX travel_activities_travel_id_idx ON public.travel_activities USING btree (travel_id);

CREATE INDEX travel_buses_bus_id_idx ON public.travel_buses USING btree (bus_id);

CREATE UNIQUE INDEX travel_buses_pkey ON public.travel_buses USING btree (id);

CREATE INDEX travel_buses_provider_id_idx ON public.travel_buses USING btree (provider_id);

CREATE INDEX travel_buses_travel_id_idx ON public.travel_buses USING btree (travel_id);

CREATE INDEX travel_coordinators_coordinator_id_idx ON public.travel_coordinators USING btree (coordinator_id);

CREATE UNIQUE INDEX travel_coordinators_pkey ON public.travel_coordinators USING btree (travel_id, coordinator_id);

CREATE INDEX travel_coordinators_travel_id_idx ON public.travel_coordinators USING btree (travel_id);

CREATE UNIQUE INDEX travel_services_pkey ON public.travel_services USING btree (id);

CREATE INDEX travel_services_provider_id_idx ON public.travel_services USING btree (provider_id);

CREATE INDEX travel_services_travel_id_idx ON public.travel_services USING btree (travel_id);

CREATE UNIQUE INDEX travels_pkey ON public.travels USING btree (id);

CREATE INDEX travels_status_idx ON public.travels USING btree (status);

alter table "public"."travel_activities" add constraint "travel_activities_pkey" PRIMARY KEY using index "travel_activities_pkey";

alter table "public"."travel_buses" add constraint "travel_buses_pkey" PRIMARY KEY using index "travel_buses_pkey";

alter table "public"."travel_coordinators" add constraint "travel_coordinators_pkey" PRIMARY KEY using index "travel_coordinators_pkey";

alter table "public"."travel_services" add constraint "travel_services_pkey" PRIMARY KEY using index "travel_services_pkey";

alter table "public"."travels" add constraint "travels_pkey" PRIMARY KEY using index "travels_pkey";

alter table "public"."travel_activities" add constraint "travel_activities_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."travel_activities" validate constraint "travel_activities_travel_id_fkey";

alter table "public"."travel_buses" add constraint "travel_buses_bus_id_fkey" FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE SET NULL not valid;

alter table "public"."travel_buses" validate constraint "travel_buses_bus_id_fkey";

alter table "public"."travel_buses" add constraint "travel_buses_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT not valid;

alter table "public"."travel_buses" validate constraint "travel_buses_provider_id_fkey";

alter table "public"."travel_buses" add constraint "travel_buses_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."travel_buses" validate constraint "travel_buses_travel_id_fkey";

alter table "public"."travel_coordinators" add constraint "travel_coordinators_coordinator_id_fkey" FOREIGN KEY (coordinator_id) REFERENCES public.coordinators(id) ON DELETE CASCADE not valid;

alter table "public"."travel_coordinators" validate constraint "travel_coordinators_coordinator_id_fkey";

alter table "public"."travel_coordinators" add constraint "travel_coordinators_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."travel_coordinators" validate constraint "travel_coordinators_travel_id_fkey";

alter table "public"."travel_services" add constraint "travel_services_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL not valid;

alter table "public"."travel_services" validate constraint "travel_services_provider_id_fkey";

alter table "public"."travel_services" add constraint "travel_services_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."travel_services" validate constraint "travel_services_travel_id_fkey";

grant delete on table "public"."travel_activities" to "anon";

grant insert on table "public"."travel_activities" to "anon";

grant references on table "public"."travel_activities" to "anon";

grant select on table "public"."travel_activities" to "anon";

grant trigger on table "public"."travel_activities" to "anon";

grant truncate on table "public"."travel_activities" to "anon";

grant update on table "public"."travel_activities" to "anon";

grant delete on table "public"."travel_activities" to "authenticated";

grant insert on table "public"."travel_activities" to "authenticated";

grant references on table "public"."travel_activities" to "authenticated";

grant select on table "public"."travel_activities" to "authenticated";

grant trigger on table "public"."travel_activities" to "authenticated";

grant truncate on table "public"."travel_activities" to "authenticated";

grant update on table "public"."travel_activities" to "authenticated";

grant delete on table "public"."travel_activities" to "service_role";

grant insert on table "public"."travel_activities" to "service_role";

grant references on table "public"."travel_activities" to "service_role";

grant select on table "public"."travel_activities" to "service_role";

grant trigger on table "public"."travel_activities" to "service_role";

grant truncate on table "public"."travel_activities" to "service_role";

grant update on table "public"."travel_activities" to "service_role";

grant delete on table "public"."travel_buses" to "anon";

grant insert on table "public"."travel_buses" to "anon";

grant references on table "public"."travel_buses" to "anon";

grant select on table "public"."travel_buses" to "anon";

grant trigger on table "public"."travel_buses" to "anon";

grant truncate on table "public"."travel_buses" to "anon";

grant update on table "public"."travel_buses" to "anon";

grant delete on table "public"."travel_buses" to "authenticated";

grant insert on table "public"."travel_buses" to "authenticated";

grant references on table "public"."travel_buses" to "authenticated";

grant select on table "public"."travel_buses" to "authenticated";

grant trigger on table "public"."travel_buses" to "authenticated";

grant truncate on table "public"."travel_buses" to "authenticated";

grant update on table "public"."travel_buses" to "authenticated";

grant delete on table "public"."travel_buses" to "service_role";

grant insert on table "public"."travel_buses" to "service_role";

grant references on table "public"."travel_buses" to "service_role";

grant select on table "public"."travel_buses" to "service_role";

grant trigger on table "public"."travel_buses" to "service_role";

grant truncate on table "public"."travel_buses" to "service_role";

grant update on table "public"."travel_buses" to "service_role";

grant delete on table "public"."travel_coordinators" to "anon";

grant insert on table "public"."travel_coordinators" to "anon";

grant references on table "public"."travel_coordinators" to "anon";

grant select on table "public"."travel_coordinators" to "anon";

grant trigger on table "public"."travel_coordinators" to "anon";

grant truncate on table "public"."travel_coordinators" to "anon";

grant update on table "public"."travel_coordinators" to "anon";

grant delete on table "public"."travel_coordinators" to "authenticated";

grant insert on table "public"."travel_coordinators" to "authenticated";

grant references on table "public"."travel_coordinators" to "authenticated";

grant select on table "public"."travel_coordinators" to "authenticated";

grant trigger on table "public"."travel_coordinators" to "authenticated";

grant truncate on table "public"."travel_coordinators" to "authenticated";

grant update on table "public"."travel_coordinators" to "authenticated";

grant delete on table "public"."travel_coordinators" to "service_role";

grant insert on table "public"."travel_coordinators" to "service_role";

grant references on table "public"."travel_coordinators" to "service_role";

grant select on table "public"."travel_coordinators" to "service_role";

grant trigger on table "public"."travel_coordinators" to "service_role";

grant truncate on table "public"."travel_coordinators" to "service_role";

grant update on table "public"."travel_coordinators" to "service_role";

grant delete on table "public"."travel_services" to "anon";

grant insert on table "public"."travel_services" to "anon";

grant references on table "public"."travel_services" to "anon";

grant select on table "public"."travel_services" to "anon";

grant trigger on table "public"."travel_services" to "anon";

grant truncate on table "public"."travel_services" to "anon";

grant update on table "public"."travel_services" to "anon";

grant delete on table "public"."travel_services" to "authenticated";

grant insert on table "public"."travel_services" to "authenticated";

grant references on table "public"."travel_services" to "authenticated";

grant select on table "public"."travel_services" to "authenticated";

grant trigger on table "public"."travel_services" to "authenticated";

grant truncate on table "public"."travel_services" to "authenticated";

grant update on table "public"."travel_services" to "authenticated";

grant delete on table "public"."travel_services" to "service_role";

grant insert on table "public"."travel_services" to "service_role";

grant references on table "public"."travel_services" to "service_role";

grant select on table "public"."travel_services" to "service_role";

grant trigger on table "public"."travel_services" to "service_role";

grant truncate on table "public"."travel_services" to "service_role";

grant update on table "public"."travel_services" to "service_role";

grant delete on table "public"."travels" to "anon";

grant insert on table "public"."travels" to "anon";

grant references on table "public"."travels" to "anon";

grant select on table "public"."travels" to "anon";

grant trigger on table "public"."travels" to "anon";

grant truncate on table "public"."travels" to "anon";

grant update on table "public"."travels" to "anon";

grant delete on table "public"."travels" to "authenticated";

grant insert on table "public"."travels" to "authenticated";

grant references on table "public"."travels" to "authenticated";

grant select on table "public"."travels" to "authenticated";

grant trigger on table "public"."travels" to "authenticated";

grant truncate on table "public"."travels" to "authenticated";

grant update on table "public"."travels" to "authenticated";

grant delete on table "public"."travels" to "service_role";

grant insert on table "public"."travels" to "service_role";

grant references on table "public"."travels" to "service_role";

grant select on table "public"."travels" to "service_role";

grant trigger on table "public"."travels" to "service_role";

grant truncate on table "public"."travels" to "service_role";

grant update on table "public"."travels" to "service_role";


  create policy "travel_activities_allow_all"
  on "public"."travel_activities"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "travel_buses_allow_all"
  on "public"."travel_buses"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "travel_coordinators_allow_all"
  on "public"."travel_coordinators"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "travel_services_allow_all"
  on "public"."travel_services"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "travels_allow_all"
  on "public"."travels"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER travels_updated_at BEFORE UPDATE ON public.travels FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


