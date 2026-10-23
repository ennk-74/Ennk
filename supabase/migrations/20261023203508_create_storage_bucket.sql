/*
# Create storage bucket for clothing photos

1. Storage
- Create a public bucket named 'clothing-photos' for storing clothing item photos.
- Allow public read access (so photos can be displayed).
- Allow anon + authenticated to upload, update, delete photos.

2. Policies
- SELECT (read): public - anyone can view photos
- INSERT (upload): anon + authenticated
- UPDATE: anon + authenticated
- DELETE: anon + authenticated
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-photos', 'clothing-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for clothing photos" ON storage.objects;
CREATE POLICY "Public read access for clothing photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'clothing-photos');

DROP POLICY IF EXISTS "Anon upload clothing photos" ON storage.objects;
CREATE POLICY "Anon upload clothing photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'clothing-photos');

DROP POLICY IF EXISTS "Anon update clothing photos" ON storage.objects;
CREATE POLICY "Anon update clothing photos"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'clothing-photos')
  WITH CHECK (bucket_id = 'clothing-photos');

DROP POLICY IF EXISTS "Anon delete clothing photos" ON storage.objects;
CREATE POLICY "Anon delete clothing photos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'clothing-photos');
