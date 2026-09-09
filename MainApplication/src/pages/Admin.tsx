import {
  Button,
  Field,
  StatCard,
  TextInput,
} from "../components/ui.tsx";

export function Admin() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Uploads, catalog upkeep, roles, and usage at a glance. Mutations and
          role checks are wired in later phases.
        </p>
      </div>

      <section
        aria-label="Usage stats"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard label="Tracks" value="—" hint="Live count lands with data" />
        <StatCard label="Users" value="—" hint="Live count lands with data" />
        <StatCard
          label="Playlists"
          value="—"
          hint="Live count lands with data"
        />
        <StatCard
          label="Storage used"
          value="—"
          hint="Bucket totals land with data"
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
          onSubmit={(e) => e.preventDefault()}
        >
          <Field label="Title" htmlFor="admin-title">
            <TextInput
              id="admin-title"
              name="title"
              placeholder="Song title"
              required
              maxLength={200}
            />
          </Field>
          <Field label="Artist" htmlFor="admin-artist">
            <TextInput
              id="admin-artist"
              name="artist"
              placeholder="Artist name"
              required
            />
          </Field>
          <Field label="Album (optional)" htmlFor="admin-album">
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
          <Field label="Audio file" htmlFor="admin-audio">
            <input
              id="admin-audio"
              name="audio"
              type="file"
              accept="audio/*"
              required
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-neutral-200 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-black"
            />
          </Field>
          <Field label="Cover image (optional)" htmlFor="admin-cover">
            <input
              id="admin-cover"
              name="cover"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-neutral-200 file:mr-3 file:rounded-full file:border-0 file:bg-elevated file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-100"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">Upload track</Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="admin-tracks">
        <h2 id="admin-tracks" className="mb-3 text-base font-bold">
          Tracks
        </h2>
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
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-muted"
                >
                  No tracks yet — uploads will list here with edit and delete.
                </td>
              </tr>
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
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-muted"
                >
                  No users listed — roles and promotion controls land with the
                  admin pass.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
