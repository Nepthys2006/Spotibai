import { usePlayerStore } from "../store/playerStore.ts";
import { supabase } from "./supabase.ts";

/**
 * Audio engine singleton (Phase 4).
 * One hidden HTMLAudioElement, never in JSX. play() is only ever called
 * from explicit user-gesture store actions (or the post-playback ended
 * chain, which inherits the gesture). No autoplay anywhere.
 * Signed URLs are short-lived (3600s) and never cached past expiry.
 */

export interface EngineTrack {
  id: string;
  title: string;
  artist_name: string | null;
  album_title: string | null;
  storage_path: string;
}

const TRACK_SELECT =
  "id,title,storage_path,artists(name),albums(title)";
const URL_TTL_SECONDS = 3600;
const EXPIRY_MARGIN_MS = 60_000;
const SEEK_EPSILON_MS = 350;

let audio: HTMLAudioElement | null = null;
let currentTrackId: string | null = null;
let refreshRetried = false;
const urlCache = new Map<string, { url: string; expiresAt: number }>();

function pickName(
  rel: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.name ?? null) : rel.name;
}

function pickTitle(
  rel: { title: string } | { title: string }[] | null | undefined,
): string | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.title ?? null) : rel.title;
}

/** Batch-resolve ids to playable tracks (hook-free twin of useTrackRow). */
export async function fetchTracksByIds(
  ids: string[],
): Promise<Map<string, EngineTrack>> {
  const out = new Map<string, EngineTrack>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return out;
  const { data, error } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .in("id", unique);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    storage_path: string;
    artists: { name: string } | { name: string }[] | null;
    albums: { title: string } | { title: string }[] | null;
  }[];
  for (const r of rows) {
    if (!r.storage_path) continue;
    out.set(r.id, {
      id: r.id,
      title: r.title,
      artist_name: pickName(r.artists),
      album_title: pickTitle(r.albums),
      storage_path: r.storage_path,
    });
  }
  return out;
}

/** Fresh signed URL for a storage path (short TTL, never cached past expiry). */
export async function signedAudioUrl(track: EngineTrack): Promise<string> {
  const hit = urlCache.get(track.id);
  if (hit && Date.now() < hit.expiresAt) return hit.url;
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(track.storage_path, URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error instanceof Error ? error : new Error("Could not sign audio.");
  }
  urlCache.set(track.id, {
    url: data.signedUrl,
    expiresAt: Date.now() + URL_TTL_SECONDS * 1000 - EXPIRY_MARGIN_MS,
  });
  return data.signedUrl;
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = "auto";
  el.addEventListener("timeupdate", () => {
    usePlayerStore.setState({ progressMs: el.currentTime * 1000 });
  });
  el.addEventListener("loadedmetadata", () => {
    usePlayerStore.setState({
      durationMs: Number.isFinite(el.duration) ? el.duration * 1000 : 0,
    });
  });
  el.addEventListener("error", () => {
    void (async () => {
      const id = currentTrackId;
      if (!id || refreshRetried) {
        usePlayerStore.setState({
          isPlaying: false,
          playerError: "Playback failed.",
        });
        return;
      }
      refreshRetried = true;
      try {
        urlCache.delete(id);
        const tracks = await fetchTracksByIds([id]);
        const track = tracks.get(id);
        if (!track || currentTrackId !== id) return;
        el.src = await signedAudioUrl(track);
        await el.play();
      } catch {
        usePlayerStore.setState({
          isPlaying: false,
          playerError: "Playback failed.",
        });
      }
    })();
  });
  el.addEventListener("ended", () => {
    // Post-playback advance inherits the playback gesture; failures park.
    try {
      const repeat = usePlayerStore.getState().repeat;
      if (repeat === "one") {
        el.currentTime = 0;
        usePlayerStore.setState({ progressMs: 0 });
        void el.play().catch(() => {
          usePlayerStore.setState({ isPlaying: false });
        });
        return;
      }
      usePlayerStore.getState().next();
    } catch {
      usePlayerStore.setState({ isPlaying: false });
    }
  });
  audio = el;
  return el;
}

/** Load a track's signed URL and play. Throws on failure (store catches). */
export async function loadAndPlay(track: EngineTrack): Promise<void> {
  const el = ensureAudio();
  refreshRetried = false;
  if (el.src && currentTrackId === track.id && el.currentTime > 0) {
    applyVolume(
      usePlayerStore.getState().volume,
      usePlayerStore.getState().muted,
    );
    await el.play();
    return;
  }
  currentTrackId = track.id;
  el.src = await signedAudioUrl(track);
  applyVolume(
    usePlayerStore.getState().volume,
    usePlayerStore.getState().muted,
  );
  try {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist_name ?? undefined,
        album: track.album_title ?? undefined,
      });
    }
  } catch {
    /* metadata is best-effort */
  }
  await el.play();
}

/** Pause without unloading (resume keeps position). */
export function pauseAudio(): void {
  audio?.pause();
}

/** Resume the loaded source, if any. Throws when nothing is loaded. */
export async function playLoaded(): Promise<void> {
  const el = audio;
  if (!el || !el.src || !currentTrackId) {
    throw new Error("Nothing to play.");
  }
  await el.play();
}

/** Stop and forget the current source. */
export function unloadAudio(): void {
  if (!audio) {
    currentTrackId = null;
    return;
  }
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentTrackId = null;
  refreshRetried = false;
}

/** Apply store volume/muted to the element. */
export function applyVolume(volume: number, muted: boolean): void {
  if (!audio) return;
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.muted = muted;
}

/** Seek the element; no-op until a source is loaded. */
export function seekAudio(ms: number): void {
  if (!audio || !audio.src) return;
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  if (Math.abs(audio.currentTime * 1000 - ms) <= SEEK_EPSILON_MS) return;
  audio.currentTime = Math.min(Math.max(ms, 0), audio.duration * 1000) / 1000;
}

/** Reset element position to 0 (stop-at-end resume restarts the track). */
export function resetPosition(): void {
  if (!audio || !audio.src) return;
  try {
    audio.currentTime = 0;
  } catch {
    /* no source yet */
  }
}
