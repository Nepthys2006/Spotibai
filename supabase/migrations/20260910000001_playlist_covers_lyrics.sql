-- Playlist covers + manual-LRC lyrics (additive, idempotent).
-- File-only migration: the user applies it with `supabase db push`.
-- No RLS changes: new columns inherit their table's existing policies.

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS cover_path text;

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS lyrics_lrc text;

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS lyrics_updated_at timestamptz;

-- Backfill album covers from the earliest track cover (only where the album has none).
UPDATE public.albums a
SET cover_path = (
  SELECT t.cover_path
  FROM public.tracks t
  WHERE t.album_id = a.id
    AND t.cover_path IS NOT NULL
  ORDER BY t.created_at
  LIMIT 1
)
WHERE a.cover_path IS NULL;
