# Spotibai — MainApplication

Personal music streaming web app (Spotify-homage, no brand assets).
React 19 + Vite 6 + TypeScript + Tailwind 4 + TanStack Query + Zustand +
supabase-js. Supabase is the only backend: Auth, Postgres + RLS, private
Storage, Edge Functions.

## Prerequisites

- Node.js 20+ and npm.
- A Supabase project with the migrations in `../supabase/migrations/` applied
  (profiles/catalog/playlists/likes/audit, RLS, private `audio`/`covers`
  buckets, audit trigger) and the `promote-user` function deployed.

## Env setup

```sh
cp .env.example .env
```

Set in `.env`:

- `VITE_SUPABASE_URL` — your project URL.
- `VITE_SUPABASE_ANON_KEY` — your anon/public key.

Never put a service_role key in this app or in `.env` — the browser ships
only the anon key. Never commit a real `.env`.

## Commands

```sh
npm install   # install deps (commits package-lock.json)
npm run dev   # local dev server
npm run build # typecheck (tsc --noEmit) + production build to dist/
npm run preview # serve the production build locally
```

## Where code lives

- Auth: `src/lib/AuthProvider.tsx` (session bootstrap), `src/pages/auth/`
  (signup/login/logout/reset), `src/hooks/useSession.ts`
  (useSession/useProfile/useRole, DOMPurify `sanitizeText`).
- Data: `src/hooks/useCatalog.ts` (artists/albums/tracks, debounced search),
  `src/hooks/usePlaylists.ts` (playlists CRUD + entries + positions),
  `src/hooks/useLikes.ts` (liked_tracks toggle + list).
- Player: `src/lib/audioEngine.ts` (hidden audio element, short-lived signed
  URLs, no autoplay), `src/store/playerStore.ts` (queue/shuffle/repeat/
  seek/volume), `src/lib/preload.ts` (buffer-only warmers after login),
  `src/components/PlayerBar.tsx` + `QueuePanel.tsx` + `TrackRow.tsx`.
- Admin: `src/pages/Admin.tsx` (dashboard shell) + `src/hooks/useAdmin.ts`
  (upload/edit/delete, stats, role changes via the `promote-user` Edge
  Function); route guarded by `src/lib/RequireAdmin.tsx`.

## Security note

RLS is the gate: every table is deny-by-default and the client always sends
`owner_id`/`user_id` explicitly. The anon key is public by design — it only
grants what RLS policies allow. Audit coupling: the `trg_log_catalog_change`
trigger writes `audit_log` inside the same transaction as the tracks change,
so if the audit insert fails, the track write aborts too.
