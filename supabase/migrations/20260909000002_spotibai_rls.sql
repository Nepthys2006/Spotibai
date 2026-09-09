-- Spotibai RLS: deny-by-default, explicit per-action TO authenticated policies.
-- No secrets. Calls use (SELECT private.is_admin()) for initPlan caching.

-- Enable RLS on all 8 public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- profiles: SELECT all authed, UPDATE own only, no client INSERT/DELETE
DROP POLICY IF EXISTS profiles_select_authed ON public.profiles;
CREATE POLICY profiles_select_authed
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- artists: SELECT authed, writes admin-only
DROP POLICY IF EXISTS artists_select_authed ON public.artists;
CREATE POLICY artists_select_authed
  ON public.artists FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS artists_insert_admin ON public.artists;
CREATE POLICY artists_insert_admin
  ON public.artists FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS artists_update_admin ON public.artists;
CREATE POLICY artists_update_admin
  ON public.artists FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS artists_delete_admin ON public.artists;
CREATE POLICY artists_delete_admin
  ON public.artists FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- albums: SELECT authed, writes admin-only
DROP POLICY IF EXISTS albums_select_authed ON public.albums;
CREATE POLICY albums_select_authed
  ON public.albums FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS albums_insert_admin ON public.albums;
CREATE POLICY albums_insert_admin
  ON public.albums FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS albums_update_admin ON public.albums;
CREATE POLICY albums_update_admin
  ON public.albums FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS albums_delete_admin ON public.albums;
CREATE POLICY albums_delete_admin
  ON public.albums FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- tracks: SELECT authed, writes admin-only
DROP POLICY IF EXISTS tracks_select_authed ON public.tracks;
CREATE POLICY tracks_select_authed
  ON public.tracks FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tracks_insert_admin ON public.tracks;
CREATE POLICY tracks_insert_admin
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS tracks_update_admin ON public.tracks;
CREATE POLICY tracks_update_admin
  ON public.tracks FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS tracks_delete_admin ON public.tracks;
CREATE POLICY tracks_delete_admin
  ON public.tracks FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

-- playlists: SELECT own + public + admin; INSERT owner-only; UPDATE/DELETE owner or admin
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

-- playlist_tracks: SELECT via visible playlists (own + public + admin); writes owner/admin only
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

-- liked_tracks: own rows; admin gets SELECT as well; no UPDATE
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

-- audit_log: SELECT admin-only; no client INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS audit_log_select_admin ON public.audit_log;
CREATE POLICY audit_log_select_admin
  ON public.audit_log FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));
