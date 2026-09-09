import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, SectionHeader } from "../components/ui.tsx";
import { TrackRow } from "../components/TrackRow.tsx";
import {
  formatDuration,
  useAlbums,
  useArtistCovers,
  useArtists,
  useTracks,
} from "../hooks/useCatalog.ts";
import { useLikedTrackIds, useToggleLike } from "../hooks/useLikes.ts";
import { sanitizeText, useSession } from "../hooks/useSession.ts";
import { useCoverUrl } from "../lib/coverArt.ts";

function SectionCard({
  title,
  subtitle,
  cover_path,
}: {
  title: string;
  subtitle: string;
  cover_path?: string | null;
}) {
  const signedCover = useCoverUrl(cover_path ?? null);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [signedCover]);
  const showCover = Boolean(signedCover) && !imgFailed;
  return (
    <Card title={title} subtitle={subtitle}>
      <div
        aria-hidden="true"
        className="relative mt-2 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-elevated text-2xl font-bold text-muted"
      >
        {showCover ? (
          <img
            src={signedCover ?? ""}
            alt=""
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          title.slice(0, 1).toUpperCase()
        )}
      </div>
    </Card>
  );
}

export function Home() {
  const { user } = useSession();
  const tracksQuery = useTracks(5);
  const albumsQuery = useAlbums(4);
  const artistsQuery = useArtists(5);
  const coversQuery = useArtistCovers();

  const tracks = user && !tracksQuery.error ? (tracksQuery.data ?? []) : [];
  const albums = user && !albumsQuery.error ? (albumsQuery.data ?? []) : [];
  const artists = user && !artistsQuery.error ? (artistsQuery.data ?? []) : [];
  const artistCovers =
    user && !coversQuery.error ? (coversQuery.data ?? new Map()) : new Map();
  const likedIdsQuery = useLikedTrackIds();
  const toggleLike = useToggleLike();
  const likedIds = likedIdsQuery.data ?? new Set<string>();
  const queueIds = tracks.map((t) => t.id);
  const handleToggleLike = (trackId: string) => {
    if (!user) return;
    toggleLike.mutate({ trackId, liked: likedIds.has(trackId) });
  };
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-strong"
              >
                Search music
              </Link>
              <Link
                to="/library"
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line px-5 py-2.5 text-sm font-medium text-neutral-200 hover:border-neutral-500"
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
          className={
            tracks.length > 0
              ? "flex flex-col gap-1"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          }
        >
          {tracks.length > 0 ? (
            <ol className="flex flex-col gap-1">
              {tracks.map((t, i) => (
                <TrackRow
                  key={t.id}
                  id={t.id}
                  index={i}
                  title={sanitizeText(t.title)}
                  subtitle={sanitizeText(t.artist_name ?? "Unknown artist")}
                  duration={formatDuration(t.duration_ms)}
                  queueIds={queueIds}
                  liked={likedIds.has(t.id)}
                  onToggleLike={handleToggleLike}
                  cover_path={t.cover_path}
                />
              ))}
            </ol>
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
                  cover_path={artistCovers.get(a.id) ?? null}
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
