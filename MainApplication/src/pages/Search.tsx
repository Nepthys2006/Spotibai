import { Link, useSearchParams } from "react-router-dom";
import { Card, EmptyState } from "../components/ui.tsx";
import { TrackRow } from "../components/TrackRow.tsx";
import {
  formatDuration,
  useCatalogSearch,
  useDebouncedValue,
} from "../hooks/useCatalog.ts";
import { useLikedTrackIds, useToggleLike } from "../hooks/useLikes.ts";
import { usePlaylistSearch } from "../hooks/usePlaylists.ts";
import { sanitizeText, useSession } from "../hooks/useSession.ts";

export function Search() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const { user } = useSession();
  const debounced = useDebouncedValue(query, 300);
  const { tracks, artists, albums } = useCatalogSearch(debounced);
  const playlists = usePlaylistSearch(debounced);

  const trackHits = user ? (tracks.data ?? []) : [];
  const artistHits = user ? (artists.data ?? []) : [];
  const albumHits = user ? (albums.data ?? []) : [];
  const playlistHits = user ? (playlists.data ?? []) : [];
  const likedIdsQuery = useLikedTrackIds();
  const toggleLike = useToggleLike();
  const likedIds = likedIdsQuery.data ?? new Set<string>();
  const trackQueueIds = trackHits.map((t) => t.id);
  const handleToggleLike = (trackId: string) => {
    if (!user) return;
    toggleLike.mutate({ trackId, liked: likedIds.has(trackId) });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="mt-1 text-sm text-muted">
          Find songs, artists, albums, and public playlists.
        </p>
      </div>

      <form
        role="search"
        aria-label="Search catalog"
        onSubmit={(e) => e.preventDefault()}
        className="flex max-w-xl gap-2"
      >
        <label htmlFor="search-input" className="sr-only">
          Search query
        </label>
        <input
          id="search-input"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Try an artist, a song, or a mood"
          autoComplete="off"
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})}
          className="min-h-11 w-full rounded-full border border-line bg-elevated px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 hover:border-neutral-500"
        />
      </form>

      {!query ? (
        <EmptyState
          title="What are you in the mood for?"
          body="Type above to look through tracks, artists, albums, and public playlists. Results appear here once catalog search is wired."
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            Showing structure for <span className="text-neutral-100">“{query}”</span> —
            live results land with the data pass.
          </p>
          {trackHits.length > 0 ? (
            <section aria-label="Songs">
              <ol className="flex flex-col gap-1">
                {trackHits.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    id={t.id}
                    index={i}
                    title={sanitizeText(t.title)}
                    subtitle={sanitizeText(t.artist_name ?? "Unknown artist")}
                    duration={formatDuration(t.duration_ms)}
                    queueIds={trackQueueIds}
                    liked={likedIds.has(t.id)}
                    onToggleLike={handleToggleLike}
                    cover_path={t.cover_path}
                  />
                ))}
              </ol>
            </section>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {trackHits.length === 0 ? (
              <Card title="No matches yet" subtitle="Tracks">
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Nothing indexed under this query in the placeholder view.
                </p>
              </Card>
            ) : null}
            {artistHits.length === 0 ? (
              <Card title="No matches yet" subtitle="Artists">
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Artist cards will list here with bios and top tracks.
                </p>
              </Card>
            ) : (
              artistHits.map((a) => (
                <Card key={a.id} title={sanitizeText(a.name)} subtitle="Artist">
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {sanitizeText(a.bio ?? "No bio yet.")}
                  </p>
                </Card>
              ))
            )}
            {albumHits.length === 0 ? (
              <Card title="No matches yet" subtitle="Albums">
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Album cards will list here with cover art and year.
                </p>
              </Card>
            ) : (
              albumHits.map((a) => (
                <Card
                  key={a.id}
                  title={sanitizeText(a.title)}
                  subtitle={sanitizeText(a.artist_name ?? "Unknown artist")}
                >
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Album
                  </p>
                </Card>
              ))
            )}
            {playlistHits.length === 0 ? (
              <Card title="No matches yet" subtitle="Playlists">
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Public playlists matching this query will list here.
                </p>
              </Card>
            ) : (
              playlistHits.map((p) => (
                <Card
                  key={p.id}
                  title={sanitizeText(p.name)}
                  subtitle="Playlist"
                  action={
                      <Link
                      to={`/playlists/${p.id}`}
                      aria-label={`Open ${sanitizeText(p.name)}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs font-medium text-muted hover:text-neutral-100"
                    >
                      Open
                    </Link>
                  }
                >
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {p.is_public ? "Public" : "Private"}
                  </p>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
