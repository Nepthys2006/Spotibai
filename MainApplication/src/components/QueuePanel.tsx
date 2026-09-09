import { useEffect } from "react";
import { usePlayerStore } from "../store/playerStore.ts";

/**
 * Queue sheet — feel only (Phase 4).
 * Lists ids from the store queue, highlights current,
 * whole row is a 44px+ tap-to-jump button. No audio, no fetching.
 * Engine hydrates rows with catalog titles later; ids stay the key.
 */
export function QueuePanel() {
  const {
    queue,
    queueOpen,
    setQueueOpen,
    currentId,
    isPlaying,
    jumpTo,
    clear,
    volume,
    setVolume,
  } = usePlayerStore();

  useEffect(() => {
    if (!queueOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQueueOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueOpen, setQueueOpen]);

  if (!queueOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close queue"
        onClick={() => setQueueOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-black/60"
      />
      <section
        role="dialog"
        aria-label="Queue"
        aria-modal="false"
        className="queue-sheet fixed inset-x-3 bottom-56 z-50 flex max-h-[46vh] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl sm:left-auto sm:right-6 sm:w-[380px] md:bottom-24"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="text-sm font-semibold text-neutral-100">Up next</h2>
            <p className="truncate text-xs text-muted">
              {queue.length === 0
                ? "Queue is empty"
                : `${queue.length} in line · tap a row to jump`}
            </p>
          </div>
          {queue.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="flex min-h-11 items-center rounded-full px-4 text-xs font-medium text-muted transition-colors hover:text-neutral-100"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            aria-label="Close queue"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-semibold text-neutral-100">
              Nothing lined up
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Play a playlist or liked list and the order shows here. Jumping
              around works before sound lands.
            </p>
          </div>
        ) : (
          <ol className="min-h-0 flex-1 overflow-y-auto p-2">
            {queue.map((id, i) => {
              const active = id === currentId;
              return (
                <li key={`${id}-${i}`}>
                  <button
                    type="button"
                    onClick={() => jumpTo(id)}
                    aria-current={active ? "true" : undefined}
                    aria-label={`Play track ${id.slice(0, 8)}, position ${i + 1}`}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-elevated text-neutral-100"
                        : "text-neutral-200 hover:bg-elevated"
                    }`}
                  >
                    <span
                      className={`w-6 shrink-0 text-right text-xs tabular-nums ${active ? "text-accent" : "text-muted"}`}
                    >
                      {i + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        active ? "bg-accent text-black" : "bg-elevated text-muted"
                      }`}
                    >
                      {active ? (isPlaying ? "❚❚" : "▶") : "♪"}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-medium">
                        Track {id.slice(0, 8)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {active
                          ? "Now playing · titles land with engine"
                          : `Up next · position ${i + 1}`}
                      </span>
                    </span>
                    {active ? (
                      <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        Now
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted">Play</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex items-center gap-2 border-t border-line px-4 py-2 md:hidden">
          <span aria-hidden="true" className="text-xs text-muted">
            Vol
          </span>
          <label htmlFor="queue-volume" className="sr-only">
            Volume
          </label>
          <input
            id="queue-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-11 w-full cursor-pointer"
          />
        </div>
      </section>
    </>
  );
}
