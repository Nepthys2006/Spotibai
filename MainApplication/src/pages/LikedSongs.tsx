import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui.tsx";
import { sanitizeText, useSession } from "../hooks/useSession.ts";
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-4">
        <div
          aria-hidden="true"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-black sm:h-36 sm:w-36"
        >
          ♥
        </div>
        <div>
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
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong"
            >
              Find songs to like
            </Link>
          }
        />
      ) : (
        <ol className="flex flex-col gap-1">
          {liked.map((t) => (
            <li
              key={t.track_id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-card"
            >
              <span className="text-sm text-neutral-100">
                {sanitizeText(t.track?.title ?? "Unknown track")}
              </span>
              <span className="text-sm text-muted">
                {sanitizeText(t.track?.artist_name ?? "Unknown artist")}
              </span>
              <button
                type="button"
                onClick={() => handleUnlike(t.track_id)}
                aria-label="Unlike"
                className="ml-auto text-xs text-muted hover:text-neutral-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
