create extension if not exists "moddatetime" with schema "extensions";

create type "public"."cost_split_type" as enum ('minimum', 'total');

create type "public"."payment_type" as enum ('cash', 'transfer');

create type "public"."provider_category" as enum ('guides', 'transportation', 'accommodation', 'bus_agencies', 'food_services', 'other');

create type "public"."quotation_bus_status" as enum ('reserved', 'confirmed', 'pending');

create type "public"."quotation_status" as enum ('draft', 'confirmed');

create type "public"."travel_status" as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

create type "public"."traveler_type" as enum ('adult', 'child');


