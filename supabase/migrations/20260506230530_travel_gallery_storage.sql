-- Create public bucket for travel gallery images and videos.
-- Public = CDN URLs are accessible without auth (required for Landing page).
-- Only authenticated (admin) can upload/modify/delete files.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'travel-gallery',
  'travel-gallery',
  true,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
);

-- Admin: full storage operations (INSERT + SELECT + UPDATE needed for upsert)
CREATE POLICY "gallery_authenticated_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'travel-gallery')
  WITH CHECK (bucket_id = 'travel-gallery');

-- Anon: read-only (Landing page can display images/videos via public URLs)
CREATE POLICY "gallery_anon_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'travel-gallery');
