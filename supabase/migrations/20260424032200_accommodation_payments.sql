
  create table "public"."accommodation_payments" (
    "id" uuid not null default gen_random_uuid(),
    "quotation_accommodation_id" uuid not null,
    "amount" numeric not null,
    "payment_date" date not null,
    "payment_type" public.payment_type not null,
    "concept" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."accommodation_payments" enable row level security;

CREATE UNIQUE INDEX accommodation_payments_pkey ON public.accommodation_payments USING btree (id);

CREATE INDEX accommodation_payments_quotation_accommodation_id_idx ON public.accommodation_payments USING btree (quotation_accommodation_id);

alter table "public"."accommodation_payments" add constraint "accommodation_payments_pkey" PRIMARY KEY using index "accommodation_payments_pkey";

alter table "public"."accommodation_payments" add constraint "accommodation_payments_quotation_accommodation_id_fkey" FOREIGN KEY (quotation_accommodation_id) REFERENCES public.quotation_accommodations(id) ON DELETE CASCADE not valid;

alter table "public"."accommodation_payments" validate constraint "accommodation_payments_quotation_accommodation_id_fkey";

grant delete on table "public"."accommodation_payments" to "anon";
grant insert on table "public"."accommodation_payments" to "anon";
grant references on table "public"."accommodation_payments" to "anon";
grant select on table "public"."accommodation_payments" to "anon";
grant trigger on table "public"."accommodation_payments" to "anon";
grant truncate on table "public"."accommodation_payments" to "anon";
grant update on table "public"."accommodation_payments" to "anon";

grant delete on table "public"."accommodation_payments" to "authenticated";
grant insert on table "public"."accommodation_payments" to "authenticated";
grant references on table "public"."accommodation_payments" to "authenticated";
grant select on table "public"."accommodation_payments" to "authenticated";
grant trigger on table "public"."accommodation_payments" to "authenticated";
grant truncate on table "public"."accommodation_payments" to "authenticated";
grant update on table "public"."accommodation_payments" to "authenticated";

grant delete on table "public"."accommodation_payments" to "service_role";
grant insert on table "public"."accommodation_payments" to "service_role";
grant references on table "public"."accommodation_payments" to "service_role";
grant select on table "public"."accommodation_payments" to "service_role";
grant trigger on table "public"."accommodation_payments" to "service_role";
grant truncate on table "public"."accommodation_payments" to "service_role";
grant update on table "public"."accommodation_payments" to "service_role";


  create policy "accommodation_payments_allow_all"
  on "public"."accommodation_payments"
  as permissive
  for all
  to public
using (true)
with check (true);
