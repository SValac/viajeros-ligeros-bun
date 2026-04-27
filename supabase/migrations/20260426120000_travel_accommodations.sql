-- Tabla de habitaciones de viaje sincronizadas desde cotización
-- Cada fila representa UNA habitación física asignada al viaje.
-- Si una cotización tiene quantity=3 para un tipo, se generan 3 filas.
CREATE TABLE travel_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_id uuid NOT NULL REFERENCES travels(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  -- FK opcional al tipo de habitación del proveedor (se pone a NULL si el tipo se elimina)
  hotel_room_type_id uuid REFERENCES hotel_room_types(id) ON DELETE SET NULL,
  -- Snapshot de capacidad máxima al momento de la sincronización
  max_occupancy integer NOT NULL CHECK (max_occupancy > 0),
  -- Campos editables por el usuario en la vista de habitaciones
  room_number text,
  floor integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX travel_accommodations_travel_id_idx ON travel_accommodations(travel_id);
CREATE INDEX travel_accommodations_provider_id_idx ON travel_accommodations(provider_id);
