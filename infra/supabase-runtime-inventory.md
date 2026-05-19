# Phase 4.1B Supabase Runtime Inventory

## Scope

This document inventories the current self-hosted Supabase runtime dependencies visible from this repository before any migration or deployment changes.

This is documentation only. It does not change runtime behavior, Docker Compose behavior, Supabase configuration, schemas, credentials, storage policies, or deployment settings.

Secrets are intentionally masked. Values from ignored environment files are documented only when they describe infrastructure coupling, hostnames, ports, or required variable names.

## Current Architecture Observations

- The application repository uses self-hosted Supabase through environment variables and client libraries.
- The Supabase self-hosting stack itself is not present in this repository. No Kong, GoTrue/Auth, Storage API, Realtime, PostgREST, Studio, Supavisor, or Supabase Compose configuration was found here.
- Backend services mostly use direct PostgreSQL connections through service-specific database URLs.
- Supabase Auth is used for frontend authentication and backend token validation.
- Supabase Storage is used by the frontend and admin store service for uploaded assets.
- Supabase Realtime is not currently used by the application code found in this repository.
- Current ignored environment files still contain Tec-era and local-only infrastructure references. Those values must be treated as runtime inventory, not as configuration to preserve long term.

## Current Runtime URLs

| Runtime setting | Current repository finding | Migration note |
| --- | --- | --- |
| `SUPABASE_PUBLIC_URL` | Not found in repo files inspected. | Must be confirmed on the actual self-hosted Supabase runtime before migration. |
| `API_EXTERNAL_URL` | Not found in repo files inspected. | Must be confirmed on the actual Supabase Auth/Kong runtime. |
| `SITE_URL` | Not found in repo files inspected. | Must be configured for staging and production auth redirects. |
| `PUBLIC_REST_URL` | Not found in repo files inspected. | Must be confirmed if PostgREST is externally exposed. |
| App `SUPABASE_URL` | Ignored envs currently point to a Tec/nip.io HTTP Supabase URL: `http://supabase.10.14.255.82.nip.io`. | This is Tec/IP/domain coupled and not suitable for Railway/Vercel production. |
| Frontend `VITE_SUPABASE_URL` | Ignored frontend env currently points to the same Tec/nip.io HTTP Supabase URL. | Vercel must use `https://supabase-staging.example.com` or `https://supabase.example.com`. |
| Kong/public API URL | No Kong config found. Current public URL is inferred from `SUPABASE_URL`. | Kong or equivalent reverse proxy must expose HTTPS Supabase API/Auth/Storage URLs. |
| Auth API URL | No explicit Auth URL found. Inferred under the Supabase public URL, typically `/auth/v1`. | OAuth redirect behavior depends on actual Supabase Auth runtime settings. |
| Storage API URL | No explicit Storage URL found. Inferred under the Supabase public URL, typically `/storage/v1`. | Public object URLs will change when the Supabase public domain changes. |
| Realtime URL | No explicit Realtime URL found, and no app Realtime usage found. | Not a current migration blocker unless Realtime is enabled later. |
| Pooler/Postgres URL | No Supabase pooler configuration found. Service DB URLs point directly to PostgreSQL hosts. | Railway connectivity requires a stable reachable database endpoint or tunnel/private network strategy. |

## Localhost, nip.io, sslip.io, and Private Network References

The repo still contains environment-specific references that matter for migration:

- `http://supabase.10.14.255.82.nip.io` in ignored env files for Supabase public access.
- `10.14.255.82` in `nginx-demo.conf`, which is marked legacy/Tec/demo and should not be used as a target production config.
- `*.nip.io` and `*.sslip.io` in gateway CORS allowlist.
- `*.trycloudflare.com` in gateway CORS allowlist and ignored env references.
- `http://localhost:8081`, `http://localhost:5173`, and local Vite proxy defaults for local development.
- `host.docker.internal:15432` in local Compose database URL fallbacks.
- `supabase-db-do4ksgcc0wksg4wwg4osgk0o` in ignored DB URLs, tying database connectivity to the Tec Docker network.
- Legacy service hostnames such as `icarus-*` remain in ignored env fallbacks and some service code defaults, although the current Compose gateway uses Compose service DNS.

## OAuth and Auth Inventory

### Providers

- Google OAuth is used through Supabase Auth in the frontend.
- No Supabase Auth provider runtime configuration file was found in this repository.
- A Google OAuth client secret appears in an ignored frontend environment file. It is masked here and should be treated as a security risk to remediate later.

### Frontend Auth Usage

- `apps/web/src/supabaseClient.ts` creates a Supabase client using:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `apps/web/src/context/AuthContext.tsx` uses Supabase Auth for:
  - email/password sign up
  - email/password sign in
  - Google OAuth sign in
  - session fetch
  - auth state subscription
  - sign out
- Google OAuth sign in does not currently show a repository-level production redirect URL contract. The effective redirect behavior depends on Supabase Auth site URL and allowed redirect URLs.
- An ignored frontend env contains `VITE_OAUTH_REDIRECT_URL=http://localhost:5173`, but no active code reference was found for that variable.

### Backend Auth Usage

- `services/profile-service/index.js` uses Supabase Auth token validation:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `supabase.auth.getUser(token)`
- The profile service has a debug token route with hardcoded test credentials. The values are not documented here. This should be removed or disabled in a later security-focused PR before production exposure.

### Auth Migration Risks

- Current Supabase public URL is HTTP and Tec/nip.io coupled.
- Supabase Auth `SITE_URL`, external API URL, and allowed redirect URLs are not visible in this repo.
- Google OAuth authorized redirect URIs must be updated for:
  - `https://app-staging.example.com`
  - `https://supabase-staging.example.com/auth/v1/callback`
  - `https://app.example.com`
  - `https://supabase.example.com/auth/v1/callback`
- If Railway/Vercel staging is introduced before Supabase Auth URLs are updated, Google OAuth sign-in is likely to fail.

## Storage Inventory

### Buckets Referenced by Application Code

| Bucket | Referenced from | Purpose | Public/private status |
| --- | --- | --- | --- |
| `avatars` | `apps/web/src/pages/ProfilePage.tsx` | User avatar uploads and public URL generation. | Unknown. Bucket policies are not in repo. |
| `feedback-images` | `apps/web/src/services/feedbackService.ts` | Feedback image uploads and public URL generation. | Unknown. Bucket policies are not in repo. |
| `store-images` | `services/admin-store-service/index.js` | Admin product image uploads and public URL generation. | Unknown. Bucket policies are not in repo. |

### Storage URL Assumptions

- Frontend uploads call Supabase Storage through `VITE_SUPABASE_URL`.
- Admin store uploads call Supabase Storage through `SUPABASE_URL`.
- Public object URLs are generated by the Supabase client through `getPublicUrl`.
- Because public URLs are generated from the configured Supabase public URL, changing the Supabase domain changes newly generated asset URLs.
- Existing stored public URLs in application databases may continue to point at the old Tec/nip.io domain if URLs were persisted after upload.

### Storage Migration Risks

- Bucket policy definitions are not present in this repository.
- Public/private bucket status must be verified directly in the Supabase runtime.
- If buckets are private but code expects public URLs, uploads may succeed while rendering fails.
- If persisted asset URLs include Tec/nip.io domains, data migration or URL rewriting may be required later.
- HTTPS is required for production browser usage and OAuth/storage reliability.

## Backend Supabase Dependencies

| Service | Supabase dependency | Variables | Notes |
| --- | --- | --- | --- |
| `profile-service` | Supabase Auth token validation | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Uses direct DB access for profile data through `PROFILE_DB_URL`. |
| `admin-store-service` | Supabase Storage uploads | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Uses service key and must never expose it to frontend. Uploads to `store-images`. |

No backend usage was found for Supabase Realtime.

No backend service should expose `SUPABASE_SERVICE_KEY`, database passwords, OAuth client secrets, or Stripe secrets to frontend builds.

## Frontend Supabase Dependencies

### Environment Variables

| Variable | Purpose | Frontend exposure |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase API/Auth/Storage base URL. | Expected frontend variable. Must be public HTTPS domain in staging/production. |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/publishable key. | Expected frontend variable. Should be anon key only, never service role key. |
| `VITE_SUPABASE_FEEDBACK_BUCKET` | Optional feedback image bucket override. | Safe if bucket name is not sensitive. Defaults to `feedback-images`. |

### Direct Frontend Supabase Calls

- `apps/web/src/supabaseClient.ts`
  - Initializes the Supabase client.
- `apps/web/src/context/AuthContext.tsx`
  - Uses Supabase Auth for user sessions and Google OAuth.
- `apps/web/src/pages/ProfilePage.tsx`
  - Reads the active session.
  - Uploads avatars to the `avatars` bucket.
  - Generates public avatar URLs.
- `apps/web/src/services/profile.ts`
  - Reads the active Supabase session and forwards the bearer token to the profile API.
- `apps/web/src/services/feedbackService.ts`
  - Reads the active Supabase session.
  - Uploads feedback images to `VITE_SUPABASE_FEEDBACK_BUCKET` or `feedback-images`.
  - Generates public feedback image URLs.

### Frontend Risks

- Current ignored frontend env points to a Tec/nip.io HTTP Supabase URL.
- Frontend production must not include backend-only secrets. The ignored frontend env currently contains backend-style secrets that should be moved out and rotated later.
- Auth redirects depend on Supabase runtime settings not visible in this repository.
- Public object URLs may be coupled to the old Supabase public URL if persisted in app databases.

## Database Access Patterns

### Direct PostgreSQL URLs Used by Services

The project currently uses separate service databases through full PostgreSQL URLs:

| Variable | Service usage | Notes |
| --- | --- | --- |
| `PROFILE_DB_URL` | `profile-service` | Active direct Postgres connection. |
| `COMMUNITY_DB_URL` | `community-service` | Active direct Postgres connection. |
| `MATCHES_DB_URL` | `matches-service` | Active direct Postgres connection. |
| `ROOMS_DB_URL` | `rooms-service` | Active direct Postgres connection. |
| `ANALYTICS_DB_URL` | `analytics-service` | Active direct Postgres connection. |
| `HISTORY_DB_URL` | `history-service` | Active direct Postgres connection. |
| `CARDS_DB_URL` | `cards-service` | Active direct Postgres connection. |
| `OFFSEASON_DB_URL` | `offseason-service` | Active direct Postgres connection. |
| `NEWS_DB_URL` | `news-service` | Active direct Postgres connection. |
| `FEEDBACKMAIL_DB_URL` | `feedbackmail-service` | Active direct Postgres connection. |

`STORE_DB_URL` is intentionally not listed as active. The store service does not use it.

### DB Hosts Observed

| Host pattern | Classification | Notes |
| --- | --- | --- |
| `supabase-db-do4ksgcc0wksg4wwg4osgk0o` | Tec-specific Docker network host | Works only when the legacy Tec network and container naming are available. |
| `supabase-db` | Compose/Supabase-stack-local style host | Only portable inside the specific Compose network that defines it. |
| `host.docker.internal:15432` | Local-only | Useful for local dev, not portable to Railway production. |
| `localhost:15432` | Host-local only | Only works from host processes, not from deployed containers unless explicitly provided. |

### Supabase API vs Direct DB Usage

- Auth and Storage use Supabase APIs.
- Application data services primarily use direct PostgreSQL connections.
- Railway backend services will need reachable Postgres URLs for every active service database.
- If the existing self-hosted Supabase Postgres remains the source of truth, Railway must be able to connect to it safely and consistently.

## Migration Risks

### Critical Risks

- The Supabase runtime stack is not defined in this repository, so important settings such as `SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL`, storage backend configuration, SMTP, JWT secret, and OAuth provider configuration cannot be fully audited here.
- The currently referenced Supabase public URL is HTTP and tied to a Tec/nip.io address.
- OAuth callback settings are not documented in repo-controlled config and may break immediately after moving frontend/backend domains.
- Storage bucket policies and public/private status are unknown.
- Service database URLs are currently coupled to either Tec Docker DNS or local-only hosts.
- Railway-to-self-hosted-Postgres connectivity requires a stable public or private network strategy that is not yet documented in runtime config.
- Backend-only secrets appear in ignored frontend env files. They should not be present in Vercel frontend environments.

### Medium Risks

- Gateway CORS still allows temporary and IP-derived domains such as `trycloudflare.com`, `sslip.io`, and `nip.io`.
- `nginx-demo.conf` remains Tec/demo legacy and contains a hardcoded Tec IP.
- Store checkout URLs depend on `FRONTEND_URL`; localhost fallback is not production safe.
- Some service fallback URLs still reference legacy `icarus-*` hostnames, although Compose now supplies portable service DNS values.
- Vite proxy defaults are local-development only and must not be confused with production API routing.
- Existing object URLs or DB rows may contain old Supabase public URLs.

## Migration Blockers to Resolve Before Real Staging

1. Export or document the actual self-hosted Supabase runtime configuration from the host that runs Supabase.
2. Decide the stable staging and production Supabase public domains:
   - `https://supabase-staging.example.com`
   - `https://supabase.example.com`
3. Put Supabase behind HTTPS/TLS with a stable reverse proxy.
4. Confirm Supabase Auth settings:
   - `SITE_URL`
   - external API URL/public URL
   - Google OAuth callback URLs
   - allowed redirect URLs
5. Confirm storage buckets and policies:
   - `avatars`
   - `feedback-images`
   - `store-images`
6. Decide Railway database access strategy:
   - public Postgres endpoint with strict allowlisting and TLS, or
   - private network/tunnel, or
   - managed Postgres/Supabase migration.
7. Remove backend-only secrets from frontend deployment environments before Vercel staging.
8. Disable or remove debug auth routes before exposing production services.

## Recommended Fixes

These are documentation-only recommendations for later PRs:

1. Create a Supabase runtime export checklist that operators can run on the actual Supabase host.
2. Add staging and production Supabase domain variables to deployment documentation.
3. Add a storage bucket policy inventory document after verifying the live Supabase runtime.
4. Add a Railway connectivity decision document for Postgres access.
5. Add a Vercel environment checklist that clearly separates frontend-safe variables from backend-only secrets.
6. Tighten gateway CORS only after staging domains are live and verified.
7. Remove or quarantine Tec/demo nginx config only after Railway/Vercel staging is working.
8. Remove debug auth credentials/routes in a later security PR.

## Safe Next PR Recommendation

The safest next PR is Phase 4.1C: Supabase Runtime Export Checklist.

That PR should still be documentation-only and should provide exact manual commands/checklists for the operator to collect live Supabase configuration from the current host, including Auth URLs, OAuth providers, storage buckets and policies, public URL settings, SMTP settings, Postgres exposure, backups, and reverse proxy/TLS configuration.

No migration, credential rotation, runtime config edit, or database change should happen until the live Supabase runtime settings are captured and reviewed.
