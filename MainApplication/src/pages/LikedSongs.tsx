import { Link } from "react-router-dom";
import { Icon } from "../components/icons.tsx";
import { TrackRow } from "../components/TrackRow.tsx";
import { EmptyState } from "../components/ui.tsx";
import { sanitizeText, useSession } from "../hooks/useSession.ts";
import { formatDuration } from "../hooks/useCatalog.ts";
import { useLikedSongs, useToggleLike } from "../hooks/useLikes.ts";

export function LikedSongs() {
  const { user } = useSession();
  const likedQuery = useLikedSongs();
  const toggleLike = useToggleLike();
  const liked = user && !likedQuery.isLoading && !likedQuery.error
    ? (likedQuery.data ?? [])
    : [];

  const handleUnlike = (trackId: string) => {
    if (!user) return;
    toggleLike.mutate({ trackId, liked: true });
  };
  const queueIds = liked.map((t) => t.track_id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 items-end gap-4">
        <div
          aria-hidden="true"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-accent text-black sm:h-36 sm:w-36"
        >
          <Icon name="heart" size={36} filled />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">Playlist</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Liked Songs</h1>
          <p className="mt-1 text-sm text-muted">
            {liked.length === 0
              ? "Nothing saved yet"
              : `${liked.length} saved tracks`}
          </p>
        </div>
      </div>

      {toggleLike.error ? (
        <p role="alert" className="text-xs text-red-300">
          {(toggleLike.error as Error).message}
        </p>
      ) : null}

      {liked.length === 0 ? (
        <EmptyState
          title="Songs you like will live here"
          body="Tap the heart on any track to keep it. Your liked list is private to your account."
          action={
            <Link
              to="/search"
              className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong sm:w-auto"
            >
              Find songs to like
            </Link>
          }
        />
      ) : (
        <ol className="flex flex-col gap-1">
          {liked.map((t, i) => (
            <TrackRow
              key={t.track_id}
              id={t.track_id}
              index={i}
              title={sanitizeText(t.track?.title ?? "Unknown track")}
              subtitle={sanitizeText(t.track?.artist_name ?? "Unknown artist")}
              duration={formatDuration(t.track?.duration_ms)}
              queueIds={queueIds}
              liked
              onToggleLike={handleUnlike}
              cover_path={t.track?.cover_path ?? null}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
