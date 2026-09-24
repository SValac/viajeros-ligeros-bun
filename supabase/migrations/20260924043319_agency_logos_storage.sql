INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-logos',
  'agency-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "agency_logos_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "agency_logos_anon_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'agency-logos');