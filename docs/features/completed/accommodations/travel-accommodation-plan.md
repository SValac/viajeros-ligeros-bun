# Plan: Habitaciones — Hotel Room Sync & Traveler Assignment

## Context
Bus pattern (template):
- `travel_buses` table ← synced from `quotation_buses` via `_syncBusesToTravel`
- `travelers.travel_bus_id` nullable FK → `travel_buses` + `seat integer`
- Unique index (travel_bus_id, seat)
- `move_or_swap_traveler_seat` RPC for atomic seat moves
- Travelers page has tabs per bus, seat map UI

Hotel pattern (existing):
- `quotation_accommodations` + `quotation_accommodation_details` (quantity per room type)
- `hotel_room_types.max_occupancy` — capacity per room
- NO `travel_accommodations` table exists
- NO sync from cotización to travel for rooms
- `travelers` has NO `travel_accommodation_id` column

## New DB Tables / Columns

### Migration 1: `travel_accommodations`
```sql
CREATE TABLE travel_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_id uuid NOT NULL REFERENCES travels(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  hotel_room_type_id uuid REFERENCES hotel_room_types(id) ON DELETE SET NULL,
  max_occupancy integer NOT NULL,
  beds jsonb,                    -- snapshot from room type
  room_number text,              -- editable by user
  floor integer,                 -- editable by user
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
Indexes: on `travel_id`, on `provider_id`

### Migration 2: Add column + RPC
```sql
ALTER TABLE travelers ADD COLUMN travel_accommodation_id uuid
  REFERENCES travel_accommodations(id) ON DELETE SET NULL;

-- Optional: RPC assign_traveler_to_room(p_traveler_id, p_accommodation_id)
-- validates capacity before assigning
```

## Types (app/types/)

### travel.ts — add:
```ts
type TravelAccommodation = {
  id: string;
  travelId: string;
  providerId: string;
  hotelRoomTypeId?: string;
  maxOccupancy: number;
  beds?: BedConfiguration[];
  roomNumber?: string;
  floor?: number;
  createdAt: string;
  updatedAt: string;
};
// Update Travel type:
accommodations: TravelAccommodation[];
```

### traveler.ts — add field:
```ts
travelAccommodationId?: string;
```

## Store Changes

### use-travels-store.ts
- Fetch `travel_accommodations` with travels (join or separate fetch in `fetchAll`)
- Add to Travel type: `accommodations: TravelAccommodation[]`
- New actions: `addAccommodationToTravel`, `updateTravelAccommodation`, `removeAccommodationFromTravel`
- Update `updateTravel` to handle `accommodations` array (full delete + re-insert, same as buses)

### use-cotizacion-store.ts
- Add private `_syncHospedajeToTravel(quotationId)`:
  - Get all `quotation_accommodation_details` for this quotation's accommodations
  - Expand each detail.quantity into N individual TravelAccommodation records
  - Call `travelStore.updateTravel(travelId, { accommodations })`
- Call after: `addHospedajeQuotation`, `updateHospedajeQuotation`, `deleteHospedajeQuotation`

### use-traveler-store.ts
- Update `Traveler` to include `travelAccommodationId`
- Add actions: `assignTravelerToRoom(travelerId, accommodationId)`, `removeTravelerFromRoom(travelerId)`
- Add getter: `getTravelersByAccommodation(accommodationId)`
- Map `travel_accommodation_id` from DB in fetch

## New Components
- `travel-accommodation-card.vue` — room card: type info, beds, max occupancy, room number (editable inline), floor (editable), traveler list with capacity badge, add/remove traveler
- `travel-accommodation-form.vue` — simple form: room_number + floor fields, for edit modal

## New Page: `app/pages/travels/[id]/habitaciones/index.vue`
- `definePageMeta({ name: 'travel-habitaciones' })`
- Shows all rooms grouped by hotel provider (accordion or tabs)
- Each room = `TravelAccommodationCard`
- Stat cards: total rooms, occupied rooms, unassigned travelers
- "Agregar viajero" flow: click room → pick from unassigned travelers modal (filtered by !travelAccommodationId)
- Capacity enforcement: disable add button when room full (occupants >= maxOccupancy)

## Travelers Page Update (`app/pages/travels/[id]/travelers/index.vue`)
- Add "Habitación" column to the travelers table showing assigned room (room_number or type)
- No new tabs needed (rooms page handles the room management)
- In traveler actions dropdown: "Asignar habitación" / "Cambiar habitación" / "Quitar de habitación"

## Navigation (`app/pages/travels/[id]/index.vue`)
- Add `UButton` with `icon="i-lucide-bed-double"`, label "Habitaciones", route `travel-habitaciones`

## Verification
1. `bun run typecheck` passes
2. `bun run lint:fix` passes
3. Migration applies cleanly with `supabase db reset`
4. Quotation accommodation add/update/delete → travel_accommodations auto-syncs
5. Traveler assignment respects max_occupancy (app-level or RPC)
6. Traveler can only be in one room (single FK)
7. Rooms page shows all rooms, allows editing room_number/floor
8. Navigation button appears in travel detail page

## Decisions
- Re-sync resets room_number/floor (same as buses lose operators on re-sync) — simple approach
- Capacity enforcement: application-level first; optional RPC if concurrency is a concern
- No new tabs in travelers page for rooms — rooms page is the primary assignment UI
- Traveler column "Habitación" added to travelers table for quick visibility
