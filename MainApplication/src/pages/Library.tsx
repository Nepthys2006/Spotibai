import { Link } from "react-router-dom";
import { Card, EmptyState, SectionHeader } from "../components/ui.tsx";

export function Library() {
  const playlists: { id: string; name: string; count: string }[] = [];
  const hasPlaylists = playlists.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Your library</h1>
        <p className="mt-1 text-sm text-muted">
          Playlists you own or follow, plus everything you have liked.
        </p>
      </div>

      <section aria-labelledby="library-liked">
        <SectionHeader title="Pinned" />
        <div
          id="library-liked"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Link
            to="/liked"
            className="rounded-2xl border border-line bg-card p-4 hover:bg-elevated"
          >
            <p className="text-sm font-semibold">Liked Songs</p>
            <p className="mt-0.5 text-xs text-muted">
              Every track you save lives here.
            </p>
          </Link>
          <Link
            to="/playlists/demo"
            className="rounded-2xl border border-line bg-card p-4 hover:bg-elevated"
          >
            <p className="text-sm font-semibold">Playlist detail preview</p>
            <p className="mt-0.5 text-xs text-muted">
              See the track-row layout used for every playlist.
            </p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="library-playlists">
        <SectionHeader
          title="Playlists"
          action={
            <button
              type="button"
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-neutral-200 hover:border-neutral-500"
            >
              New playlist
            </button>
          }
        />
        {hasPlaylists ? (
          <div
            id="library-playlists"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {playlists.map((p) => (
              <Card key={p.id} title={p.name} subtitle={p.count} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No playlists yet"
            body="Create one for a trip, a project, or a quiet evening. You can keep it private or share it later."
            action={
              <button
                type="button"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong"
              >
                Create playlist
              </button>
            }
          />
        )}
      </section>
    </div>
  );
}
