import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/icons.tsx";
import { EmptyState } from "../components/ui.tsx";
import { useTrackRow } from "../hooks/useCatalog.ts";
import { useCoverUrl } from "../lib/coverArt.ts";
import { parseLRC, useSyncedLyric } from "../lib/lyrics.ts";
import { sanitizeText } from "../hooks/useSession.ts";
import { usePlayerStore } from "../store/playerStore.ts";

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
 * Decorative Canvas-style visual: accent bars that dance while playing and
 * settle near-flat while paused. No audio analyser — motion follows
 * isPlaying only. Static frame when reduced motion is preferred.
 */
function CanvasVisual({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const W = canvas.width;
    const H = canvas.height;
    const BARS = 36;

    const draw = (t: number, amp: number) => {
      ctx.clearRect(0, 0, W, H);
      const gap = W / BARS;
      for (let i = 0; i < BARS; i++) {
        const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const wave =
          0.5 + 0.5 * Math.sin(i * 0.7 + t * 2.1 + seed * Math.PI * 2);
        const h = Math.max(3, (0.12 + 0.88 * wave * (0.25 + seed)) * H * amp);
        const x = i * gap + gap * 0.22;
        const w = gap * 0.56;
        const alpha = 0.25 + 0.65 * (h / H);
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha.toFixed(3)})`;
        ctx.fillRect(x, H - h, w, h);
      }
    };

    if (reduced) {
      draw(1.2, 0.6);
      return;
    }

    let raf = 0;
    let amp = activeRef.current ? 1 : 0.08;
    let t = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const target = activeRef.current ? 1 : 0.08;
      amp += (target - amp) * Math.min(1, dt * 3);
      draw(t, amp);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={360}
      height={96}
      aria-hidden="true"
      className="h-24 w-full rounded-xl bg-elevated"
    />
  );
}

export function NowPlaying() {
  const currentId = usePlayerStore((s) => s.currentId);
  const progressMs = usePlayerStore((s) => s.progressMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const {
    togglePlay,
    next,
    prev,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    setProgressMs,
    seekTo,
  } = usePlayerStore();

  const trackQuery = useTrackRow(currentId ?? undefined);
  const track = trackQuery.data ?? null;
  const signedCover = useCoverUrl(track?.cover_path ?? null);

  const lines = useMemo(
    () => parseLRC(track?.lyrics_lrc ?? ""),
    [track?.lyrics_lrc],
  );
  const activeLine = useSyncedLyric(lines, progressMs);
  const lyricsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (activeLine < 0) return;
    const el = lyricsRef.current?.querySelector(
      `[data-lyric="${activeLine}"]`,
    );
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      block: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [activeLine, track?.id]);

  const seekMax = durationMs > 0 ? durationMs : 100;
  const seekValue = durationMs > 0 ? Math.min(progressMs, durationMs) : 0;

  if (!currentId || (!trackQuery.isLoading && !track)) {
    return (
      <EmptyState
        title="Nothing playing"
        body="Pick a track from a playlist or your liked songs and it will show up here with cover art and lyrics."
        action={
          <Link
            to="/"
            className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong sm:w-auto"
          >
            Find something to play
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex w-full flex-col gap-4 lg:max-w-sm lg:shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-elevated text-muted">
          {signedCover ? (
            <img
              src={signedCover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Icon name="music" size={64} />
            </span>
          )}
        </div>
        <CanvasVisual active={isPlaying} />
        <div className="min-w-0 text-center lg:text-left">
          <h1 className="truncate text-2xl font-bold">
            {sanitizeText(track?.title ?? "Unknown track")}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted">
            {sanitizeText(track?.artist_name ?? "Unknown artist")}
            {track?.album_title
              ? ` · ${sanitizeText(track.album_title)}`
              : ""}
          </p>
        </div>
        <div className="flex items-center justify-center gap-1 lg:justify-start">
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
            aria-label="Previous track"
            title="Previous"
            className={btn44}
          >
            <Icon name="skipBack" size={20} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-black transition-colors hover:bg-accent"
          >
            <Icon name={isPlaying ? "pause" : "play"} size={22} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next track"
            title="Next"
            className={btn44}
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
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
            {formatMs(seekValue)}
          </span>
          <label htmlFor="now-playing-seek" className="sr-only">
            Seek
          </label>
          <input
            id="now-playing-seek"
            type="range"
            min={0}
            max={seekMax}
            step={1000}
            value={seekValue}
            onChange={(e) => setProgressMs(Number(e.target.value))}
            className="h-11 w-full min-w-0 cursor-pointer"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted">
            {formatMs(durationMs)}
          </span>
        </div>
      </div>

      <section
        aria-label="Lyrics"
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <h2 className="text-base font-bold">Lyrics</h2>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No lyrics yet — admins can add them.
          </p>
        ) : (
          <ol
            ref={lyricsRef}
            className="mt-2 max-h-[46vh] min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:max-h-[60vh]"
          >
            {lines.map((line, i) => {
              const isActive = i === activeLine;
              return (
                <li key={`${line.tMs}-${i}`}>
                  <button
                    type="button"
                    data-lyric={i}
                    onClick={() => seekTo(line.tMs / 1000)}
                    aria-label={`Seek to ${line.text}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm leading-snug transition-colors ${
                      isActive
                        ? "bg-elevated font-semibold text-neutral-100"
                        : "text-muted hover:bg-card hover:text-neutral-200"
                    }`}
                  >
                    {line.text}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
