-- Spotibai schema: catalog, playlists, likes, audit + helpers
-- No secrets. No seeds.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS private;

-- profiles: id is FK to auth.users.id
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist_id uuid REFERENCES public.artists (id) ON DELETE CASCADE,
  cover_path text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist_id uuid NOT NULL REFERENCES public.artists (id) ON DELETE RESTRICT,
  album_id uuid REFERENCES public.albums (id) ON DELETE SET NULL,
  duration_ms int CHECK (duration_ms > 0),
  storage_path text NOT NULL,
  cover_path text,
  uploaded_by uuid REFERENCES public.profiles (id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES public.playlists (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position >= 0),
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.liked_tracks (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id),
  action text NOT NULL,
  target_id text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON public.tracks (artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON public.tracks (album_id);
CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON public.playlists (owner_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON public.playlist_tracks (playlist_id);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_user_id ON public.liked_tracks (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON public.albums (artist_id);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_track_id ON public.liked_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON public.playlist_tracks (track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON public.tracks (uploaded_by);

-- Helper: admin check
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
-- Policies and the role guard call private.is_admin(); callers need schema USAGE
GRANT USAGE ON SCHEMA private TO authenticated;

-- Signup trigger: create profile on new auth user. Prefers the chosen
-- display_name from signup metadata (display text only, never authorization),
-- falls back to email. Rendered output is DOMPurify-sanitized client-side.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(LEFT(COALESCE(NEW.raw_user_meta_data->>'display_name', ''), 80), ''),
      NEW.email,
      'New user'
    ),
    'USER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Guard: prevent non-admin role escalation via client. SECURITY INVOKER so
-- current_user is the real caller: direct database sessions (SQL editor as
-- postgres, service_role scripts/Edge Functions) are exempt for the one-time
-- first-Admin bootstrap; anon/authenticated callers are never exempt.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'role change requires admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Trigger helpers must never be callable via the Data API (they run as triggers
-- only). Revokes live here, after creation, so the migration replays clean.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
