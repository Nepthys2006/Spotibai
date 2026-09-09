# Spotibai — MainApplication
Personal music streaming web app (React + Vite + TypeScript; Supabase backend).
## Prerequisites
- Node.js 20+ and npm; a Supabase project with migrations applied.
## Env setup
Set `VITE_SUPABASE_URL=<your-project-url>` and `VITE_SUPABASE_ANON_KEY=<your-anon-key>` (see `.env.example`). Never commit `.env`.
## Setup / Run
```sh
cp .env.example .env
npm install
npm run dev
```
