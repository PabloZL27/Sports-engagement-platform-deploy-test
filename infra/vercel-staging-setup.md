# Phase 4.2A Vercel Staging Setup

## Purpose

This document defines the staging deployment settings for the React + Vite frontend in `apps/web` on Vercel.

This phase only covers frontend deployment readiness. It does not change backend services, gateway configuration, Supabase runtime configuration, Docker Compose, database schemas, or business logic.

## Build Validation

Local build validation was run from `apps/web` using a temporary output directory:

```bash
npm.cmd run build -- --outDir .vercel-build-test --emptyOutDir
```

Result:

```text
Build succeeded.
Vite transformed 2431 modules.
Temporary output was removed after validation.
```

Build warning:

```text
Some chunks are larger than 500 kB after minification.
```

This warning is not a first-deploy blocker. It can be addressed later with route-level dynamic imports or Rollup manual chunks.

## Vercel Project Settings

Configure the Vercel project with:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `apps/web` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Development Command | `npm run dev` |
| Node.js Version | Use Vercel default unless a project-wide Node version is later pinned. |

The frontend has its own `package.json` and `package-lock.json` inside `apps/web`, so Vercel should install from that directory rather than the repository root.

## Required Staging Environment Variables

Set these in the Vercel staging environment.

| Variable | Required | Frontend-safe | Recommended staging value |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Yes | `https://api-staging.example.com` |
| `VITE_SUPABASE_URL` | Yes | Yes | `https://supabase-staging.example.com` |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Yes, anon/publishable key only | `<SUPABASE_STAGING_ANON_KEY>` |
| `VITE_SUPABASE_FEEDBACK_BUCKET` | Yes | Yes | `feedback-images` |

`VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` must be the Supabase anon/publishable key. Never use a service role key in Vercel.

## Optional Frontend Environment Variables

| Variable | Required | Usage | Staging guidance |
| --- | --- | --- | --- |
| `VITE_ADMIN_STORE_URL` | Optional | Admin store service base URL. Defaults to `/admin-store`. | Leave unset if admin store is routed through the API gateway at `/admin-store`; otherwise set to the staging gateway URL plus `/admin-store`. |
| `VITE_ELEVENLABS_AGENT_ID` | Optional | Voice agent session startup. | Set only if the staging VoiceAgent feature should work. |
| `VITE_CHAT_DEV_USER_ID` | Development-only | Fallback UUID for match room chat when a session user id is not valid. | Do not set in staging unless explicitly testing dev fallback behavior. |
| `VITE_PROXY_TARGET` | Local development only | Vite dev server proxy target. | Do not set in Vercel; Vercel does not use the Vite dev proxy in production builds. |

`VITE_DISABLE_SUPABASE` is declared in `vite-env.d.ts` but no active frontend code reference was found.

## Backend-Only Secrets

The frontend code search found no requirement for backend-only secrets.

Do not configure these in Vercel frontend environments:

- Supabase service role keys.
- Database URLs.
- Postgres passwords.
- OAuth client secrets.
- Stripe secret keys.
- SMTP credentials.
- Server API keys.
- JWT secrets.

Only `VITE_*` variables are exposed to the Vite frontend bundle. Treat every `VITE_*` value as public.

## API Routing Expectations

The frontend uses `VITE_API_BASE_URL` in API service modules.

When `VITE_API_BASE_URL` is set:

- Requests to app APIs go to the configured staging API gateway.
- The value should be the gateway origin, not a service-specific URL.
- Example: `https://api-staging.example.com`.

When `VITE_API_BASE_URL` is empty:

- The app falls back to relative `/api` routes.
- This is useful for local development with Vite proxy.
- This is not recommended for Vercel unless Vercel rewrites are added later.

## Supabase Expectations

The frontend initializes Supabase with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Staging requires:

- Supabase reachable at `https://supabase-staging.example.com`.
- Supabase Auth allowed redirect URLs updated for the Vercel staging app domain.
- Google OAuth callback configured for the staging Supabase domain.
- Storage buckets available:
  - `avatars`
  - `feedback-images`
  - `store-images`, used by the backend admin store service.

## First Deploy Blockers

These must be resolved before a useful Vercel staging deploy:

1. `VITE_SUPABASE_URL` must point to a reachable HTTPS Supabase staging URL.
2. `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` must be a valid anon/publishable key for that Supabase runtime.
3. Supabase Auth redirect settings must allow the Vercel staging domain.
4. `VITE_API_BASE_URL` must point to a reachable staging API gateway.

The frontend build itself is not currently blocked.

## Non-Blocking Follow-Ups

- Reduce the large JavaScript chunk warning with code splitting after first deploy.
- Add a Vercel rewrite plan only if the team wants relative `/api` routes in production.
- Remove local-only and legacy frontend env comments after staging/prod env docs are stable.
- Confirm VoiceAgent staging behavior if `VITE_ELEVENLABS_AGENT_ID` is set.

## Manual Vercel Setup Checklist

- [ ] Create Vercel project from the monorepo.
- [ ] Set Root Directory to `apps/web`.
- [ ] Confirm Framework Preset is Vite.
- [ ] Set Install Command to `npm ci`.
- [ ] Set Build Command to `npm run build`.
- [ ] Set Output Directory to `dist`.
- [ ] Add required staging env vars.
- [ ] Confirm no backend-only secrets are present in Vercel env.
- [ ] Deploy preview/staging.
- [ ] Verify app loads.
- [ ] Verify Supabase Auth session startup.
- [ ] Verify Google OAuth redirect.
- [ ] Verify API gateway calls.
- [ ] Verify Storage upload/read flows for enabled staging features.
