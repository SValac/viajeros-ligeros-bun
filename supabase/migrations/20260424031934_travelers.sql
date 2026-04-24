
  create table "public"."travelers" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "travel_bus_id" uuid,
    "representative_id" uuid,
    "is_representative" boolean not null default true,
    "first_name" text not null,
    "last_name" text not null,
    "phone" text not null,
    "seat" text not null,
    "boarding_point" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."travelers" enable row level security;

CREATE UNIQUE INDEX travelers_pkey ON public.travelers USING btree (id);

CREATE INDEX travelers_representative_id_idx ON public.travelers USING btree (representative_id);

CREATE INDEX travelers_travel_bus_id_idx ON public.travelers USING btree (travel_bus_id);

CREATE INDEX travelers_travel_id_idx ON public.travelers USING btree (travel_id);

alter table "public"."travelers" add constraint "travelers_pkey" PRIMARY KEY using index "travelers_pkey";

alter table "public"."travelers" add constraint "travelers_representative_check" CHECK ((((is_representative = true) AND (representative_id IS NULL)) OR (is_representative = false))) not valid;

alter table "public"."travelers" validate constraint "travelers_representative_check";

alter table "public"."travelers" add constraint "travelers_representative_id_fkey" FOREIGN KEY (representative_id) REFERENCES public.travelers(id) ON DELETE SET NULL not valid;

alter table "public"."travelers" validate constraint "travelers_representative_id_fkey";

alter table "public"."travelers" add constraint "travelers_travel_bus_id_fkey" FOREIGN KEY (travel_bus_id) REFERENCES public.travel_buses(id) ON DELETE SET NULL not valid;

alter table "public"."travelers" validate constraint "travelers_travel_bus_id_fkey";

alter table "public"."travelers" add constraint "travelers_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."travelers" validate constraint "travelers_travel_id_fkey";

grant delete on table "public"."travelers" to "anon";

grant insert on table "public"."travelers" to "anon";

grant references on table "public"."travelers" to "anon";

grant select on table "public"."travelers" to "anon";

grant trigger on table "public"."travelers" to "anon";

grant truncate on table "public"."travelers" to "anon";

grant update on table "public"."travelers" to "anon";

grant delete on table "public"."travelers" to "authenticated";

grant insert on table "public"."travelers" to "authenticated";

grant references on table "public"."travelers" to "authenticated";

grant select on table "public"."travelers" to "authenticated";

grant trigger on table "public"."travelers" to "authenticated";

grant truncate on table "public"."travelers" to "authenticated";

grant update on table "public"."travelers" to "authenticated";

grant delete on table "public"."travelers" to "service_role";

grant insert on table "public"."travelers" to "service_role";

grant references on table "public"."travelers" to "service_role";

grant select on table "public"."travelers" to "service_role";

grant trigger on table "public"."travelers" to "service_role";

grant truncate on table "public"."travelers" to "service_role";

grant update on table "public"."travelers" to "service_role";


  create policy "travelers_allow_all"
  on "public"."travelers"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER travelers_updated_at BEFORE UPDATE ON public.travelers FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


