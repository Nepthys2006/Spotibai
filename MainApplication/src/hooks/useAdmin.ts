import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../lib/AuthProvider.tsx";
import { supabase } from "../lib/supabase.ts";
import { useRole } from "./useSession.ts";

const AUDIO_MAX_BYTES = 50 * 1024 * 1024;
const COVER_MAX_BYTES = 5 * 1024 * 1024;

export const trackMetaSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  artist: z.string().trim().min(1, "Enter an artist").max(120),
  album: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined)),
  durationMs: z.coerce.number().int().positive("Enter a duration"),
});

export type TrackMeta = z.infer<typeof trackMetaSchema>;

const AUDIO_EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Sniff magic bytes; independent of extension/MIME. */
async function sniffKind(file: File): Promise<"audio" | "image" | null> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (offset: number, len: number): string => {
    let s = "";
    for (let i = offset; i < offset + len && i < buf.length; i++) {
      s += String.fromCharCode(buf[i] as number);
    }
    return s;
  };
  if (buf.length >= 2 && buf[0] === 0xff && ((buf[1] as number) & 0xe0) === 0xe0) {
    return "audio"; // MP3 frame sync
  }
  if (ascii(0, 3) === "ID3") return "audio";
  if (ascii(0, 4) === "OggS") return "audio";
  if (ascii(0, 4) === "fLaC") return "audio";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio";
  if (ascii(4, 4) === "ftyp") return "audio"; // MP4/M4A container
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

async function validateAudioFile(file: File): Promise<string> {
  if (!file.type.startsWith("audio/")) {
    throw new Error("Audio file must be an audio/* upload.");
  }
  if (file.size <= 0 || file.size > AUDIO_MAX_BYTES) {
    throw new Error("Audio file must be non-empty and at most 50 MB.");
  }
  if ((await sniffKind(file)) !== "audio") {
    throw new Error("Audio file signature not recognized.");
  }
  return AUDIO_EXT_BY_MIME[file.type] ?? "mp3";
}

async function validateCoverFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Cover must be an image/* upload.");
  }
  if (file.size <= 0 || file.size > COVER_MAX_BYTES) {
    throw new Error("Cover image must be non-empty and at most 5 MB.");
  }
  if ((await sniffKind(file)) !== "image") {
    throw new Error("Cover image signature not recognized.");
  }
  return IMAGE_EXT_BY_MIME[file.type] ?? "jpg";
}

function randomPath(ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return `${id}.${ext}`;
}

async function resolveArtistId(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("artists")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (data) return (data as { id: string }).id;
  const { data: created, error: insertError } = await supabase
    .from("artists")
    .insert({ name })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return (created as { id: string }).id;
}

async function resolveAlbumId(
  title: string | undefined,
  artistId: string,
): Promise<string | null> {
  if (!title) return null;
  const { data, error } = await supabase
    .from("albums")
    .select("id")
    .eq("title", title)
    .eq("artist_id", artistId)
    .maybeSingle();
  if (error) throw error;
  if (data) return (data as { id: string }).id;
  const { data: created, error: insertError } = await supabase
    .from("albums")
    .insert({ title, artist_id: artistId })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return (created as { id: string }).id;
}

export interface AdminTrack {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string | null;
  album_id: string | null;
  album_title: string | null;
  duration_ms: number | null;
  storage_path: string;
  cover_path: string | null;
}

export interface AdminUser {
  id: string;
  display_name: string | null;
  role: string | null;
  created_at: string | null;
}

/** Gate admin reads on session + ADMIN role (route guard + RLS enforce too). */
function useAdminGate(): { userId: string | null; enabled: boolean } {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  return { userId: user?.id ?? null, enabled: Boolean(user?.id) && isAdmin };
}

async function countOf(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function bucketBytes(bucket: string): Promise<number> {
  const PAGE_SIZE = 1000;
  let total = 0;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list("", { limit: PAGE_SIZE, offset });
    if (error) throw error;
    const page = data ?? [];
    for (const obj of page) {
      const size = (obj.metadata as { size?: unknown } | null)?.size;
      if (typeof size === "number") total += size;
    }
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AdminStats {
  tracks: number;
  artists: number;
  albums: number;
  users: number;
  playlists: number;
  storageBytes: number;
}

/** Usage stats via admin-visible SELECTs. */
export function useAdminStats() {
  const { enabled } = useAdminGate();
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const [tracks, artists, albums, users, playlists, audioBytes, coverBytes] =
        await Promise.all([
          countOf("tracks"),
          countOf("artists"),
          countOf("albums"),
          countOf("profiles"),
          countOf("playlists"),
          bucketBytes("audio"),
          bucketBytes("covers"),
        ]);
      return {
        tracks,
        artists,
        albums,
        users,
        playlists,
        storageBytes: audioBytes + coverBytes,
      };
    },
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

/** Full track list with artist/album names for the admin table. */
export function useAdminTracks() {
  const { enabled } = useAdminGate();
  return useQuery({
    queryKey: ["admin-tracks"],
    queryFn: async (): Promise<AdminTrack[]> => {
      const { data, error } = await supabase
        .from("tracks")
        .select(
          "id,title,artist_id,album_id,duration_ms,storage_path,cover_path,artists(name),albums(title)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        id: string;
        title: string;
        artist_id: string;
        album_id: string | null;
        duration_ms: number | null;
        storage_path: string;
        cover_path: string | null;
        artists: { name: string } | { name: string }[] | null;
        albums: { title: string } | { title: string }[] | null;
      }[];
      return rows.map((r) => {
        const artistRel = r.artists;
        const albumRel = r.albums;
        return {
          id: r.id,
          title: r.title,
          artist_id: r.artist_id,
          artist_name: artistRel
            ? Array.isArray(artistRel)
              ? (artistRel[0]?.name ?? null)
              : artistRel.name
            : null,
          album_id: r.album_id,
          album_title: albumRel
            ? Array.isArray(albumRel)
              ? (albumRel[0]?.title ?? null)
              : albumRel.title
            : null,
          duration_ms: r.duration_ms,
          storage_path: r.storage_path,
          cover_path: r.cover_path,
        };
      });
    },
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

/** User list for the admin roles table. */
export function useAdminUsers() {
  const { enabled } = useAdminGate();
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,role,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

export interface UploadInput {
  meta: TrackMeta;
  audio: File;
  cover?: File | null;
}

/** Upload audio (+optional cover), resolve artist/album, insert tracks row. */
export function useUploadTrack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meta, audio, cover }: UploadInput): Promise<void> => {
      if (!user?.id) throw new Error("You must be signed in.");
      const audioExt = await validateAudioFile(audio);
      const coverExt = cover ? await validateCoverFile(cover) : null;
      const audioPath = randomPath(audioExt);
      const { error: audioError } = await supabase.storage
        .from("audio")
        .upload(audioPath, audio, { contentType: audio.type, upsert: false });
      if (audioError) throw audioError;
      let coverPath: string | null = null;
      if (cover && coverExt) {
        coverPath = randomPath(coverExt);
        const { error: coverError } = await supabase.storage
          .from("covers")
          .upload(coverPath, cover, {
            contentType: cover.type,
            upsert: false,
          });
        if (coverError) {
          await supabase.storage.from("audio").remove([audioPath]);
          throw coverError;
        }
      }
      try {
        const artistId = await resolveArtistId(meta.artist);
        const albumId = await resolveAlbumId(meta.album, artistId);
        const durationMs =
          meta.durationMs < 1000 ? meta.durationMs * 1000 : meta.durationMs;
        const { error: insertError } = await supabase.from("tracks").insert({
          title: meta.title,
          artist_id: artistId,
          album_id: albumId,
          duration_ms: durationMs,
          storage_path: audioPath,
          cover_path: coverPath,
          uploaded_by: user.id,
        });
        if (insertError) throw insertError;
      } catch (err) {
        await supabase.storage.from("audio").remove([audioPath]);
        if (coverPath) {
          await supabase.storage.from("covers").remove([coverPath]);
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export interface UpdateTrackInput {
  id: string;
  meta: TrackMeta;
}

/** Edit track metadata (artist/album resolved like upload). */
export function useUpdateTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, meta }: UpdateTrackInput): Promise<void> => {
      const artistId = await resolveArtistId(meta.artist);
      const albumId = await resolveAlbumId(meta.album, artistId);
      const durationMs =
        meta.durationMs < 1000 ? meta.durationMs * 1000 : meta.durationMs;
      const { error } = await supabase
        .from("tracks")
        .update({
          title: meta.title,
          artist_id: artistId,
          album_id: albumId,
          duration_ms: durationMs,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

/** Delete a track row and its storage objects. */
export function useDeleteTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (track: AdminTrack): Promise<void> => {
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", track.id);
      if (error) throw error;
      await supabase.storage.from("audio").remove([track.storage_path]);
      if (track.cover_path) {
        await supabase.storage.from("covers").remove([track.cover_path]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

/** Promote/demote via the promote-user Edge Function (service_role inside). */
export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetUserId,
      role,
    }: {
      targetUserId: string;
      role: "ADMIN" | "USER";
    }): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("promote-user", {
        body: { targetUserId, role },
      });
      if (error) throw new Error(error.message);
      const body = data as { ok?: boolean; error?: string } | null;
      if (body && body.ok === false) {
        throw new Error(body.error ?? "Role change failed.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
