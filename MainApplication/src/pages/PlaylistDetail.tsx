import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  CoverThumb,
  EmptyState,
  Field,
  TextInput,
} from "../components/ui.tsx";
import { Icon } from "../components/icons.tsx";
import { formatDuration, useTracks } from "../hooks/useCatalog.ts";
import { useLikedTrackIds, useToggleLike } from "../hooks/useLikes.ts";
import {
  playlistSchema,
  useAddTrackToPlaylist,
  useDeletePlaylist,
  useMoveTrackInPlaylist,
  usePlaylist,
  usePlaylistEntries,
  useRemoveTrackFromPlaylist,
  useRenamePlaylist,
  useSetPlaylistVisibility,
} from "../hooks/usePlaylists.ts";
import { sanitizeText, useSession } from "../hooks/useSession.ts";
import { NotFound } from "./NotFound.tsx";

export function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const playlistQuery = usePlaylist(id);
  const entriesQuery = usePlaylistEntries(id);
  const likedIdsQuery = useLikedTrackIds();
  const catalogQuery = useTracks(30);
  const toggleLike = useToggleLike();
  const addTrack = useAddTrackToPlaylist(id ?? "");
  const removeTrack = useRemoveTrackFromPlaylist(id ?? "");
  const moveTrack = useMoveTrackInPlaylist(id ?? "");
  const renamePlaylist = useRenamePlaylist(id ?? "");
  const setVisibility = useSetPlaylistVisibility(id ?? "");
  const deletePlaylist = useDeletePlaylist();
  const [renameError, setRenameError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const loading = playlistQuery.isLoading || entriesQuery.isLoading;
  const playlist =
    user && !playlistQuery.error ? (playlistQuery.data ?? null) : null;
  const entries =
    user && !entriesQuery.error ? (entriesQuery.data ?? []) : [];
  const likedIds = likedIdsQuery.data ?? new Set<string>();
  const catalog = !catalogQuery.error ? (catalogQuery.data ?? []) : [];
  const isOwner = Boolean(user && playlist && playlist.owner_id === user.id);

  if (!user || loading) {
    if (loading && user) return null;
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-4">
          <div
            aria-hidden="true"
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-elevated text-muted sm:h-36 sm:w-36"
          >
            <Icon name="music" size={36} />
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
        <EmptyState
          title="This playlist is empty"
          body="Add tracks from search or your library. They will appear here in order with play, like, and remove actions."
          action={
            <span className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black sm:w-auto">
              Find songs to add
            </span>
          }
        />
      </div>
    );
  }

  if (!playlistQuery.isLoading && !playlist) {
    return <NotFound />;
  }

  const handleToggleLike = async (trackId: string) => {
    setRowError(null);
    try {
      await toggleLike.mutateAsync({ trackId, liked: likedIds.has(trackId) });
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Could not update like.");
    }
  };

  const handleRemove = async (trackId: string) => {
    setRowError(null);
    try {
      await removeTrack.mutateAsync(trackId);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Could not remove track.");
    }
  };

  const handleMove = async (trackId: string, direction: -1 | 1) => {
    setRowError(null);
    try {
      await moveTrack.mutateAsync({ trackId, direction });
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Could not reorder.");
    }
  };

  const handleRename = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRenameError(null);
    const data = new FormData(e.currentTarget);
    const parsed = playlistSchema.shape.name.safeParse(
      String(data.get("name") ?? ""),
    );
    if (!parsed.success) {
      setRenameError(
        parsed.error.flatten().formErrors[0] ?? "Enter a playlist name",
      );
      return;
    }
    try {
      await renamePlaylist.mutateAsync(parsed.data);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Could not rename.");
    }
  };

  const handleVisibility = async () => {
    if (!playlist) return;
    setManageError(null);
    try {
      await setVisibility.mutateAsync(!playlist.is_public);
    } catch (err) {
      setManageError(
        err instanceof Error ? err.message : "Could not update visibility.",
      );
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setManageError(null);
    try {
      await deletePlaylist.mutateAsync(id);
      navigate("/library");
    } catch (err) {
      setManageError(
        err instanceof Error ? err.message : "Could not delete playlist.",
      );
    }
  };

  const handleAdd = async (trackId: string) => {
    setManageError(null);
    try {
      await addTrack.mutateAsync(trackId);
    } catch (err) {
      setManageError(
        err instanceof Error ? err.message : "Could not add track.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-4">
        <div
          aria-hidden="true"
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-elevated text-muted sm:h-36 sm:w-36"
        >
          <Icon name="music" size={36} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">Playlist</p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl">
            {sanitizeText(playlist?.name ?? "Evening mix")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {id ? `Reference ${id.slice(0, 8)} · ` : ""}
            {playlist?.is_public ? "Public" : "Private"} · {entries.length}{" "}
            tracks
          </p>
        </div>
      </div>

      {rowError ? (
        <p role="alert" className="text-xs text-red-300">
          {rowError}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          title="This playlist is empty"
          body="Add tracks from search or your library. They will appear here in order with play, like, and remove actions."
          action={
            <span className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black sm:w-auto">
              Find songs to add
            </span>
          }
        />
      ) : (
        <ol className="flex flex-col overflow-hidden rounded-2xl border border-line">
          {entries.map((entry, i) => {
            const liked = likedIds.has(entry.track_id);
            return (
              <li
                key={entry.track_id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-card px-3 py-2 last:border-0 hover:bg-elevated"
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">
                  {i + 1}
                </span>
                <CoverThumb label={entry.track?.title ?? "?"} />
                <div className="min-w-0 flex-1 basis-36 leading-tight">
                  <p className="truncate text-sm font-medium text-neutral-100">
                    {sanitizeText(entry.track?.title ?? "Unknown track")}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {sanitizeText(entry.track?.artist_name ?? "Unknown artist")}{" "}
                    · {sanitizeText(entry.track?.album_title ?? "Single")}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {formatDuration(entry.track?.duration_ms)}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(entry.track_id)}
                    aria-label={liked ? "Unlike" : "Like"}
                    aria-pressed={liked}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100"
                  >
                    <Icon name="heart" size={16} filled={liked} />
                  </button>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMove(entry.track_id, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100 disabled:opacity-50"
                      >
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(entry.track_id, 1)}
                        disabled={i === entries.length - 1}
                        aria-label="Move down"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-neutral-100 disabled:opacity-50"
                      >
                        <Icon name="chevronDown" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry.track_id)}
                        aria-label="Remove"
                        className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs text-muted transition-colors hover:text-neutral-100"
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {isOwner ? (
        <section
          aria-label="Manage playlist"
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5"
        >
          <form
            aria-label="Rename playlist"
            onSubmit={handleRename}
            className="flex flex-col gap-4"
          >
            <Field label="Name" htmlFor="playlist-name" error={renameError ?? undefined}>
              <TextInput
                id="playlist-name"
                name="name"
                defaultValue={playlist?.name ?? ""}
                placeholder="Playlist name"
                required
                minLength={1}
                maxLength={120}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={renamePlaylist.isPending}>
                {renamePlaylist.isPending ? "Saving…" : "Rename"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleVisibility}
                disabled={setVisibility.isPending}
              >
                {playlist?.is_public ? "Make private" : "Make public"}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deletePlaylist.isPending}
              >
                {deletePlaylist.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </form>
          {manageError ? (
            <p role="alert" className="text-xs text-red-300">
              {manageError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-neutral-200">Add tracks</p>
            {catalog.length === 0 ? (
              <p className="text-xs text-muted">
                No tracks in the catalog yet.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {catalog
                  .filter((t) => !entries.some((e) => e.track_id === t.id))
                  .slice(0, 10)
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-card"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-100">
                        {sanitizeText(t.title)}
                      </span>
                      <span className="max-w-[38%] shrink-0 truncate text-xs text-muted">
                        {sanitizeText(t.artist_name ?? "Unknown artist")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdd(t.id)}
                        disabled={addTrack.isPending}
                        className="ml-auto inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3 text-xs font-medium text-muted transition-colors hover:text-neutral-100 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
