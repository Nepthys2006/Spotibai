/**
 * Manual-LRC lyrics: parse + sync lookup.
 * Pure functions, no React. Validated by `tsc --noEmit` (no extra deps).
 *
 * LRC shapes handled:
 * - `[mm:ss.xx] lyric` and `[mm:ss] lyric` (fraction `.xx` / `:xx` optional)
 * - multiple time tags on one line (one entry per tag, same text)
 * - metadata tags (`[ti:]`, `[ar:]`, `[al:]`, `[offset:]`, ...) carry no
 *   numeric timestamp and are skipped, as are untimed/empty lines.
 * Output is sorted ascending by `tMs`.
 */

export interface LyricLine {
  tMs: number;
  text: string;
}

const TIME_TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

function fractionToMs(frac: string | undefined): number {
  if (!frac) return 0;
  if (frac.length === 1) return Number(frac) * 100;
  if (frac.length === 2) return Number(frac) * 10;
  return Number(frac.slice(0, 3));
}

/**
 * Parse LRC text into sorted lyric lines.
 * Returns `[]` for empty input or input with no timed lines.
 */
export function parseLRC(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const out: LyricLine[] = [];
  const lines = lrc.split(/\r?\n/);
  for (const raw of lines) {
    TIME_TAG_RE.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = TIME_TAG_RE.exec(raw)) !== null) {
      const mm = Number(m[1]);
      const ss = Number(m[2]);
      const ms = fractionToMs(m[3]);
      if (!Number.isFinite(mm) || !Number.isFinite(ss) || !Number.isFinite(ms)) {
        continue;
      }
      stamps.push(mm * 60_000 + ss * 1_000 + ms);
    }
    if (stamps.length === 0) continue;
    TIME_TAG_RE.lastIndex = 0;
    const text = raw.replace(TIME_TAG_RE, "").trim();
    TIME_TAG_RE.lastIndex = 0;
    if (!text) continue;
    for (const tMs of stamps) {
      out.push({ tMs, text });
    }
  }
  out.sort((a, b) => a.tMs - b.tMs);
  return out;
}

/**
 * Active lyric line index for a playback position.
 * Despite the `use` prefix (fixed API name), this is a pure function, not a
 * React hook: it returns the last line with `tMs <= positionMs`, or `-1`
 * when no line is active yet (empty list, or position before the first line).
 */
export function useSyncedLyric(
  lines: readonly LyricLine[] | null | undefined,
  positionMs: number,
): number {
  if (!lines || lines.length === 0) return -1;
  if (!Number.isFinite(positionMs)) return -1;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = (lines[i] as LyricLine | undefined)?.tMs;
    if (typeof t !== "number" || !Number.isFinite(t)) continue;
    if (t <= positionMs) active = i;
  }
  return active;
}
