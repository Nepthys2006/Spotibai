import { usePlayerStore } from "../store/playerStore.ts";

/**
 * Persistent player bar — visual placeholder only (Phase 2).
 * No <audio>, no autoplay. Phase 4 wires the engine behind the store.
 */
export function PlayerBar() {
  const { isPlaying, togglePlay, volume, setVolume, shuffle, toggleShuffle, repeat, cycleRepeat } =
    usePlayerStore();

  return (
    <footer
      aria-label="Player"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-3 py-2 sm:px-5"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-elevated text-sm font-bold text-muted"
          >
            ♪
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-neutral-100">
              Nothing playing yet
            </p>
            <p className="truncate text-xs text-muted">
              Pick a track once catalog wiring lands
            </p>
          </div>
          <button
            type="button"
            aria-label="Like current track"
            title="Like (wires in Phase 3)"
            className="ml-1 rounded-full p-2 text-muted hover:text-neutral-100"
          >
            ♡
          </button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
              className={`rounded-full p-2 text-sm ${shuffle ? "text-accent" : "text-muted hover:text-neutral-100"}`}
            >
              ⇄
            </button>
            <button
              type="button"
              aria-label="Previous track"
              title="Previous (wires in Phase 4)"
              className="rounded-full p-2 text-muted hover:text-neutral-100"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-base text-black hover:bg-accent"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              aria-label="Next track"
              title="Next (wires in Phase 4)"
              className="rounded-full p-2 text-muted hover:text-neutral-100"
            >
              ⏭
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat}`}
              aria-pressed={repeat !== "off"}
              title={`Repeat: ${repeat}`}
              className={`rounded-full p-2 text-sm ${repeat !== "off" ? "text-accent" : "text-muted hover:text-neutral-100"}`}
            >
              ↻
            </button>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[11px] tabular-nums text-muted">0:00</span>
            <label htmlFor="player-seek" className="sr-only">
              Seek
            </label>
            <input
              id="player-seek"
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              className="w-48 lg:w-72"
            />
            <span className="text-[11px] tabular-nums text-muted">0:00</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex">
          <button
            type="button"
            aria-label="Queue"
            title="Queue (wires in Phase 4)"
            className="rounded-full p-2 text-muted hover:text-neutral-100"
          >
            ☰
          </button>
          <label htmlFor="player-volume" className="sr-only">
            Volume
          </label>
          <input
            id="player-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-24"
          />
        </div>
      </div>
    </footer>
  );
}
