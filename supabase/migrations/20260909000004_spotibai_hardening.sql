-- Spotibai hardening: revoke API access to trigger helpers, add missing FK
-- indexes, wrap auth.uid() in (select ...) for initPlan caching in RLS policies.
-- No secrets. Idempotent (IF NOT EXISTS / DROP IF EXISTS).

-- 1. Trigger helpers must never be callable via the Data API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;

-- 2. Covering indexes for foreign keys flagged by the linter
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON public.albums (artist_id);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_track_id ON public.liked_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON public.playlist_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON public.tracks (uploaded_by);

-- 3. Re-issue auth.uid()-dependent policies with (select auth.uid())
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS playlists_select ON public.playlists;
CREATE POLICY playlists_select
  ON public.playlists FOR SELECT TO authenticated
  USING (is_public = true OR owner_id = (select auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS playlists_insert_own ON public.playlists;
CREATE POLICY playlists_insert_own
  ON public.playlists FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS playlists_update_owner_admin ON public.playlists;
CREATE POLICY playlists_update_owner_admin
  ON public.playlists FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
  WITH CHECK (owner_id = (select auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS playlists_delete_owner_admin ON public.playlists;
CREATE POLICY playlists_delete_owner_admin
  ON public.playlists FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS playlist_tracks_select ON public.playlist_tracks;
CREATE POLICY playlist_tracks_select
  ON public.playlist_tracks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND (p.is_public = true OR p.owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
    )
  );

DROP POLICY IF EXISTS playlist_tracks_insert ON public.playlist_tracks;
CREATE POLICY playlist_tracks_insert
  ON public.playlist_tracks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND (p.owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
    )
  );

DROP POLICY IF EXISTS playlist_tracks_update ON public.playlist_tracks;
CREATE POLICY playlist_tracks_update
  ON public.playlist_tracks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND (p.owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND (p.owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
    )
  );

DROP POLICY IF EXISTS playlist_tracks_delete ON public.playlist_tracks;
CREATE POLICY playlist_tracks_delete
  ON public.playlist_tracks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND (p.owner_id = (select auth.uid()) OR (SELECT private.is_admin()))
    )
  );

DROP POLICY IF EXISTS liked_tracks_select ON public.liked_tracks;
CREATE POLICY liked_tracks_select
  ON public.liked_tracks FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS liked_tracks_insert_own ON public.liked_tracks;
CREATE POLICY liked_tracks_insert_own
  ON public.liked_tracks FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS liked_tracks_delete_own ON public.liked_tracks;
CREATE POLICY liked_tracks_delete_own
  ON public.liked_tracks FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
