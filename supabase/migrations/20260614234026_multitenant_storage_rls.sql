-- Restrict travel-gallery storage to travel owners only.
-- The storage path format is: {travelId}/{folder}/{filename}
-- (string_to_array(name, '/'))[1] extracts the travelId prefix.
-- Anon read-only policy is preserved unchanged.

DROP POLICY "gallery_authenticated_all" ON storage.objects;

CREATE POLICY "gallery_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'travel-gallery'
    AND EXISTS (
      SELECT 1 FROM public.travels
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'travel-gallery'
    AND EXISTS (
      SELECT 1 FROM public.travels
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND owner_id = auth.uid()
    )
  );
