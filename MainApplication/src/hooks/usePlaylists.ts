import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../lib/AuthProvider.tsx";
import { supabase } from "../lib/supabase.ts";
import type { Track } from "./useCatalog.ts";

export const playlistSchema = z.object({
  name: z.string().trim().min(1, "Enter a playlist name").max(120),
  isPublic: z.boolean(),
});

export type PlaylistForm = z.infer<typeof playlistSchema>;

export interface Playlist {
  id: string;
  owner_id: string;
  name: string;
  is_public: boolean;
  cover_path: string | null;
}

export interface PlaylistEntry {
  playlist_id: string;
  track_id: string;
  position: number;
  track: Track | null;
}

/** Own + visible public playlists (RLS filters). Empty when none. */
export function usePlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["playlists", user?.id ?? "anon"],
    queryFn: async (): Promise<Playlist[]> => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,owner_id,name,is_public,cover_path")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Playlist[];
    },
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    retry: 1,
  });
}

/** Single playlist row. Null when missing or not visible. */
export function usePlaylist(playlistId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async (): Promise<Playlist | null> => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,owner_id,name,is_public,cover_path")
        .eq("id", playlistId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Playlist | null) ?? null;
    },
    enabled: Boolean(user?.id) && Boolean(playlistId),
    staleTime: 15_000,
    retry: 1,
  });
}

interface RawEntry {
  playlist_id: string;
  track_id: string;
  position: number;
  tracks: {
    id: string;
    title: string;
    artist_id: string;
    album_id: string | null;
    duration_ms: number | null;
    storage_path: string;
    cover_path: string | null;
    lyrics_lrc: string | null;
    lyrics_updated_at: string | null;
    artists: { name: string } | { name: string }[] | null;
    albums: { title: string } | { title: string }[] | null;
  } | { id: string }[] | null;
}

function toEntry(row: RawEntry): PlaylistEntry {
  const t = Array.isArray(row.tracks) ? null : row.tracks;
  const artistRel = t?.artists ?? null;
  const albumRel = t?.albums ?? null;
  return {
    playlist_id: row.playlist_id,
    track_id: row.track_id,
    position: row.position,
    track: t
      ? {
          id: t.id,
          title: t.title,
          artist_id: t.artist_id,
          album_id: t.album_id,
          duration_ms: t.duration_ms,
          storage_path: t.storage_path,
          cover_path: t.cover_path,
          lyrics_lrc: t.lyrics_lrc,
          lyrics_updated_at: t.lyrics_updated_at,
          artist_name: artistRel
            ? Array.isArray(artistRel)
              ? (artistRel[0]?.name ?? null)
              : artistRel.name
            : null,
          album_title: albumRel
            ? Array.isArray(albumRel)
              ? (albumRel[0]?.title ?? null)
              : albumRel.title
            : null,
        }
      : null,
  };
}

/** Ordered entries for a playlist with track row data. */
export function usePlaylistEntries(playlistId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["playlist-entries", playlistId],
    queryFn: async (): Promise<PlaylistEntry[]> => {
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select(
          "playlist_id,track_id,position,tracks(id,title,artist_id,album_id,duration_ms,storage_path,cover_path,lyrics_lrc,lyrics_updated_at,artists(name),albums(title))",
        )
        .eq("playlist_id", playlistId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as RawEntry[]).map(toEntry);
    },
    enabled: Boolean(user?.id) && Boolean(playlistId),
    staleTime: 15_000,
    retry: 1,
  });
}

/** Track counts per playlist id (for list subtitles). */
export function usePlaylistTrackCounts(playlistIds: string[]) {
  const { user } = useAuth();
  const key = [...playlistIds].sort().join(",");
  return useQuery({
    queryKey: ["playlist-counts", key],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select("playlist_id")
        .in("playlist_id", playlistIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { playlist_id: string }[]) {
        counts[row.playlist_id] = (counts[row.playlist_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: Boolean(user?.id) && playlistIds.length > 0,
    staleTime: 15_000,
    retry: 1,
  });
}

export interface PublicPlaylistHit {
  id: string;
  name: string;
  is_public: boolean;
  owner_id: string;
  cover_path: string | null;
}

/** Public playlists matching a name (for search). */
export function usePlaylistSearch(term: string) {
  const { user } = useAuth();
  const active = term.trim().length > 0;
  return useQuery({
    queryKey: ["search-playlists", term],
    queryFn: async (): Promise<PublicPlaylistHit[]> => {
      const escaped = term.trim().replace(/([%_\\])/g, "\\$1");
      const { data, error } = await supabase
        .from("playlists")
        .select("id,name,is_public,owner_id,cover_path")
        .ilike("name", `%${escaped}%`)
        .order("name", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as PublicPlaylistHit[];
    },
    enabled: Boolean(user?.id) && active,
    staleTime: 15_000,
    retry: 1,
  });
}

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

/** Create a playlist; owner_id is always set explicitly to the session user. */
export function useCreatePlaylist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: PlaylistForm): Promise<Playlist> => {
      const ownerId = requireUserId(user?.id);
      const { data, error } = await supabase
        .from("playlists")
        .insert({ owner_id: ownerId, name: form.name, is_public: form.isPublic })
        .select("id,owner_id,name,is_public,cover_path")
        .single();
      if (error) throw error;
      return data as Playlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

/** Rename a playlist (owner or admin per RLS). */
export function useRenamePlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const parsed = playlistSchema.shape.name.safeParse(name);
      if (!parsed.success) {
        throw new Error(parsed.error.flatten().formErrors[0] ?? "Invalid name");
      }
      const { error } = await supabase
        .from("playlists")
        .update({ name: parsed.data })
        .eq("id", playlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

/** Delete a playlist (owner or admin per RLS). */
export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: string): Promise<void> => {
      const { error } = await supabase
        .from("playlists")
        .delete()
        .eq("id", playlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

/** Set a playlist public/private (owner or admin per RLS). */
export function useSetPlaylistVisibility(playlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isPublic: boolean): Promise<void> => {
      const { error } = await supabase
        .from("playlists")
        .update({ is_public: isPublic })
        .eq("id", playlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

const PLAYLIST_COVER_MAX_BYTES = 5 * 1024 * 1024;

const PLAYLIST_IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Sniff magic bytes; independent of extension/MIME (mirrors useAdmin cover checks). */
async function sniffPlaylistCoverKind(file: File): Promise<"image" | null> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (offset: number, len: number): string => {
    let s = "";
    for (let i = offset; i < offset + len && i < buf.length; i++) {
      s += String.fromCharCode(buf[i] as number);
    }
    return s;
  };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image"; // JPEG
  }
  if (buf.length >= 4 && buf[0] === 0x89 && ascii(1, 3) === "PNG") {
    return "image";
  }
  if (ascii(0, 4) === "GIF8") return "image";
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "image"; // BMP
  return null;
}

async function validatePlaylistCoverFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Cover must be an image/* upload.");
  }
  if (file.size <= 0 || file.size > PLAYLIST_COVER_MAX_BYTES) {
    throw new Error("Cover image must be non-empty and at most 5 MB.");
  }
  if ((await sniffPlaylistCoverKind(file)) !== "image") {
    throw new Error("Cover image signature not recognized.");
  }
  return PLAYLIST_IMAGE_EXT_BY_MIME[file.type] ?? "jpg";
}

function randomPlaylistCoverPath(ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return `playlist-${id}.${ext}`;
}

export interface SetPlaylistCoverInput {
  playlistId: string;
  file: File;
}

/**
 * Upload a playlist cover to the private `covers` bucket (stored as
 * `playlist-<uuid>.<ext>`) and point `playlists.cover_path` at it.
 * RLS on playlists (owner|admin write) enforces permission; the covers
 * bucket policy already permits these objects. On success the playlists /
 * playlist / search-playlists queries are invalidated so `useCoverUrl`
 * consumers resolve the new path.
 *
 * Usage: `const setCover = useSetPlaylistCover();`
 * `await setCover.mutateAsync({ playlistId, file });`
 */
export function useSetPlaylistCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playlistId,
      file,
    }: SetPlaylistCoverInput): Promise<void> => {
      const ext = await validatePlaylistCoverFile(file);
      const nextPath = randomPlaylistCoverPath(ext);
      const { data: current, error: readError } = await supabase
        .from("playlists")
        .select("cover_path")
        .eq("id", playlistId)
        .maybeSingle();
      if (readError) throw readError;
      const prevPath =
        (current as { cover_path: string | null } | null)?.cover_path ?? null;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(nextPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("playlists")
        .update({ cover_path: nextPath })
        .eq("id", playlistId);
      if (updateError) {
        await supabase.storage.from("covers").remove([nextPath]);
        throw updateError;
      }
      if (prevPath && prevPath !== nextPath) {
        await supabase.storage.from("covers").remove([prevPath]);
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({
        queryKey: ["playlist", vars.playlistId],
      });
      queryClient.invalidateQueries({ queryKey: ["search-playlists"] });
    },
  });
}

/** Add a track at position = max + 1 (owner or admin per RLS). */
export function useAddTrackToPlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trackId: string): Promise<void> => {
      const { data: existing, error: readError } = await supabase
        .from("playlist_tracks")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1);
      if (readError) throw readError;
      const next =
        existing && existing.length > 0
          ? (existing[0] as { position: number }).position + 1
          : 0;
      const { error } = await supabase
        .from("playlist_tracks")
        .insert({ playlist_id: playlistId, track_id: trackId, position: next });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-entries", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlist-counts"] });
    },
  });
}

/** Remove a track from a playlist (owner or admin per RLS). */
export function useRemoveTrackFromPlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trackId: string): Promise<void> => {
      const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("track_id", trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-entries", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlist-counts"] });
    },
  });
}

/** Move a track one step by swapping positions with its neighbor. */
export function useMoveTrackInPlaylist(playlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trackId,
      direction,
    }: {
      trackId: string;
      direction: -1 | 1;
    }): Promise<void> => {
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select("track_id,position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as { track_id: string; position: number }[];
      const index = rows.findIndex((r) => r.track_id === trackId);
      const neighbor = rows[index + direction];
      if (index < 0 || !neighbor) return;
      const current = rows[index];
      const first = await supabase
        .from("playlist_tracks")
        .update({ position: neighbor.position })
        .eq("playlist_id", playlistId)
        .eq("track_id", current.track_id);
      if (first.error) throw first.error;
      const second = await supabase
        .from("playlist_tracks")
        .update({ position: current.position })
        .eq("playlist_id", playlistId)
        .eq("track_id", neighbor.track_id);
      if (second.error) throw second.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-entries", playlistId] });
    },
  });
}
