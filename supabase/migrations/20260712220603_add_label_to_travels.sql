alter table "public"."travels" add column "label" text;

update "public"."travels" set "label" = "destination" where "label" is null;

alter table "public"."travels" alter column "label" set not null;

alter table "public"."travels" alter column "destination" drop not null;
