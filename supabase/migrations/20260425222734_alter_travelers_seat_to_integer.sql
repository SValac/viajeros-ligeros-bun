alter table "public"."travelers"
  alter column "seat" type integer using "seat"::integer;

alter table "public"."travelers"
  add constraint "travelers_seat_positive" check (seat > 0) not valid;

alter table "public"."travelers"
  validate constraint "travelers_seat_positive";
