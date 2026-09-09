import { useState } from "react";
import {
  Button,
  Field,
  StatCard,
  TextInput,
} from "../components/ui.tsx";
import {
  formatBytes,
  trackMetaSchema,
  useAdminStats,
  useAdminTracks,
  useAdminUsers,
  useDeleteTrack,
  useSetUserRole,
  useUpdateTrack,
  useUploadTrack,
  type AdminTrack,
} from "../hooks/useAdmin.ts";
import { sanitizeText, useRole, useSession } from "../hooks/useSession.ts";

const actionBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40";

export function Admin() {
  const { user } = useSession();
  const { isAdmin } = useRole();
  const statsQuery = useAdminStats();
  const tracksQuery = useAdminTracks();
  const usersQuery = useAdminUsers();
  const uploadTrack = useUploadTrack();
  const updateTrack = useUpdateTrack();
  const deleteTrack = useDeleteTrack();
  const setUserRole = useSetUserRole();

  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const stats = statsQuery.data;
  const tracks = !tracksQuery.error ? (tracksQuery.data ?? []) : [];
  const users = !usersQuery.error ? (usersQuery.data ?? []) : [];
  const canMutate = Boolean(user && isAdmin);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canMutate) return;
    setUploadError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const parsed = trackMetaSchema.safeParse({
      title: String(data.get("title") ?? ""),
      artist: String(data.get("artist") ?? ""),
      album: String(data.get("album") ?? "") || undefined,
      durationMs: String(data.get("durationMs") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setUploadErrors({
        ...(flat.title?.[0] ? { title: flat.title[0] } : {}),
        ...(flat.artist?.[0] ? { artist: flat.artist[0] } : {}),
        ...(flat.album?.[0] ? { album: flat.album[0] } : {}),
        ...(flat.durationMs?.[0] ? { durationMs: flat.durationMs[0] } : {}),
      });
      return;
    }
    setUploadErrors({});
    const audio = data.get("audio");
    const cover = data.get("cover");
    try {
      await uploadTrack.mutateAsync({
        meta: parsed.data,
        audio: audio instanceof File ? audio : new File([], ""),
        cover: cover instanceof File && cover.size > 0 ? cover : null,
      });
      form.reset();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const handleEditSave = async (
    e: React.FormEvent<HTMLFormElement>,
    track: AdminTrack,
  ) => {
    e.preventDefault();
    if (!canMutate) return;
    const data = new FormData(e.currentTarget);
    const parsed = trackMetaSchema.safeParse({
      title: String(data.get("title") ?? ""),
      artist: String(data.get("artist") ?? ""),
      album: String(data.get("album") ?? "") || undefined,
      durationMs: String(data.get("durationMs") ?? ""),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setEditErrors({
        ...(flat.title?.[0] ? { title: flat.title[0] } : {}),
        ...(flat.artist?.[0] ? { artist: flat.artist[0] } : {}),
        ...(flat.album?.[0] ? { album: flat.album[0] } : {}),
        ...(flat.durationMs?.[0] ? { durationMs: flat.durationMs[0] } : {}),
      });
      return;
    }
    setEditErrors({});
    try {
      await updateTrack.mutateAsync({ id: track.id, meta: parsed.data });
      setEditingId(null);
    } catch (err) {
      setTableError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const handleDelete = async (track: AdminTrack) => {
    if (!canMutate) return;
    setTableError(null);
    try {
      await deleteTrack.mutateAsync(track);
      if (editingId === track.id) setEditingId(null);
    } catch (err) {
      setTableError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const handleRole = async (targetUserId: string, role: "ADMIN" | "USER") => {
    if (!canMutate) return;
    setTableError(null);
    try {
      await setUserRole.mutateAsync({ targetUserId, role });
    } catch (err) {
      setTableError(
        err instanceof Error ? err.message : "Role change failed.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Uploads, catalog upkeep, roles, and usage at a glance. Changes here
          apply immediately and are recorded in the audit log.
        </p>
      </div>

      <section
        aria-label="Usage stats"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Tracks"
          value={stats ? String(stats.tracks) : "—"}
          hint="Total in the catalog"
        />
        <StatCard
          label="Users"
          value={stats ? String(stats.users) : "—"}
          hint="Total registered profiles"
        />
        <StatCard
          label="Playlists"
          value={stats ? String(stats.playlists) : "—"}
          hint="Total across all users"
        />
        <StatCard
          label="Storage used"
          value={stats ? formatBytes(stats.storageBytes) : "—"}
          hint="Across audio and covers buckets"
        />
      </section>

      <section
        aria-labelledby="admin-upload"
        className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
      >
        <h2 id="admin-upload" className="text-base font-bold">
          Upload a track
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Audio goes to private storage. Cover art is optional.
        </p>
        <form
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={handleUpload}
        >
          <Field label="Title" htmlFor="admin-title" error={uploadErrors.title}>
            <TextInput
              id="admin-title"
              name="title"
              placeholder="Song title"
              required
              maxLength={200}
            />
          </Field>
          <Field label="Artist" htmlFor="admin-artist" error={uploadErrors.artist}>
            <TextInput
              id="admin-artist"
              name="artist"
              placeholder="Artist name"
              required
            />
          </Field>
          <Field label="Album (optional)" htmlFor="admin-album" error={uploadErrors.album}>
            <TextInput
              id="admin-album"
              name="album"
              placeholder="Album name"
            />
          </Field>
          <Field
            label="Duration (ms)"
            hint="Whole seconds work too — we convert."
            htmlFor="admin-duration"
            error={uploadErrors.durationMs}
          >
            <TextInput
              id="admin-duration"
              name="durationMs"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="e.g. 214000"
              required
            />
          </Field>
          <Field label="Audio file" htmlFor="admin-audio" error={uploadErrors.audio}>
            <input
              id="admin-audio"
              name="audio"
              type="file"
              accept="audio/*"
              required
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-neutral-200 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-black"
            />
          </Field>
          <Field
            label="Cover image (optional)"
            htmlFor="admin-cover"
            error={uploadErrors.cover}
          >
            <input
              id="admin-cover"
              name="cover"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-neutral-200 file:mr-3 file:rounded-full file:border-0 file:bg-elevated file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-100"
            />
          </Field>
          {uploadError ? (
            <p role="alert" className="text-xs text-red-300 sm:col-span-2">
              {uploadError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={uploadTrack.isPending || !canMutate}
            >
              {uploadTrack.isPending ? "Uploading…" : "Upload track"}
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="admin-tracks">
        <h2 id="admin-tracks" className="mb-3 text-base font-bold">
          Tracks
        </h2>
        {tableError ? (
          <p role="alert" className="mb-3 text-xs text-red-300">
            {tableError}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Title
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Artist
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Album
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-muted"
                  >
                    No tracks yet — uploads will list here with edit and delete.
                  </td>
                </tr>
              ) : (
                tracks.map((t) =>
                  editingId === t.id ? (
                    <tr key={t.id} className="border-b border-line last:border-0">
                      <td colSpan={4} className="px-4 py-3">
                        <form
                          aria-label="Edit track"
                          onSubmit={(e) => handleEditSave(e, t)}
                          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        >
                          <Field
                            label="Title"
                            htmlFor={`edit-title-${t.id}`}
                            error={editErrors.title}
                          >
                            <TextInput
                              id={`edit-title-${t.id}`}
                              name="title"
                              defaultValue={t.title}
                              required
                              maxLength={200}
                            />
                          </Field>
                          <Field
                            label="Artist"
                            htmlFor={`edit-artist-${t.id}`}
                            error={editErrors.artist}
                          >
                            <TextInput
                              id={`edit-artist-${t.id}`}
                              name="artist"
                              defaultValue={t.artist_name ?? ""}
                              required
                            />
                          </Field>
                          <Field
                            label="Album (optional)"
                            htmlFor={`edit-album-${t.id}`}
                            error={editErrors.album}
                          >
                            <TextInput
                              id={`edit-album-${t.id}`}
                              name="album"
                              defaultValue={t.album_title ?? ""}
                            />
                          </Field>
                          <Field
                            label="Duration (ms)"
                            htmlFor={`edit-duration-${t.id}`}
                            error={editErrors.durationMs}
                          >
                            <TextInput
                              id={`edit-duration-${t.id}`}
                              name="durationMs"
                              type="number"
                              min={1}
                              inputMode="numeric"
                              defaultValue={t.duration_ms ?? ""}
                              required
                            />
                          </Field>
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button
                              type="submit"
                              disabled={updateTrack.isPending}
                            >
                              {updateTrack.isPending ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditErrors({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={t.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-2.5 text-neutral-100">
                        {sanitizeText(t.title)}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {sanitizeText(t.artist_name ?? "Unknown artist")}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {sanitizeText(t.album_title ?? "—")}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(t.id);
                              setEditErrors({});
                              setTableError(null);
                            }}
                            disabled={!canMutate}
                            className={actionBtn}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            disabled={!canMutate || deleteTrack.isPending}
                            className={actionBtn}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="admin-users">
        <h2 id="admin-users" className="mb-3 text-base font-bold">
          Users
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Display name
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Role
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-sm text-muted"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCallerAdmin = u.role === "ADMIN";
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-2.5 text-neutral-100">
                        {sanitizeText(u.display_name ?? "Unknown user")}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {sanitizeText(u.role ?? "USER")}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleRole(
                                u.id,
                                isCallerAdmin ? "USER" : "ADMIN",
                              )
                            }
                            disabled={!canMutate || setUserRole.isPending}
                            className={actionBtn}
                          >
                            {isCallerAdmin ? "Demote" : "Promote"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
