-- Spotibai storage: private audio + covers buckets, admin-write / authed-read policies.
-- No secrets. No seeds.

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false), ('covers', 'covers', false)
ON CONFLICT (id) DO NOTHING;

-- INSERT: admin-only
DROP POLICY IF EXISTS storage_insert_admin ON storage.objects;
CREATE POLICY storage_insert_admin
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('audio', 'covers') AND (SELECT private.is_admin()));

-- SELECT: any authenticated user (stream via signed URLs)
DROP POLICY IF EXISTS storage_select_authed ON storage.objects;
CREATE POLICY storage_select_authed
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('audio', 'covers'));

-- UPDATE: admin-only
DROP POLICY IF EXISTS storage_update_admin ON storage.objects;
CREATE POLICY storage_update_admin
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('audio', 'covers') AND (SELECT private.is_admin()))
  WITH CHECK (bucket_id IN ('audio', 'covers') AND (SELECT private.is_admin()));

-- DELETE: admin-only
DROP POLICY IF EXISTS storage_delete_admin ON storage.objects;
CREATE POLICY storage_delete_admin
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('audio', 'covers') AND (SELECT private.is_admin()));
