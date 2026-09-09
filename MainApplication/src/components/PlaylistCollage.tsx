import { useEffect, useState } from "react";
import { useCoverUrl } from "../lib/coverArt.ts";
import { Icon } from "./icons.tsx";

/**
 * Playlist artwork: the playlist's own signed cover when set, otherwise a
 * 2x2 collage of the first entry track covers (nulls skipped; shortfalls
 * filled with accent initial tiles; no covers at all falls back to the
 * music icon). Same rounded/overflow language as CoverThumb.
 */
export function PlaylistCollage({
  cover_path,
  covers,
  label,
  className,
}: {
  cover_path?: string | null;
  covers?: (string | null | undefined)[];
  label: string;
  className?: string;
}) {
  const direct = useCoverUrl(cover_path ?? null);
  const cell0 = useCoverUrl(covers?.[0] ?? null);
  const cell1 = useCoverUrl(covers?.[1] ?? null);
  const cell2 = useCoverUrl(covers?.[2] ?? null);
  const cell3 = useCoverUrl(covers?.[3] ?? null);
  const cells = [cell0, cell1, cell2, cell3];
  const urlsKey = [direct, ...cells].join("|");
  const [failed, setFailed] = useState<Record<string, true>>({});
  useEffect(() => {
    setFailed({});
  }, [urlsKey]);
  const showDirect = Boolean(direct) && !failed[direct ?? ""];
  const resolved = cells.filter(
    (u): u is string => Boolean(u) && !failed[u ?? ""],
  );
  const initial = (label.trim().slice(0, 1) || "?").toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-elevated text-muted ${className ?? ""}`}
    >
      {showDirect ? (
        <img
          src={direct ?? ""}
          alt=""
          onError={() =>
            setFailed((f) => (direct ? { ...f, [direct]: true } : f))
          }
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : resolved.length > 0 ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-line">
          {[0, 1, 2, 3].map((i) => {
            const url = resolved[i];
            return url ? (
              <img
                key={i}
                src={url}
                alt=""
                onError={() => setFailed((f) => ({ ...f, [url]: true }))}
                className="h-full w-full bg-elevated object-cover"
              />
            ) : (
              <span
                key={i}
                className="flex h-full w-full items-center justify-center bg-accent/15 text-lg font-bold text-accent"
              >
                {initial}
              </span>
            );
          })}
        </div>
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <Icon name="music" size={36} />
        </span>
      )}
    </div>
  );
}
