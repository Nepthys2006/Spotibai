import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/AuthProvider.tsx";
import { supabase } from "../lib/supabase.ts";
import type { Track } from "./useCatalog.ts";

export interface LikedSong {
  track_id: string;
  created_at: string;
  track: Track | null;
}

/** Liked track ids for the session user (drives track-row like state). */
export function useLikedTrackIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["likes", user?.id ?? "anon"],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("liked_tracks")
        .select("track_id");
      if (error) throw error;
      return new Set(((data ?? []) as { track_id: string }[]).map((r) => r.track_id));
    },
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    retry: 1,
  });
}

/** Liked songs list with track row data. Empty when none liked. */
export function useLikedSongs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["liked-songs", user?.id ?? "anon"],
    queryFn: async (): Promise<LikedSong[]> => {
      const { data, error } = await supabase
        .from("liked_tracks")
        .select(
          "track_id,created_at,tracks(id,title,artist_id,album_id,duration_ms,artists(name),albums(title))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        track_id: string;
        created_at: string;
        tracks: {
          id: string;
          title: string;
          artist_id: string;
          album_id: string | null;
          duration_ms: number | null;
          artists: { name: string } | { name: string }[] | null;
          albums: { title: string } | { title: string }[] | null;
        } | null;
      }[];
      return rows.map((r) => {
        const t = r.tracks;
        const artistRel = t?.artists ?? null;
        const albumRel = t?.albums ?? null;
        return {
          track_id: r.track_id,
          created_at: r.created_at,
          track: t
            ? {
                id: t.id,
                title: t.title,
                artist_id: t.artist_id,
                album_id: t.album_id,
                duration_ms: t.duration_ms,
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
      });
    },
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    retry: 1,
  });
}

/**
 * Toggle a liked_tracks row; user_id is always set explicitly to the
 * session user. Pass the current liked state to choose insert vs delete.
 */
export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      trackId,
      liked,
    }: {
      trackId: string;
      liked: boolean;
    }): Promise<void> => {
      if (!user?.id) throw new Error("You must be signed in.");
      if (liked) {
        const { error } = await supabase
          .from("liked_tracks")
          .delete()
          .eq("user_id", user.id)
          .eq("track_id", trackId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("liked_tracks")
          .insert({ user_id: user.id, track_id: trackId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      queryClient.invalidateQueries({ queryKey: ["liked-songs"] });
    },
  });
}
