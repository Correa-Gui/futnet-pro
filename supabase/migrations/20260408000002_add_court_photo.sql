ALTER TABLE public.courts
ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO storage.buckets (id, name, public)
SELECT 'court-images', 'court-images', true
WHERE NOT EXISTS (
  SELECT 1
  FROM storage.buckets
  WHERE id = 'court-images'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read court images'
  ) THEN
    CREATE POLICY "Public can read court images" ON storage.objects
      FOR SELECT USING (bucket_id = 'court-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload court images'
  ) THEN
    CREATE POLICY "Admins can upload court images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'court-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update court images'
  ) THEN
    CREATE POLICY "Admins can update court images" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'court-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete court images'
  ) THEN
    CREATE POLICY "Admins can delete court images" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'court-images'
        AND public.has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;
