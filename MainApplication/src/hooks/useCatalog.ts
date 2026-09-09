import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthProvider.tsx";
import { supabase } from "../lib/supabase.ts";

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string | null;
  artist_name: string | null;
}

export interface Track {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  duration_ms: number | null;
  artist_name: string | null;
  album_title: string | null;
}

interface RawTrack {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  duration_ms: number | null;
  artists: { name: string } | { name: string }[] | null;
  albums: { title: string } | { title: string }[] | null;
}

function pickName(
  rel: { name: string } | { name: string }[] | null,
): string | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.name ?? null) : rel.name;
}

function pickTitle(
  rel: { title: string } | { title: string }[] | null,
): string | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.title ?? null) : rel.title;
}

function toTrack(row: RawTrack): Track {
  return {
    id: row.id,
    title: row.title,
    artist_id: row.artist_id,
    album_id: row.album_id,
    duration_ms: row.duration_ms,
    artist_name: pickName(row.artists),
    album_title: pickTitle(row.albums),
  };
}

const TRACK_SELECT =
  "id,title,artist_id,album_id,duration_ms,artists(name),albums(title)";

async function fetchTracks(limit: number): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as RawTrack[]).map(toTrack);
}

/** Recent tracks, ordered newest first. Empty array when catalog is empty. */
export function useTracks(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tracks", limit],
    queryFn: () => fetchTracks(limit),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: 1,
  });
}

async function fetchArtists(limit: number): Promise<Artist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id,name,bio")
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Artist[];
}

/** Artists ordered by name. Empty array when catalog is empty. */
export function useArtists(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["artists", limit],
    queryFn: () => fetchArtists(limit),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: 1,
  });
}

async function fetchAlbums(limit: number): Promise<Album[]> {
  const { data, error } = await supabase
    .from("albums")
    .select("id,title,artist_id,artists(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    artist_id: string | null;
    artists: { name: string } | { name: string }[] | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist_id: r.artist_id,
    artist_name: pickName(r.artists),
  }));
}

/** Albums ordered newest first. Empty array when catalog is empty. */
export function useAlbums(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["albums", limit],
    queryFn: () => fetchAlbums(limit),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: 1,
  });
}

export interface ArtistDetail {
  artist: Artist | null;
  albums: Album[];
  tracks: Track[];
}

async function fetchArtistDetail(artistId: string): Promise<ArtistDetail> {
  const [artistRes, albumsRes, tracksRes] = await Promise.all([
    supabase
      .from("artists")
      .select("id,name,bio")
      .eq("id", artistId)
      .maybeSingle(),
    supabase
      .from("albums")
      .select("id,title,artist_id,artists(name)")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tracks")
      .select(TRACK_SELECT)
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (artistRes.error) throw artistRes.error;
  if (albumsRes.error) throw albumsRes.error;
  if (tracksRes.error) throw tracksRes.error;
  const albumRows = (albumsRes.data ?? []) as unknown as {
    id: string;
    title: string;
    artist_id: string | null;
    artists: { name: string } | { name: string }[] | null;
  }[];
  return {
    artist: (artistRes.data as Artist | null) ?? null,
    albums: albumRows.map((r) => ({
      id: r.id,
      title: r.title,
      artist_id: r.artist_id,
      artist_name: pickName(r.artists),
    })),
    tracks: ((tracksRes.data ?? []) as unknown as RawTrack[]).map(toTrack),
  };
}

/** Artist detail: row + albums + tracks. Null artist when missing. */
export function useArtistDetail(artistId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["artist-detail", artistId],
    queryFn: () => fetchArtistDetail(artistId!),
    enabled: Boolean(user?.id) && Boolean(artistId),
    staleTime: 30_000,
    retry: 1,
  });
}

export interface AlbumDetail {
  album: Album | null;
  tracks: Track[];
}

async function fetchAlbumDetail(albumId: string): Promise<AlbumDetail> {
  const [albumRes, tracksRes] = await Promise.all([
    supabase
      .from("albums")
      .select("id,title,artist_id,artists(name)")
      .eq("id", albumId)
      .maybeSingle(),
    supabase
      .from("tracks")
      .select(TRACK_SELECT)
      .eq("album_id", albumId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (albumRes.error) throw albumRes.error;
  if (tracksRes.error) throw tracksRes.error;
  const row = albumRes.data as unknown as {
    id: string;
    title: string;
    artist_id: string | null;
    artists: { name: string } | { name: string }[] | null;
  } | null;
  return {
    album: row
      ? {
          id: row.id,
          title: row.title,
          artist_id: row.artist_id,
          artist_name: pickName(row.artists),
        }
      : null,
    tracks: ((tracksRes.data ?? []) as unknown as RawTrack[]).map(toTrack),
  };
}

/** Album detail: row + tracks. Null album when missing. */
export function useAlbumDetail(albumId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["album-detail", albumId],
    queryFn: () => fetchAlbumDetail(albumId!),
    enabled: Boolean(user?.id) && Boolean(albumId),
    staleTime: 30_000,
    retry: 1,
  });
}

async function fetchTrackRow(trackId: string): Promise<Track | null> {
  const { data, error } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .eq("id", trackId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toTrack(data as unknown as RawTrack);
}

/** Single track row with artist/album names. Null when missing. */
export function useTrackRow(trackId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["track", trackId],
    queryFn: () => fetchTrackRow(trackId!),
    enabled: Boolean(user?.id) && Boolean(trackId),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Debounce a fast-changing value (search input). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Escape LIKE wildcards so user text matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/([%_\\])/g, "\\$1");
}

async function searchTracks(term: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .ilike("title", `%${escapeLike(term)}%`)
    .order("title", { ascending: true })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as unknown as RawTrack[]).map(toTrack);
}

async function searchArtists(term: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select("id,name,bio")
    .ilike("name", `%${escapeLike(term)}%`)
    .order("name", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Artist[];
}

async function searchAlbums(term: string): Promise<Album[]> {
  const { data, error } = await supabase
    .from("albums")
    .select("id,title,artist_id,artists(name)")
    .ilike("title", `%${escapeLike(term)}%`)
    .order("title", { ascending: true })
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    artist_id: string | null;
    artists: { name: string } | { name: string }[] | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist_id: r.artist_id,
    artist_name: pickName(r.artists),
  }));
}

/**
 * Catalog search: 3 parallel ilike queries (track title, artist name,
 * album title), debounced by the caller. Disabled until session + non-empty.
 */
export function useCatalogSearch(term: string) {
  const { user } = useAuth();
  const active = term.trim().length > 0;
  const enabled = Boolean(user?.id) && active;
  const tracks = useQuery({
    queryKey: ["search-tracks", term],
    queryFn: () => searchTracks(term.trim()),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
  const artists = useQuery({
    queryKey: ["search-artists", term],
    queryFn: () => searchArtists(term.trim()),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
  const albums = useQuery({
    queryKey: ["search-albums", term],
    queryFn: () => searchAlbums(term.trim()),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
  return { tracks, artists, albums };
}

/** Format duration_ms as m:ss; "—" when unknown. */
export function formatDuration(durationMs: number | null | undefined): string {
  if (durationMs == null || durationMs <= 0) return "—";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
