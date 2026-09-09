import { Link } from "react-router-dom";
import { Card, EmptyState, SectionHeader } from "../components/ui.tsx";
import { useAlbums, useArtists, useTracks } from "../hooks/useCatalog.ts";
import { sanitizeText, useSession } from "../hooks/useSession.ts";

function SectionCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div
        aria-hidden="true"
        className="mt-2 flex aspect-square items-center justify-center rounded-xl bg-elevated text-2xl font-bold text-muted"
      >
        {title.slice(0, 1).toUpperCase()}
      </div>
    </Card>
  );
}

export function Home() {
  const { user } = useSession();
  const tracksQuery = useTracks(5);
  const albumsQuery = useAlbums(4);
  const artistsQuery = useArtists(5);

  const tracks = user && !tracksQuery.error ? (tracksQuery.data ?? []) : [];
  const albums = user && !albumsQuery.error ? (albumsQuery.data ?? []) : [];
  const artists = user && !artistsQuery.error ? (artistsQuery.data ?? []) : [];
  const hasContent =
    tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="home-greeting">
        <h1 id="home-greeting" className="text-2xl font-bold sm:text-3xl">
          Good evening
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your library, playlists, and fresh uploads live here.
        </p>
      </section>

      {hasContent ? null : (
        <EmptyState
          title="Your shelves are empty"
          body="Uploaded tracks and followed playlists will appear here. Start by searching the catalog or building your first playlist."
          action={
            <div className="flex gap-2">
              <Link
                to="/search"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong"
              >
                Search music
              </Link>
              <Link
                to="/library"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-neutral-200 hover:border-neutral-500"
              >
                Open library
              </Link>
            </div>
          }
        />
      )}

      <section aria-labelledby="home-jump">
        <SectionHeader
          title="Jump back in"
          subtitle="Shortcuts stay here once you start listening."
        />
        <div
          id="home-jump"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {tracks.length > 0 ? (
            tracks.map((t) => (
              <SectionCard
                key={t.id}
                title={sanitizeText(t.title)}
                subtitle={sanitizeText(t.artist_name ?? "Unknown artist")}
              />
            ))
          ) : (
            <>
              <SectionCard title="Liked Songs" subtitle="Your saved tracks" />
              <SectionCard title="Evening mix" subtitle="Playlist" />
              <SectionCard title="Focus takes" subtitle="Playlist" />
              <SectionCard title="New uploads" subtitle="Fresh on Spotibai" />
              <SectionCard title="Staff picks" subtitle="Curated set" />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="home-made">
        <SectionHeader
          title="Made for you"
          subtitle="Sets shaped by what you replay."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {albums.length > 0 ? (
            albums.map((a) => (
              <SectionCard
                key={a.id}
                title={sanitizeText(a.title)}
                subtitle={sanitizeText(a.artist_name ?? "Unknown artist")}
              />
            ))
          ) : artists.length > 0 ? (
            artists
              .slice(0, 4)
              .map((a) => (
                <SectionCard
                  key={a.id}
                  title={sanitizeText(a.name)}
                  subtitle="Artist"
                />
              ))
          ) : (
            <>
              <SectionCard title="Daily drive" subtitle="Songs for the road" />
              <SectionCard title="Slow mornings" subtitle="Gentle openers" />
              <SectionCard title="Night bus" subtitle="Low-key favorites" />
              <SectionCard title="Weekend room" subtitle="Easy company" />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
