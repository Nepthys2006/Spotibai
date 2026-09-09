import { useParams } from "react-router-dom";
import { CoverThumb, EmptyState } from "../components/ui.tsx";

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
}

const previewRows: TrackRow[] = [];

export function PlaylistDetail() {
  const { id } = useParams();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-4">
        <div
          aria-hidden="true"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-elevated text-3xl font-bold text-muted sm:h-36 sm:w-36"
        >
          ♪
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">Playlist</p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl">
            Evening mix
          </h1>
          <p className="mt-1 text-sm text-muted">
            {id ? `Reference ${id.slice(0, 8)} · ` : ""}Private · track list
            below
          </p>
        </div>
      </div>

      {previewRows.length === 0 ? (
        <EmptyState
          title="This playlist is empty"
          body="Add tracks from search or your library. They will appear here in order with play, like, and remove actions."
          action={
            <span className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black">
              Find songs to add
            </span>
          }
        />
      ) : (
        <ol className="flex flex-col overflow-hidden rounded-2xl border border-line">
          {previewRows.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b border-line bg-card px-3 py-2.5 last:border-0 hover:bg-elevated"
            >
              <span className="w-6 text-right text-xs tabular-nums text-muted">
                {i + 1}
              </span>
              <CoverThumb label={t.title} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium text-neutral-100">
                  {t.title}
                </p>
                <p className="truncate text-xs text-muted">
                  {t.artist} · {t.album}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted">
                {t.duration}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
