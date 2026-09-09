import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  EmptyState,
  Field,
  SectionHeader,
  TextInput,
} from "../components/ui.tsx";
import { sanitizeText, useSession } from "../hooks/useSession.ts";
import {
  playlistSchema,
  useCreatePlaylist,
  usePlaylists,
  usePlaylistTrackCounts,
} from "../hooks/usePlaylists.ts";

export function Library() {
  const { user } = useSession();
  const playlistsQuery = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const [showForm, setShowForm] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  const playlists =
    user && !playlistsQuery.isLoading && !playlistsQuery.error
      ? (playlistsQuery.data ?? [])
      : [];
  const countsQuery = usePlaylistTrackCounts(playlists.map((p) => p.id));
  const counts = countsQuery.data ?? {};
  const hasPlaylists = playlists.length > 0;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const data = new FormData(e.currentTarget);
    const parsed = playlistSchema.safeParse({
      name: String(data.get("name") ?? ""),
      isPublic: data.get("isPublic") === "on",
    });
    if (!parsed.success) {
      setFieldError(
        parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid playlist",
      );
      return;
    }
    setFieldError(undefined);
    try {
      await createPlaylist.mutateAsync(parsed.data);
      e.currentTarget.reset();
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not create playlist.",
      );
    }
  };

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
              onClick={() => setShowForm((v) => !v)}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-neutral-200 hover:border-neutral-500"
            >
              New playlist
            </button>
          }
        />
        {showForm ? (
          <form
            aria-label="Create playlist"
            onSubmit={handleCreate}
            className="mb-3 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5"
          >
            <Field label="Name" htmlFor="library-name" error={fieldError}>
              <TextInput
                id="library-name"
                name="name"
                placeholder="Playlist name"
                required
                minLength={1}
                maxLength={120}
              />
            </Field>
            <label
              htmlFor="library-public"
              className="flex items-center gap-2 text-sm text-neutral-200"
            >
              <input
                id="library-public"
                name="isPublic"
                type="checkbox"
                className="h-4 w-4 accent-neutral-100"
              />
              Public
            </label>
            {formError ? (
              <p role="alert" className="text-xs text-red-300">
                {formError}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={createPlaylist.isPending}>
                {createPlaylist.isPending ? "Creating…" : "Create playlist"}
              </Button>
            </div>
          </form>
        ) : null}
        {hasPlaylists ? (
          <div
            id="library-playlists"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {playlists.map((p) => (
              <Link key={p.id} to={`/playlists/${p.id}`} className="block">
                <Card
                  title={sanitizeText(p.name)}
                  subtitle={`${counts[p.id] ?? 0} tracks · ${p.is_public ? "Public" : "Private"}`}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No playlists yet"
            body="Create one for a trip, a project, or a quiet evening. You can keep it private or share it later."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
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
