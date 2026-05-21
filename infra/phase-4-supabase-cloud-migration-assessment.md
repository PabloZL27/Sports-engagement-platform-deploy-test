# Phase 4 Supabase Cloud Migration Assessment

## Purpose

Assess whether the current self-hosted Supabase/Postgres runtime on the Tec VM can be migrated to Supabase Cloud while preserving Supabase as the required DB/Auth/Storage platform.

This is documentation only. It does not change runtime code, Docker Compose, gateway config, frontend code, service code, env files, schemas, data, buckets, policies, or secrets.

## Source Inputs

Repo files inspected:

- `infra/phase-4-current-state-and-target-architecture.md`
- `.env.example`
- `infra/.env.local.example`
- `infra/.env.tec.example`
- `infra/.env.production.example`
- `infra/docker-compose.yml`
- `infra/docker-compose.local.yml`
- `infra/docker-compose.tec.yml`
- service code under `services/`
- frontend Supabase client/auth/storage code under `apps/web/src/`
- migration/seed scripts under `services/matches-service` and `services/cards-service`

Requested files not present in this branch:

- `infra/critical_env_inventory.txt`
- `infra/.env.example`

Official Supabase docs referenced:

- Supabase Platform projects include a dedicated Postgres database, APIs, Auth, Realtime, and Storage: https://supabase.com/docs/guides/platform
- Supabase Database overview and backup note that database backups do not include Storage API objects: https://supabase.com/docs/guides/database/overview
- Supabase database connection and pooler modes: https://supabase.com/docs/guides/database/connecting-to-postgres
- Migrating Auth users between Supabase projects and JWT secret implications: https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects
- Restore to a new project transfers DB/Auth data but not Storage objects/settings: https://supabase.com/docs/guides/platform/clone-project
- General Postgres-to-Supabase migration approach with `pg_dump`/`psql`: https://supabase.com/docs/guides/platform/migrating-to-supabase/render
- Exposed schema/PostgREST schema configuration note: https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema

## 1. Current Supabase Usage

### Direct Postgres Services

The backend uses direct PostgreSQL connections through Node `pg` pools.

| Service | Env var | Current model |
| --- | --- | --- |
| `profile-service` | `PROFILE_DB_URL` | Direct Postgres for profile/accounts data. Also validates Supabase Auth tokens. |
| `community-service` | `COMMUNITY_DB_URL` | Direct Postgres for posts, replies, categories. Calls profile service for profile enrichment. |
| `matches-service` | `MATCHES_DB_URL` | Direct Postgres for matches, games, demo replay, views. |
| `rooms-service` | `ROOMS_DB_URL` | Direct Postgres for chatrooms, chat members, chat messages. |
| `analytics-service` | `ANALYTICS_DB_URL` | Direct Postgres health check only; `/event` is currently a stub. |
| `history-service` | `HISTORY_DB_URL` | Direct Postgres for history pages and related content. |
| `cards-service` | `CARDS_DB_URL` | Direct Postgres for athletes, cards, pack opening, sync logs. |
| `offseason-service` | `OFFSEASON_DB_URL` | Direct Postgres for Wordle/game sessions/leaderboard. Calls profile service. |
| `news-service` | `NEWS_DB_URL` | Direct Postgres for cached news sources/articles. |
| `feedback-service` | `FEEDBACKMAIL_DB_URL` | Direct Postgres for recommendations/feedback records. |

`STORE_DB_URL` exists as a legacy/unused env var in `.env.example`; the active `store-service` does not use it. Store purchase/product behavior is Stripe-backed. `admin-store-service` uses Supabase Storage, not a store database.

### Supabase Auth Usage

Frontend:

- `apps/web/src/supabaseClient.ts` creates the Supabase client using:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `apps/web/src/context/AuthContext.tsx` uses Supabase Auth for:
  - email/password sign up
  - email/password sign in
  - Google OAuth sign in
  - session fetch
  - auth state subscription
  - sign out

Backend:

- `services/profile-service/index.js` creates a Supabase client using:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- `profile-service` validates bearer tokens with Supabase Auth.

### Supabase Storage Usage

Frontend:

- `apps/web/src/pages/ProfilePage.tsx`
  - bucket: `avatars`
  - uploads user avatars
  - generates public URLs
- `apps/web/src/services/feedbackService.ts`
  - bucket: `VITE_SUPABASE_FEEDBACK_BUCKET || "feedback-images"`
  - uploads feedback images
  - generates public URLs

Backend:

- `services/admin-store-service/index.js`
  - bucket: `store-images`
  - uses `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
  - uploads product images and generates public URLs

### Buckets Referenced

| Bucket | Code reference | Expected use |
| --- | --- | --- |
| `avatars` | Frontend profile page | User avatar images. |
| `feedback-images` | Frontend feedback service | Feedback image uploads. |
| `store-images` | Admin store service | Product images for Stripe/admin store. |

Bucket existence, public/private status, Storage policies, and object counts must be verified on the live self-hosted Supabase instance before migration.

### Expected Schemas, Tables, and Views

Current service queries are mostly unqualified SQL against each service database's `public` schema. If moved into a single Supabase Cloud project, these objects should be grouped into service schemas.

| Service | Expected tables/views from code |
| --- | --- |
| `matches-service` | `match_view`, `match_demo_replay`, `matches_sync_log`, `season`, `venues`, `team`, `matches`, `game` |
| `profile-service` | `accounts`, `addresses`, `badges`, `user_badges` |
| `community-service` | `posts`, `categories`, `replies` |
| `rooms-service` | `chatrooms`, `chatroom_members`, `chat_messages` |
| `analytics-service` | No app tables found; DB health check only. |
| `history-service` | `history_pages`, `teams`, `history_hero`, `history_stats`, `timeline_events`, `timeline_event_facts`, `legendary_players`, `legendary_player_stats`, `legendary_player_achievements`, `classic_matches` |
| `cards-service` | `athletes`, `athlete_statistics`, `cards`, `user_cards`, `user_packs`, `pack_openings`, `cards_sync_log` |
| `offseason-service` | `games`, `game_sessions`, `leaderboard` |
| `news-service` | `source`, `article` |
| `feedback-service` | `recommendations` |

### Migration and Seed Scripts Found

- `services/matches-service/migrate.js`
- `services/matches-service/syncMatches.js`
- `services/matches-service/scripts/seedMatches.js`
- `services/cards-service/migrate.js`
- `services/cards-service/init-db.sql`
- `services/cards-service/sync.js`
- `services/news-service/db.js` can auto-create `source` and `article` only when `NEWS_DB_MANAGE_SCHEMA=true`

Most services do not have full repo-owned schema migrations. Existing schema state must be exported from the live databases before migration.

## 2. Compatibility With Supabase Cloud

### Can the Current One-Database-Per-Service Model Work Directly?

Not directly as a single Supabase Cloud project.

Supabase Cloud projects are organized around a project database with Supabase-managed features attached to that project: Postgres, Auth, Storage, APIs, Realtime, and related platform settings. The current application expects separate database names such as:

- `profile_db`
- `community_db`
- `matches_db`
- `rooms_db`
- `analytics_db`
- `history_db`
- `cards_db`
- `offseason_db`
- `news_cache`
- `feedback_db`

The best match for one Supabase Cloud project is not many separate databases. It is one project database with service-specific schemas.

Using one Supabase Cloud project per microservice is possible in theory but not recommended here because:

- Auth and Storage should remain centralized.
- Cross-service identity would become harder to reason about.
- Env/secrets and billing/operations multiply.
- Gateway/backend configuration becomes more complex.
- It does not match the client's requirement to preserve Supabase as the shared platform.

### Recommended Cloud Data Model

Use one Supabase Cloud project per environment, with service schemas:

```text
staging Supabase project
  auth.*
  storage.*
  public.*
  matches.*
  profile.*
  community.*
  rooms.*
  analytics.*
  history.*
  cards.*
  offseason.*
  news.*
  feedback.*

production Supabase project
  same schema layout
```

Keep Auth and Storage in the Supabase-managed schemas. Move each service database's current `public` objects into its own service schema.

### Code and Env Changes Required

The least invasive path is to keep existing service env var names but point them to the same Supabase Cloud Postgres database with service-specific roles/search paths:

```text
MATCHES_DB_URL=postgresql://matches_svc:<password>@<supabase-pooler-or-db-host>:5432/postgres?sslmode=require
PROFILE_DB_URL=postgresql://profile_svc:<password>@<supabase-pooler-or-db-host>:5432/postgres?sslmode=require
...
```

Then configure each database role with a default schema search path:

```sql
ALTER ROLE matches_svc IN DATABASE postgres SET search_path = matches, public;
ALTER ROLE profile_svc IN DATABASE postgres SET search_path = profile, public;
ALTER ROLE community_svc IN DATABASE postgres SET search_path = community, public;
```

This allows many existing unqualified queries such as `SELECT * FROM match_view` to continue working after objects move into `matches.match_view`.

More robust but higher-effort alternatives:

1. Schema-qualify every query in code, for example `matches.match_view`.
2. Add service-level database bootstrap that sets `search_path` on pool connection.
3. Keep separate service databases by using multiple Supabase projects, not recommended for this app.

### Service Users and Permissions

Recommended service-role pattern:

```sql
CREATE ROLE matches_svc LOGIN PASSWORD '<managed-secret>';
GRANT USAGE ON SCHEMA matches TO matches_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA matches TO matches_svc;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA matches TO matches_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA matches GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO matches_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA matches GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO matches_svc;
```

Repeat per service schema. Do not reuse `postgres` superuser credentials in app services.

### Pooler and Connection Strategy

Supabase Cloud provides direct and pooler connection strings. For persistent Node containers with `pg.Pool`, prefer one of:

- Direct connection when the hosting environment supports it and connection counts are controlled.
- Session pooler when direct connectivity is not available or IPv4 compatibility is needed.

Be cautious with transaction pooler mode:

- Supabase docs note transaction mode is useful for serverless/edge workloads with many transient connections.
- Transaction mode does not support prepared statements.
- Transaction-pooler behavior can be surprising for session-level state. Prefer role-level `search_path` defaults or schema-qualified queries, not per-request `SET search_path`.

## 3. Migration Strategy

### Phase A: Inventory and Freeze Plan

1. Confirm all active service DB names and row counts.
2. Confirm all tables, views, functions, indexes, constraints, triggers, and extensions per service DB.
3. Confirm `auth.*` row counts and OAuth provider usage.
4. Confirm Storage buckets:
   - `avatars`
   - `feedback-images`
   - `store-images`
5. Confirm bucket public/private settings and policies.
6. Confirm whether app DB rows persist Supabase Storage public URLs using the old Tec/nip.io domain.
7. Confirm backup and restore commands are tested.

### Phase B: Create Supabase Cloud Staging

1. Create a Supabase Cloud staging project.
2. Configure custom/stable staging URLs:
   - frontend: `https://app-staging.pzapata.com`
   - API: `https://api-staging.pzapata.com`
   - Supabase: target Cloud project URL initially, custom domain later if required.
3. Configure Auth site URL and redirect URLs.
4. Configure Google OAuth callback URL for the Cloud project.
5. Create service schemas.
6. Create service roles and permissions.
7. Create buckets and policies.

### Phase C: Transform and Restore Service Databases

For each current service database:

1. Export schema and data from the self-hosted database.
2. Transform objects from the source `public` schema into the target service schema.
3. Restore into the Supabase Cloud staging project.
4. Grant privileges to the matching service role.
5. Validate row counts, constraints, indexes, and views.

Recommended schema mapping:

| Source DB | Target schema |
| --- | --- |
| `matches_db` | `matches` |
| `profile_db` | `profile` |
| `community_db` | `community` |
| `rooms_db` | `rooms` |
| `analytics_db` | `analytics` |
| `history_db` | `history` |
| `cards_db` | `cards` |
| `offseason_db` | `offseason` |
| `news_cache` | `news` |
| `feedback_db` | `feedback` |

Do not restore service DB dumps directly into Supabase Cloud `public` one after another. Their `public` objects will collide and will also mix app data with Supabase's default public schema.

### Phase D: Auth Migration

Options:

1. Full project database migration that includes `auth.*`.
2. Auth-specific export/import of all `auth` schema tables.
3. Force users to re-authenticate or reset passwords if hashed passwords are not migrated.

Supabase docs state that auth schema tables can be migrated between Supabase projects, including users and hashed passwords. They also note that a different JWT secret invalidates existing tokens, while reusing the old JWT secret can preserve token validity. Changing the JWT secret regenerates anon/service keys, so this must be planned carefully.

Required validation:

- Email/password sign in.
- Google OAuth sign in.
- Session refresh.
- `profile-service` bearer token validation.
- First-login profile sync.
- Existing user profile matching by Supabase `user.id`.

### Phase E: Storage Migration

Supabase database backup/restore does not include Storage objects, only metadata. Supabase's restore-to-new-project docs also state Storage objects and settings need manual reconfiguration.

Required steps:

1. Create buckets:
   - `avatars`
   - `feedback-images`
   - `store-images`
2. Recreate bucket public/private settings.
3. Recreate Storage policies.
4. Copy objects from self-hosted MinIO/Supabase Storage to Supabase Cloud Storage.
5. Validate object counts per bucket.
6. Validate upload and public/signed URL behavior.
7. Decide how to handle persisted old public URLs.

If application rows store full public URLs, consider one of:

- Update persisted URLs to the new Supabase Storage public URL.
- Keep an old-domain redirect compatibility layer temporarily.
- Store object paths going forward instead of full public URLs in a later app refactor.

### Phase F: Service Validation

Validate each service against Supabase Cloud staging using its existing health and route surface.

| Service | Validation |
| --- | --- |
| `matches-service` | `/matches/health`, `/matches/`, `/matches/:id`, demo play/reset if enabled. |
| `profile-service` | `/profile/health`, `/profile/me` with bearer token, addresses, badges, profile update. |
| `community-service` | `/community/health`, posts, replies, top contributors, stats. |
| `rooms-service` | `/rooms/health`, bootstrap room, post/list messages. |
| `analytics-service` | `/analytics/health`, `/analytics/event`. |
| `history-service` | `/history/health`, hero/stats/timeline/players/matches/page routes. |
| `cards-service` | `/cards/health`, roster, collection, pack status/start/claim. |
| `offseason-service` | `/offseason/health`, Wordle config, leaderboard, history, save session. |
| `news-service` | `/news/health`, list news, sync if enabled. |
| `feedback-service` | `/feedback/health`, create/list feedback with image URLs. |
| `admin-store-service` | `/admin-store/health`, image upload to `store-images`, Stripe product admin flows. |

## 4. CI/CD and Env Impact

### Vercel Environment Variables

Staging:

```text
VITE_API_BASE_URL=https://api-staging.pzapata.com
VITE_SUPABASE_URL=<supabase-cloud-staging-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<staging-anon-key>
VITE_SUPABASE_FEEDBACK_BUCKET=feedback-images
```

Production later:

```text
VITE_API_BASE_URL=https://api.pzapata.com
VITE_SUPABASE_URL=<supabase-cloud-production-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<production-anon-key>
VITE_SUPABASE_FEEDBACK_BUCKET=feedback-images
```

Never put service role keys, database URLs, OAuth secrets, Stripe secrets, or SMTP secrets in Vercel frontend env.

### Backend Environment Variables

Keep current env var names for minimal code changes:

```text
PROFILE_DB_URL
COMMUNITY_DB_URL
MATCHES_DB_URL
ROOMS_DB_URL
ANALYTICS_DB_URL
HISTORY_DB_URL
CARDS_DB_URL
OFFSEASON_DB_URL
NEWS_DB_URL
FEEDBACKMAIL_DB_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
```

The values change from Tec/internal hosts to Supabase Cloud connection strings and API keys.

If using one Cloud project with service schemas:

- Every `*_DB_URL` points to the same Supabase project database host/database.
- Each URL should use a different service role/user where possible.
- Each role gets schema-specific permissions and search path.

### Staging vs Production Separation

Use separate Supabase Cloud projects:

- `sports-platform-staging`
- `sports-platform-production`

Do not share production data or secrets with staging unless explicitly planned for a sanitized copy.

Recommended separation:

- Separate Supabase URL.
- Separate anon and service keys.
- Separate DB credentials.
- Separate OAuth callback URLs.
- Separate Storage buckets.
- Separate Stripe mode/keys.
- Separate backend deployment environments.

## 5. Risks and Blockers

### Multi-Database Architecture Mismatch

The current app has many logical databases. A single Supabase Cloud project is one project database. Directly restoring all service DBs into one `public` schema will collide and is not maintainable.

Mitigation:

- Use service schemas.
- Use per-service roles and search paths.
- Validate every query and view after schema remapping.

### Auth Migration Risks

- JWT secret changes invalidate existing sessions.
- OAuth callback URLs must be updated.
- Auth settings are not fully represented in repo files.
- User IDs must remain stable because profile, rooms, cards, feedback, and other app data reference Supabase user IDs.

Mitigation:

- Migrate `auth.*` carefully.
- Decide whether to reuse JWT secret or force re-login.
- Validate Google OAuth and email/password flows before cutover.

### Storage Migration Risks

- Storage objects are not included in normal database backups.
- Bucket policies/settings must be recreated manually.
- Persisted public URLs may point to the old self-hosted Supabase URL.

Mitigation:

- Inventory bucket object counts.
- Copy objects separately.
- Recreate policies.
- Validate uploads and reads.
- Plan URL rewriting or redirect compatibility.

### RLS and Policy Differences

Current backend services mostly use direct DB users and raw SQL. Supabase Cloud Auth/Storage policies still matter for browser-facing Supabase access.

Mitigation:

- Export current policies from `auth`, `storage`, and any app schemas.
- Reapply and test policies in staging.
- Keep service role keys server-side only.

### Service User Permissions

Current self-hosted DB users have database-level ownership patterns. In one Cloud DB with schemas, permissions must become schema-scoped.

Mitigation:

- Create one role per service.
- Grant least privilege per service schema.
- Avoid app services using `postgres`.

### Connection Pooling and Direct Connection Concerns

Each Node service uses its own `pg.Pool`. Migrating all services to one Supabase Cloud project increases total connection pressure on that project.

Mitigation:

- Size Supabase compute appropriately.
- Use direct or session pooler for persistent services.
- Use transaction pooler only when compatible.
- Set conservative pool sizes if needed.

### Downtime and Rollback Risks

Cutover changes DB URLs, Supabase URL, Auth keys, Storage paths, and possibly persisted object URLs.

Mitigation:

- Do staging first.
- Test restore before production cutover.
- Keep Tec runtime read-only during final cutover window.
- Keep old backups and rollback envs.
- Avoid schema changes during migration.

## 6. Recommendation

### Supabase Cloud vs New Self-Hosted VPS

Recommendation: use Supabase Cloud for the final off-Tec Supabase target unless a hard requirement appears that Supabase Cloud cannot satisfy.

Reasons:

- The client requirement is to use Supabase.
- Supabase Cloud preserves Supabase Auth, Storage, APIs, and managed Postgres.
- It removes operational burden from the Tec VM.
- It provides managed backups and platform tooling.
- It avoids building and operating another self-hosted Supabase stack on a new VPS.
- It creates a cleaner path for backend CI/CD and service hosting migration.

A new self-hosted VPS is viable only if:

- The team accepts ongoing Supabase ops responsibility.
- Backups, monitoring, TLS, Auth, Storage, Postgres tuning, upgrades, and incident response are explicitly owned.
- Cloud plan limits or compliance constraints require it.

### Fastest Safe Complete Off-Tec Path

1. Create Supabase Cloud staging project.
2. Define service schema model and role/search-path strategy.
3. Export live self-hosted DB schemas/data.
4. Restore each service DB into its staging schema.
5. Migrate Auth users/settings to staging or intentionally require re-login for staging.
6. Create Storage buckets and copy Storage objects.
7. Recreate Storage/RLS policies.
8. Point staging backend services to Supabase Cloud staging DB URLs while leaving backend runtime on the Tec VM temporarily.
9. Validate Vercel staging end to end.
10. Move backend services off Tec after DB/Supabase Cloud is proven.
11. Repeat the process for production with a formal cutover window.
12. Retire Cloudflare Tunnel/Tec runtime after production replacement is stable.

This order removes the biggest data-platform risk before moving all backend compute.

### Incremental Execution Order

#### Step 1: Cloud Staging Design

- Decide schema names.
- Decide service roles.
- Decide direct/session/transaction pooler mode.
- Define staging env values without secrets in git.

#### Step 2: Migration Dry Run

- Restore one low-risk service first, such as `analytics` or `matches`.
- Validate search path and route behavior.
- Document exact commands.

#### Step 3: Full Staging Restore

- Restore all service schemas.
- Restore Auth data/settings.
- Restore Storage buckets/objects/policies.
- Validate each service.

#### Step 4: Staging Backend Env Switch

- Update staging backend DB URLs to Supabase Cloud.
- Keep current Cloudflare Tunnel/gateway runtime temporarily.
- Validate Vercel staging.

#### Step 5: Backend Hosting Decision

- Choose Railway or another backend platform.
- Deploy services with CI/CD.
- Keep nginx gateway or replace it only with a documented alternative.

#### Step 6: Production Migration

- Freeze writes or schedule downtime.
- Take final backups.
- Restore to Supabase Cloud production.
- Switch production envs.
- Validate.
- Keep rollback path to Tec for a short, defined period.

## Open Questions

- Are current self-hosted Supabase Auth users required to preserve passwords and active sessions, or is forced re-login acceptable?
- Are existing Storage public URLs persisted in app tables?
- What are exact row counts and table sizes for every service DB?
- Which Supabase plan/compute size is required for connection count and storage needs?
- Will backend services run as persistent containers or serverless functions after migration?
- Is a custom Supabase domain required, or is the Supabase Cloud project URL acceptable?
- What is the final backend hosting target after Supabase Cloud is proven?
