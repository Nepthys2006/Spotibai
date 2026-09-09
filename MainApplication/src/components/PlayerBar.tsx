import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePlayerStore } from "../store/playerStore.ts";
import { useTrackRow } from "../hooks/useCatalog.ts";
import { useCoverUrl } from "../lib/coverArt.ts";
import { Icon } from "./icons.tsx";

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const btn44 =
  "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100";

/**
 * Persistent player bar — feel only (Phase 4).
 * No <audio>, no autoplay, no signed URLs.
 * All controls call the existing Zustand interface; the engine
 * keeps these signatures and drives progress/duration for real.
 * Renders nothing while idle (no track or queue loaded); the full
 * bar mounts once a queue starts, paused or playing.
 */
export function PlayerBar() {
  const {
    queue,
    currentId,
    isPlaying,
    togglePlay,
    volume,
    setVolume,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    next,
    prev,
    queueOpen,
    toggleQueueOpen,
    progressMs,
    durationMs,
    setProgressMs,
    playerError,
    clearPlayerError,
    jumpTo,
  } = usePlayerStore();

  const hasQueue = queue.length > 0;
  const isIdle = !hasQueue && !currentId;
  const pos = currentId ? queue.indexOf(currentId) : -1;
  const shortId = currentId ? currentId.slice(0, 8) : null;
  const seekMax = durationMs > 0 ? durationMs : 100;
  const seekValue = durationMs > 0 ? Math.min(progressMs, durationMs) : 0;
  const currentTrackQuery = useTrackRow(currentId ?? undefined);
  const signedCover = useCoverUrl(currentTrackQuery.data?.cover_path ?? null);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [signedCover]);
  const showCover = Boolean(signedCover) && !imgFailed;

  // Idle: nothing loaded, so there is nothing to pause, seek, or queue.
  // Stay unmounted so the bottom stack (and its content offset) is just
  // the mobile nav; keep surfacing an error if one is somehow present.
  if (isIdle && !playerError) return null;

  return (
    <footer
      aria-label="Player"
      className="relative z-40 border-t border-line bg-surface px-3 pb-2 pt-2 sm:px-5"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
        {/* Top row: track + primary actions (mobile) / left zone (desktop) */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            to="/now-playing"
            aria-label="Open now playing"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg"
          >
            <div
              aria-hidden="true"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-elevated text-muted"
            >
              {showCover ? (
                <img
                  src={signedCover ?? ""}
                  alt=""
                  onError={() => setImgFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Icon name="music" size={22} />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-neutral-100">
                {currentId ? `Track ${shortId}` : "Nothing playing yet"}
              </p>
              <p className="truncate text-xs text-muted">
                {currentId
                  ? `${pos + 1} of ${queue.length} · ${isPlaying ? "Playing preview" : "Paused"} · sound lands with engine`
                  : "Pick a track once a queue is loaded"}
              </p>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Like current track"
            title="Like (wires with catalog)"
            className={`${btn44} hidden sm:flex`}
          >
            <Icon name="heart" size={18} />
          </button>
          <button
            type="button"
            onClick={toggleQueueOpen}
            aria-label={queueOpen ? "Close queue" : "Open queue"}
            aria-expanded={queueOpen}
            title="Queue"
            className={`${btn44} md:hidden ${queueOpen ? "text-accent" : ""}`}
          >
            <Icon name="queue" size={20} />
          </button>
        </div>

        {/* Transport + seek: stacked on mobile, stacked centered on desktop */}
        <div className="flex flex-col items-stretch gap-0.5 md:items-center md:gap-1">
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
              className={`${btn44} ${shuffle ? "text-accent" : ""}`}
            >
              <Icon name="shuffle" size={18} />
            </button>
            <button
              type="button"
              onClick={prev}
              disabled={!hasQueue}
              aria-label="Previous track"
              title={hasQueue ? "Previous" : "Load a queue first"}
              className={`${btn44} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon name="skipBack" size={20} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!hasQueue}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-black transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name={isPlaying ? "pause" : "play"} size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!hasQueue}
              aria-label="Next track"
              title={hasQueue ? "Next" : "Load a queue first"}
              className={`${btn44} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon name="skipForward" size={20} />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat}`}
              aria-pressed={repeat !== "off"}
              title={`Repeat: ${repeat}`}
              className={`${btn44} relative ${repeat !== "off" ? "text-accent" : ""}`}
            >
              <Icon name="repeat" size={18} />
              {repeat === "one" ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 right-1.5 text-[9px] font-bold leading-none"
                >
                  1
                </span>
              ) : null}
            </button>
          </div>
          {/* Seek: full-width on mobile, fixed on desktop */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted">
              {formatMs(seekValue)}
            </span>
            <label htmlFor="player-seek" className="sr-only">
              Seek (preview only, engine wires playback)
            </label>
            <input
              id="player-seek"
              type="range"
              min={0}
              max={seekMax}
              step={1000}
              value={seekValue}
              disabled={!hasQueue}
              onChange={(e) => setProgressMs(Number(e.target.value))}
              className="h-11 w-full min-w-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 md:w-48 lg:w-72"
            />
            <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted">
              {formatMs(durationMs)}
            </span>
          </div>
        </div>

        {/* Right zone: queue + volume (desktop) */}
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex">
          <button
            type="button"
            onClick={toggleQueueOpen}
            aria-label={queueOpen ? "Close queue" : "Open queue"}
            aria-expanded={queueOpen}
            title="Queue"
            className={`${btn44} ${queueOpen ? "text-accent" : ""}`}
          >
            <Icon name="queue" size={20} />
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
            className="h-11 w-24 cursor-pointer"
          />
        </div>
      </div>
      {playerError ? (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-1 pb-1">
          <p role="alert" className="min-w-0 flex-1 truncate text-xs text-red-300">
            {playerError}
          </p>
          <button
            type="button"
            onClick={() => {
              if (currentId) jumpTo(currentId);
            }}
            disabled={!currentId}
            className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium text-muted hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={clearPlayerError}
            aria-label="Dismiss player error"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : null}
    </footer>
  );
}
