# Spotibai — personal music streaming web app

Spotify-homage listening experience (browse, search, playlists, persistent player, dark theme) with role-based access. **Personal/portfolio project — not a commercial product.** No Spotify logo, wordmark, or brand assets are used anywhere.

## Architecture

- **Frontend** (`MainApplication/`): React 19 + Vite 6 + TypeScript, Tailwind v4, TanStack Query (server state) + Zustand (player/UI state), `supabase-js` as the only backend client. See `MainApplication/README.md` for app docs.
- **Backend**: Supabase-native only — Auth, Postgres + Row-Level Security, private Storage buckets, one Edge Function. No separate API server, no mocks, no seeded accounts.

## Prerequisites

- Node 20+, npm
- A Supabase project (live project: `Spotibai`, ref `jsucuohtjkmeljumlruk`, region `ap-northeast-1`)
- Supabase CLI (`supabase --version`) for linking/pushing

## Link + database setup

```bash
supabase link --project-ref jsucuohtjkmeljumlruk
supabase db push        # applies supabase/migrations (schema, RLS, storage, triggers)
```

Migrations are idempotent (`IF NOT EXISTS` / `DROP IF EXISTS` / `OR REPLACE`) and replay `01 → 09` clean on an empty project.

## Environment

```bash
cp .env.example .env                    # repo root (local tooling)
cp MainApplication/.env.example MainApplication/.env
```

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | both | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | both (`VITE_`-prefixed in app) | Public by design — RLS is the real gate |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env / server only | **Never** in the browser or git. Bypasses RLS |

`.env` files are git-ignored. Real values are never committed.

## Run the app

```bash
cd MainApplication && npm install && npm run dev
```

## First admin bootstrap (no passwords involved)

1. Sign up in the app (or Supabase Dashboard → Authentication → Add user) with a strong password.
2. Send the signup **email address** to the project owner.
3. Owner promotes it directly in the database (SQL editor runs as `postgres`, which the role guard exempts):
   ```sql
   UPDATE public.profiles SET role = 'ADMIN' WHERE id = (
     SELECT id FROM auth.users WHERE email = 'you@example.com'
   );
   INSERT INTO public.audit_log (actor_id, action, target_id)
   VALUES (auth.uid(), 'role.promote', (SELECT id::text FROM auth.users WHERE email = 'you@example.com'));
   ```
Further promotions go through the `promote-user` Edge Function (caller must already be ADMIN).

## Edge Functions

- `promote-user` (`supabase/functions/promote-user`, deployed `ACTIVE`, `verify_jwt=true`): Zod-validated `{targetUserId, role}`, caller-ADMIN check, service_role update + audit write, 10 req/min in-memory throttle (upgrade path: Upstash Redis — see code comment).

## Security posture (verified live)

- RLS deny-by-default on all 8 tables + private `audio`/`covers` buckets; proven by USER-vs-ADMIN proof tests (USER blocked from catalog/storage writes and audit reads; ADMIN writes succeed and are audited).
- `SECURITY DEFINER` helpers revoked from API roles; role guard is `SECURITY INVOKER` (sees the real caller).
- `npm audit`: 0 vulnerabilities. Supabase advisors: 0 security lints.
- Known couplings (by design): audit trigger is fail-closed — if an `audit_log` insert fails, the track write aborts. `useDeleteTrack` may leave an orphan storage object if `storage.remove` fails after the row delete — re-run delete or remove the object manually.

## Out of scope

Payments, OAuth/social providers beyond email+password, multi-instance throttle backend, offline downloads, recommendation engine, `artists`/`albums` audit rows (tracks + role changes only).
