-- Add map_location column to providers table
-- Stores precise GPS coordinates and place information for providers

alter table "public"."providers" add column "map_location" jsonb;

-- Add comment explaining the structure
comment on column "public"."providers"."map_location" is
'JSON object containing map location data: {lat: number, lng: number, placeId?: string, address?: string, city?: string, state?: string, country?: string}';

-- Create index for efficient queries by map location (if needed in future)
create index "providers_map_location_idx" on "public"."providers" using gin ("map_location");
