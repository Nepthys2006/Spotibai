import { create } from "zustand";
import {
  applyVolume,
  fetchTracksByIds,
  loadAndPlay,
  pauseAudio,
  playLoaded,
  resetPosition,
  seekAudio,
  unloadAudio,
  type EngineTrack,
} from "../lib/audioEngine.ts";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: string[];
  currentId: string | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** UI-only: queue sheet visibility (feel pass, no audio). */
  queueOpen: boolean;
  /** UI-only display state in ms (engine will drive these). */
  progressMs: number;
  durationMs: number;
  /** Last engine failure for UI surfacing; never thrown through render. */
  playerError: string | null;
  setQueue: (ids: string[]) => void;
  setCurrentId: (id: string | null) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleQueueOpen: () => void;
  setProgressMs: (ms: number) => void;
  setDurationMs: (ms: number) => void;
  clearPlayerError: () => void;
  /** Seek in seconds, clamped to 0..duration. */
  seekTo: (sec: number) => void;
  /** Feel-only: load ids + jump to index, no audio. Engine keeps signature. */
  playQueue: (ids: string[], index?: number) => void;
  /** Feel-only: jump within current queue, no audio. */
  jumpTo: (id: string) => void;
  next: () => void;
  prev: () => void;
  clear: () => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Playback failed.";
}

/** Load one id in the background; park on failure instead of throwing. */
function voidLoad(id: string): void {
  void (async () => {
    try {
      const tracks = await fetchTracksByIds([id]);
      const track = tracks.get(id);
      if (!track) throw new Error("Track unavailable.");
      if (usePlayerStore.getState().currentId !== id) return;
      await loadAndPlay(track);
      if (usePlayerStore.getState().currentId !== id) {
        pauseAudio();
        return;
      }
      usePlayerStore.setState({ isPlaying: true });
    } catch (err) {
      if (usePlayerStore.getState().currentId === id) {
        usePlayerStore.setState({
          isPlaying: false,
          playerError: errorMessage(err),
        });
      }
    }
  })();
}

function pickRandom(queue: string[], currentId: string | null): string {
  if (queue.length === 1) return queue[0] as string;
  let pick = currentId;
  while (pick === currentId) {
    pick = queue[Math.floor(Math.random() * queue.length)] as string;
  }
  return pick as string;
}

/**
 * Player store (Phase 4): same signatures as the feel pass, now driving
 * the audio engine. play() only ever fires from these explicit
 * user-gesture actions (or the post-playback ended chain).
 */
export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentId: null,
  isPlaying: false,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queueOpen: false,
  progressMs: 0,
  durationMs: 0,
  playerError: null,
  setQueue: (ids) => set({ queue: ids }),
  setCurrentId: (id) => set({ currentId: id }),
  togglePlay: () => {
    const { queue, currentId, isPlaying } = get();
    if (queue.length === 0 || !currentId) return;
    if (isPlaying) {
      pauseAudio();
      set({ isPlaying: false });
      return;
    }
    set({ playerError: null });
    void (async () => {
      try {
        const tracks = await fetchTracksByIds([currentId]);
        const track = tracks.get(currentId);
        if (get().currentId !== currentId) return;
        if (track) {
          await loadAndPlay(track);
        } else {
          await playLoaded();
        }
        if (get().currentId !== currentId) {
          pauseAudio();
          return;
        }
        set({ isPlaying: true });
      } catch (err) {
        if (get().currentId === currentId) {
          set({ isPlaying: false, playerError: errorMessage(err) });
        }
      }
    })();
  },
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => {
    const v = Math.min(1, Math.max(0, volume));
    const muted = v === 0;
    set({ volume: v, muted });
    applyVolume(v, muted);
  },
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  setQueueOpen: (open) => set({ queueOpen: open }),
  toggleQueueOpen: () => set((s) => ({ queueOpen: !s.queueOpen })),
  setProgressMs: (ms) => {
    const { durationMs } = get();
    const clamped =
      durationMs > 0
        ? Math.min(Math.max(ms, 0), durationMs)
        : Math.max(0, ms);
    set({ progressMs: clamped });
    seekAudio(clamped);
  },
  setDurationMs: (ms) => set({ durationMs: Math.max(0, ms) }),
  clearPlayerError: () => set({ playerError: null }),
  seekTo: (sec) => {
    get().setProgressMs(sec * 1000);
  },
  playQueue: (ids, index = 0) => {
    if (ids.length === 0) {
      unloadAudio();
      set({
        queue: [],
        currentId: null,
        isPlaying: false,
        progressMs: 0,
        playerError: null,
      });
      return;
    }
    const at = Math.min(Math.max(index, 0), ids.length - 1);
    const id = ids[at] as string;
    set({
      queue: ids,
      currentId: id,
      isPlaying: true,
      progressMs: 0,
      playerError: null,
    });
    void (async () => {
      try {
        const tracks = await fetchTracksByIds(ids);
        let track: EngineTrack | undefined = tracks.get(id);
        let targetId = id;
        if (!track) {
          const fallback = ids
            .map((candidate) => tracks.get(candidate))
            .find((t): t is EngineTrack => t !== undefined);
          if (!fallback) throw new Error("Tracks unavailable.");
          track = fallback;
          targetId = fallback.id;
          set({ currentId: targetId });
        }
        if (get().currentId !== targetId) return;
        await loadAndPlay(track);
        if (get().currentId !== targetId) {
          pauseAudio();
          return;
        }
        set({ isPlaying: true });
      } catch (err) {
        set({ isPlaying: false, playerError: errorMessage(err) });
      }
    })();
  },
  jumpTo: (id) => {
    const { queue } = get();
    if (!queue.includes(id)) return;
    set({ currentId: id, isPlaying: true, progressMs: 0, playerError: null });
    voidLoad(id);
  },
  next: () => {
    const { queue, currentId, shuffle, repeat } = get();
    if (queue.length === 0) return;
    let target: string;
    if (shuffle) {
      target = pickRandom(queue, currentId);
    } else {
      const i = queue.indexOf(currentId ?? "");
      const ni = i < 0 ? 0 : i + 1;
      if (ni >= queue.length) {
        if (repeat === "all") {
          target = queue[0] as string;
        } else {
          pauseAudio();
          resetPosition();
          set({ isPlaying: false, progressMs: 0 });
          return;
        }
      } else {
        target = queue[ni] as string;
      }
    }
    set({
      currentId: target,
      isPlaying: true,
      progressMs: 0,
      playerError: null,
    });
    voidLoad(target);
  },
  prev: () => {
    const { queue, currentId, shuffle, repeat } = get();
    if (queue.length === 0) return;
    if (shuffle) {
      const target = pickRandom(queue, currentId);
      set({
        currentId: target,
        isPlaying: true,
        progressMs: 0,
        playerError: null,
      });
      voidLoad(target);
      return;
    }
    const i = queue.indexOf(currentId ?? "");
    const ni = i < 0 ? 0 : i - 1;
    if (ni < 0) {
      if (repeat === "all") {
        const target = queue[queue.length - 1] as string;
        set({
          currentId: target,
          isPlaying: true,
          progressMs: 0,
          playerError: null,
        });
        voidLoad(target);
      } else {
        set({ progressMs: 0, playerError: null });
        resetPosition();
      }
      return;
    }
    const target = queue[ni] as string;
    set({
      currentId: target,
      isPlaying: true,
      progressMs: 0,
      playerError: null,
    });
    voidLoad(target);
  },
  clear: () => {
    unloadAudio();
    set({
      queue: [],
      currentId: null,
      isPlaying: false,
      progressMs: 0,
      playerError: null,
    });
  },
}));
