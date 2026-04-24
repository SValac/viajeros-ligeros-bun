
  create table "public"."coordinators" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "age" integer not null,
    "phone" text not null,
    "email" text not null,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coordinators" enable row level security;


  create table "public"."providers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" public.provider_category not null,
    "description" text,
    "location_city" text not null,
    "location_state" text not null,
    "location_country" text not null,
    "contact_name" text,
    "contact_phone" text,
    "contact_email" text,
    "contact_notes" text,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."providers" enable row level security;

CREATE UNIQUE INDEX coordinators_pkey ON public.coordinators USING btree (id);

CREATE INDEX providers_active_idx ON public.providers USING btree (active);

CREATE INDEX providers_category_idx ON public.providers USING btree (category);

CREATE UNIQUE INDEX providers_pkey ON public.providers USING btree (id);

alter table "public"."coordinators" add constraint "coordinators_pkey" PRIMARY KEY using index "coordinators_pkey";

alter table "public"."providers" add constraint "providers_pkey" PRIMARY KEY using index "providers_pkey";

grant delete on table "public"."coordinators" to "anon";

grant insert on table "public"."coordinators" to "anon";

grant references on table "public"."coordinators" to "anon";

grant select on table "public"."coordinators" to "anon";

grant trigger on table "public"."coordinators" to "anon";

grant truncate on table "public"."coordinators" to "anon";

grant update on table "public"."coordinators" to "anon";

grant delete on table "public"."coordinators" to "authenticated";

grant insert on table "public"."coordinators" to "authenticated";

grant references on table "public"."coordinators" to "authenticated";

grant select on table "public"."coordinators" to "authenticated";

grant trigger on table "public"."coordinators" to "authenticated";

grant truncate on table "public"."coordinators" to "authenticated";

grant update on table "public"."coordinators" to "authenticated";

grant delete on table "public"."coordinators" to "service_role";

grant insert on table "public"."coordinators" to "service_role";

grant references on table "public"."coordinators" to "service_role";

grant select on table "public"."coordinators" to "service_role";

grant trigger on table "public"."coordinators" to "service_role";

grant truncate on table "public"."coordinators" to "service_role";

grant update on table "public"."coordinators" to "service_role";

grant delete on table "public"."providers" to "anon";

grant insert on table "public"."providers" to "anon";

grant references on table "public"."providers" to "anon";

grant select on table "public"."providers" to "anon";

grant trigger on table "public"."providers" to "anon";

grant truncate on table "public"."providers" to "anon";

grant update on table "public"."providers" to "anon";

grant delete on table "public"."providers" to "authenticated";

grant insert on table "public"."providers" to "authenticated";

grant references on table "public"."providers" to "authenticated";

grant select on table "public"."providers" to "authenticated";

grant trigger on table "public"."providers" to "authenticated";

grant truncate on table "public"."providers" to "authenticated";

grant update on table "public"."providers" to "authenticated";

grant delete on table "public"."providers" to "service_role";

grant insert on table "public"."providers" to "service_role";

grant references on table "public"."providers" to "service_role";

grant select on table "public"."providers" to "service_role";

grant trigger on table "public"."providers" to "service_role";

grant truncate on table "public"."providers" to "service_role";

grant update on table "public"."providers" to "service_role";


  create policy "coordinators_allow_all"
  on "public"."coordinators"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "providers_allow_all"
  on "public"."providers"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER coordinators_updated_at BEFORE UPDATE ON public.coordinators FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


