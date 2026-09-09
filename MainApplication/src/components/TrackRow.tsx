import { usePlayerStore } from "../store/playerStore.ts";

/**
 * Shared track row — feel pattern for pages to adopt (Phase 4).
 * Callers pass already-sanitized title/subtitle (pages sanitize).
 * Not wired into pages yet (pages stay untouched); engine pass
 * uses onPlay -> playQueue(ids, index) so rows start a queue.
 * Same tokens, rounded-xl rows, 44px+ targets, visible focus.
 */
export function TrackRow({
  id,
  index,
  title,
  subtitle,
  duration,
  queueIds,
  liked,
  onToggleLike,
}: {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  duration: string;
  queueIds: string[];
  liked?: boolean;
  onToggleLike?: (trackId: string) => void;
}) {
  const { currentId, isPlaying, playQueue } = usePlayerStore();
  const active = currentId === id;

  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-1.5 transition-colors ${
        active ? "bg-elevated" : "hover:bg-card"
      }`}
    >
      <span
        className={`w-6 shrink-0 text-right text-xs tabular-nums ${active ? "text-accent" : "text-muted"}`}
      >
        {index + 1}
      </span>
      <button
        type="button"
        onClick={() => playQueue(queueIds, index)}
        aria-label={`Play ${title}`}
        aria-current={active ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left"
      >
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            active ? "bg-accent text-black" : "bg-elevated text-muted"
          }`}
        >
          {active ? (isPlaying ? "❚❚" : "▶") : title.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-neutral-100">
            {title}
          </span>
          <span className="block truncate text-xs text-muted">
            {subtitle}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {duration}
        </span>
      </button>
      {onToggleLike ? (
        <button
          type="button"
          onClick={() => onToggleLike(id)}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={Boolean(liked)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm text-muted transition-colors hover:text-neutral-100"
        >
          {liked ? "♥" : "♡"}
        </button>
      ) : null}
    </li>
  );
}
