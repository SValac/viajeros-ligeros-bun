-- Add map_location column to travel_activities table
-- Stores precise GPS coordinates and place information for activities

alter table "public"."travel_activities" add column "map_location" jsonb;

-- Add comment explaining the structure
comment on column "public"."travel_activities"."map_location" is
'JSON object containing map location data: {lat: number, lng: number, placeId?: string, address?: string}';

-- Create index for efficient queries by map location (if needed in future)
create index "travel_activities_map_location_idx" on "public"."travel_activities" using gin ("map_location");
