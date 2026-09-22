-- Bloque 1: itinerario y fotos
CREATE POLICY "travel_activities_coordinator_insert" ON public.travel_activities
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_activities_coordinator_update" ON public.travel_activities
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_activities_coordinator_delete" ON public.travel_activities
  FOR DELETE TO authenticated
  USING (private.can_coordinator_edit(travel_id));

-- travel_media (mismas tres, idénticas)
CREATE POLICY "travel_media_coordinator_insert" ON public.travel_media
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_media_coordinator_update" ON public.travel_media
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_media_coordinator_delete" ON public.travel_media
  FOR DELETE TO authenticated
  USING (private.can_coordinator_edit(travel_id));

-- Bloque 2: Viajeros
CREATE POLICY "travelers_coordinator_update" ON public.travelers
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));

-- Bloque 3: Storage
CREATE POLICY "gallery_coordinator_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'travel-gallery'
    AND private.can_coordinator_edit(((string_to_array(name, '/'))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'travel-gallery'
    AND private.can_coordinator_edit(((string_to_array(name, '/'))[1])::uuid)
  );