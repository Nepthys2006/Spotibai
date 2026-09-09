import { useSearchParams } from "react-router-dom";
import { Card, EmptyState } from "../components/ui.tsx";

export function Search() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").trim();

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
          className="w-full rounded-full border border-line bg-elevated px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 hover:border-neutral-500"
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Card title="No matches yet" subtitle="Tracks">
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Nothing indexed under this query in the placeholder view.
              </p>
            </Card>
            <Card title="No matches yet" subtitle="Artists">
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Artist cards will list here with bios and top tracks.
              </p>
            </Card>
            <Card title="No matches yet" subtitle="Albums">
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Album cards will list here with cover art and year.
              </p>
            </Card>
            <Card title="No matches yet" subtitle="Playlists">
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Public playlists matching this query will list here.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
