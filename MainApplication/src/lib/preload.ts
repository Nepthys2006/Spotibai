import { usePlayerStore } from "../store/playerStore.ts";
import { unloadAudio } from "./audioEngine.ts";
import { supabase } from "./supabase.ts";

/**
 * Predictive preload (Phase 4): buffering only, never play().
 * Subscribes to the same supabase auth events as AuthProvider (no UI).
 * After a session is established, warms up to 5 likely tracks with hidden
 * Audio(preload='auto') elements pointed at fresh signed URLs. Warmers are
 * dropped after 10 minutes or on logout.
 */

const MAX_WARM = 5;
const DROP_AFTER_MS = 10 * 60 * 1000;

let warmers: HTMLAudioElement[] = [];
let dropTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Start listening for session events. Call once at app boot. */
export function initPredictivePreload(): void {
  if (started) return;
  started = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      void warmLikelyTracks(session.user.id);
    } else {
      // Single reliable SIGNED_OUT teardown: warmers, engine source +
      // signed-URL cache, and queue — covers logout, expiry, remote revoke.
      dropWarmers();
      unloadAudio();
      usePlayerStore.getState().clear();
    }
  });
}

/** Release every warmer (logout, expiry, or refresh). */
export function dropWarmers(): void {
  if (dropTimer) {
    clearTimeout(dropTimer);
    dropTimer = null;
  }
  for (const el of warmers) {
    try {
      el.pause();
      el.removeAttribute("src");
      el.load();
    } catch {
      /* already released */
    }
  }
  warmers = [];
}

async function signPath(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("audio")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

function collectPaths(rows: unknown): string[] {
  const out: string[] = [];
  const list = (rows ?? []) as { tracks?: { storage_path?: unknown } | null }[];
  for (const row of list) {
    const p = row.tracks?.storage_path;
    if (typeof p === "string" && p) out.push(p);
  }
  return out;
}

async function warmLikelyTracks(userId: string): Promise<void> {
  dropWarmers();
  try {
    const paths: string[] = [];

    // 1. Liked Songs first.
    const liked = await supabase
      .from("liked_tracks")
      .select("track_id,tracks(storage_path)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_WARM);
    if (!liked.error) paths.push(...collectPaths(liked.data));

    // 2. Then most-recent playlist entries.
    if (paths.length < MAX_WARM) {
      const lists = await supabase
        .from("playlists")
        .select("id")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!lists.error) {
        const ids = ((lists.data ?? []) as { id: string }[]).map((r) => r.id);
        if (ids.length > 0) {
          const entries = await supabase
            .from("playlist_tracks")
            .select("track_id,tracks(storage_path)")
            .in("playlist_id", ids)
            .order("position", { ascending: true })
            .limit(MAX_WARM);
          if (!entries.error) paths.push(...collectPaths(entries.data));
        }
      }
    }

    // 3. Fallback: newest catalog tracks.
    if (paths.length < MAX_WARM) {
      const recent = await supabase
        .from("tracks")
        .select("storage_path")
        .order("created_at", { ascending: false })
        .limit(MAX_WARM);
      if (!recent.error) {
        for (const row of (recent.data ?? []) as { storage_path?: unknown }[]) {
          if (typeof row.storage_path === "string" && row.storage_path) {
            paths.push(row.storage_path);
          }
        }
      }
    }

    for (const path of [...new Set(paths)].slice(0, MAX_WARM)) {
      const url = await signPath(path);
      if (!url) continue;
      const el = new Audio();
      el.preload = "auto";
      el.muted = true;
      el.src = url;
      warmers.push(el);
    }
    if (warmers.length > 0) {
      dropTimer = setTimeout(dropWarmers, DROP_AFTER_MS);
    }
  } catch {
    dropWarmers();
  }
}
