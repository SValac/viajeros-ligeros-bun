-- Agrega referencia de habitación a viajero (nullable: un viajero puede no tener habitación asignada)
-- ON DELETE SET NULL: si se elimina la habitación, el viajero queda sin habitación asignada
ALTER TABLE travelers
  ADD COLUMN travel_accommodation_id uuid REFERENCES travel_accommodations(id) ON DELETE SET NULL;

CREATE INDEX travelers_travel_accommodation_id_idx ON travelers(travel_accommodation_id);
