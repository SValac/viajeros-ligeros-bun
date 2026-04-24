
  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "travel_id" uuid not null,
    "traveler_id" uuid not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "payment_type" public.payment_type not null,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."payments" enable row level security;


  create table "public"."traveler_account_configs" (
    "travel_id" uuid not null,
    "traveler_id" uuid not null,
    "traveler_type" public.traveler_type not null default 'adult'::public.traveler_type,
    "child_price" numeric,
    "discounts" jsonb not null default '[]'::jsonb,
    "surcharges" jsonb not null default '[]'::jsonb,
    "public_price_id" uuid,
    "public_price_amount" numeric
      );


alter table "public"."traveler_account_configs" enable row level security;

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE INDEX payments_travel_id_idx ON public.payments USING btree (travel_id);

CREATE INDEX payments_traveler_id_idx ON public.payments USING btree (traveler_id);

CREATE UNIQUE INDEX traveler_account_configs_pkey ON public.traveler_account_configs USING btree (travel_id, traveler_id);

CREATE INDEX traveler_account_configs_travel_id_idx ON public.traveler_account_configs USING btree (travel_id);

CREATE INDEX traveler_account_configs_traveler_id_idx ON public.traveler_account_configs USING btree (traveler_id);

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."traveler_account_configs" add constraint "traveler_account_configs_pkey" PRIMARY KEY using index "traveler_account_configs_pkey";

alter table "public"."payments" add constraint "payments_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_travel_id_fkey";

alter table "public"."payments" add constraint "payments_traveler_id_fkey" FOREIGN KEY (traveler_id) REFERENCES public.travelers(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_traveler_id_fkey";

alter table "public"."traveler_account_configs" add constraint "traveler_account_configs_travel_id_fkey" FOREIGN KEY (travel_id) REFERENCES public.travels(id) ON DELETE CASCADE not valid;

alter table "public"."traveler_account_configs" validate constraint "traveler_account_configs_travel_id_fkey";

alter table "public"."traveler_account_configs" add constraint "traveler_account_configs_traveler_id_fkey" FOREIGN KEY (traveler_id) REFERENCES public.travelers(id) ON DELETE CASCADE not valid;

alter table "public"."traveler_account_configs" validate constraint "traveler_account_configs_traveler_id_fkey";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."traveler_account_configs" to "anon";

grant insert on table "public"."traveler_account_configs" to "anon";

grant references on table "public"."traveler_account_configs" to "anon";

grant select on table "public"."traveler_account_configs" to "anon";

grant trigger on table "public"."traveler_account_configs" to "anon";

grant truncate on table "public"."traveler_account_configs" to "anon";

grant update on table "public"."traveler_account_configs" to "anon";

grant delete on table "public"."traveler_account_configs" to "authenticated";

grant insert on table "public"."traveler_account_configs" to "authenticated";

grant references on table "public"."traveler_account_configs" to "authenticated";

grant select on table "public"."traveler_account_configs" to "authenticated";

grant trigger on table "public"."traveler_account_configs" to "authenticated";

grant truncate on table "public"."traveler_account_configs" to "authenticated";

grant update on table "public"."traveler_account_configs" to "authenticated";

grant delete on table "public"."traveler_account_configs" to "service_role";

grant insert on table "public"."traveler_account_configs" to "service_role";

grant references on table "public"."traveler_account_configs" to "service_role";

grant select on table "public"."traveler_account_configs" to "service_role";

grant trigger on table "public"."traveler_account_configs" to "service_role";

grant truncate on table "public"."traveler_account_configs" to "service_role";

grant update on table "public"."traveler_account_configs" to "service_role";


  create policy "payments_allow_all"
  on "public"."payments"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "traveler_account_configs_allow_all"
  on "public"."traveler_account_configs"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


