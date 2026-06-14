
DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
