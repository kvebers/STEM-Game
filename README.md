# Elly

A math-practice game: climb a 10-tier difficulty ladder by playing timed challenges (vs. an AI baseline, and eventually live PvP), earning **Elly** — the game's rating currency (a standard ELO system under the hood). Elly permanently unlocks a matching animal at each tier; the animal you equip caps which difficulty you can currently play. Animals need to be kept fed by playing regularly.

This is **Phase 1** of a 3-phase build: schema + Google auth + AI-mode gameplay end-to-end, with real Elly and real animal unlocking. Animal decay/death (Phase 2) and live PvP (Phase 3) aren't built yet — the schema already has the tables for both, but no cron job runs yet and there's no matchmaking.

## Stack

- **Frontend**: React (JS) + Vite, deployed on Vercel as a static SPA.
- **Backend**: Supabase only — Postgres, Auth (Google OAuth), Edge Functions.
- **Question generation**: `shared/questions/` — a dependency-free JS module imported by both the frontend build and the Supabase Edge Functions (Deno), so there's exactly one implementation of the math-question generators.

## One-time setup

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com/dashboard). Free tier includes Auth (with Google OAuth), Postgres, and Edge Functions — plenty for this build. Note your project's **Project URL** and **Publishable key** (Project Settings → API Keys — Supabase's newer key system labels these "Publishable key" / "Secret key" instead of the old "anon" / "service_role" names; Publishable is the client-safe one you need here, same role as the old anon key).

### 2. Enable Google sign-in

In the Supabase dashboard: **Authentication → Providers → Google**, toggle it on. You'll need a Google OAuth Client ID/Secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client type "Web application"). Add the redirect URL Supabase shows you (looks like `https://<project-ref>.supabase.co/auth/v1/callback`) to the Google OAuth client's "Authorized redirect URIs". Also add your local dev URL (`http://localhost:5173`) and your eventual Vercel URL to Supabase's **Authentication → URL Configuration → Redirect URLs** allow-list.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from step 1. `.env.local` is gitignored (so is a plain `.env`, if you use that instead).

### 4. Push the schema and deploy the Edge Functions

Install the Supabase CLI (or use `npx supabase@latest` for every command below) and link it to your project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/*.sql
npx supabase functions deploy create-match
npx supabase functions deploy submit-match-result
```

No manual secrets are needed for the functions — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in every Edge Function's environment.

### 5. Run it

```bash
npm install
npm run dev
```

Sign in with Google, and you should land on the dashboard with a Field Mouse already unlocked (everyone starts at 1000 Elly, which is tier 1's threshold). Hit **Play** to run an AI-mode challenge.

## Useful scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — oxlint
- `npm run test:questions` — smoke-tests every subject's question generator across all 10 tiers (determinism + always-correct-answer checks)

## Project layout

```
/src                 - frontend (Vite + React)
  /api                 Supabase client + Edge Function invocation helper
  /state               zustand stores (auth, collection, in-progress match)
  /screens             one component per route
  /components          shared UI pieces
/shared/questions     - procedural question generators, imported by both the
                        frontend (display-only) and the create-match Edge
                        Function (the only place that actually generates and
                        persists a question set)
/supabase
  /migrations          SQL schema + RLS
  /functions           create-match, submit-match-result, _shared helpers
```

## Security notes worth knowing before you extend this

- Elly/hunger/unlock state is **never** writable by the client directly — RLS grants no UPDATE policy on those columns at all. The only path is `fn_apply_match_result` (a Postgres function), called via the `submit-match-result` Edge Function using the service role.
- The correct answer to a question is stored in `match_answer_keys`, a table with **zero** RLS policies — not even SELECT — so it's unreachable from the client SDK no matter what a user queries for. Only the `prompt` (in `match_questions`) is client-readable. Answer correctness is recomputed server-side in a trigger, never trusted from the client.
- `submit-match-result` is idempotent (guarded on `matches.status <> 'completed'`), since either player's client may end up calling it.
