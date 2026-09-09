import { create } from "zustand";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: string[];
  currentId: string | null;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  setQueue: (ids: string[]) => void;
  setCurrentId: (id: string | null) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  clear: () => void;
}

/**
 * Player store skeleton (Phase 2).
 * Paused by default. No audio element, no fetching.
 * Phase 4 wires the audio engine behind these same fields.
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  queue: [],
  currentId: null,
  isPlaying: false,
  volume: 0.8,
  shuffle: false,
  repeat: "off",
  setQueue: (ids) => set({ queue: ids }),
  setCurrentId: (id) => set({ currentId: id }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),
  clear: () => set({ queue: [], currentId: null, isPlaying: false }),
}));
