# Phase 4 VPS + Coolify Migration Plan

## Purpose

Define the complete off-Tec migration plan for the Sports Engagement Platform using a new VPS running Coolify, while preserving the current self-hosted Supabase and Docker Compose microservices architecture.

This plan replaces Supabase Cloud as the immediate migration target. Supabase Cloud is not being used right now because the current platform relies on multiple service-specific PostgreSQL databases, and moving into a single Supabase Cloud project would require schema and permission changes that may break the current architecture.

This is documentation only. It does not change runtime code, Docker Compose, gateway config, frontend code, service code, env files, schemas, data, buckets, policies, or secrets.

## Target Decision

- Frontend remains on Vercel.
- DNS remains in Cloudflare under `pzapata.com`.
- Backend moves from the Tec VM to a new VPS managed by Coolify.
- Supabase remains self-hosted, but moves from the Tec VM to the new VPS.
- Existing Docker Compose and microservice architecture is preserved.
- CI/CD should eventually deploy from GitHub on merge to `main`.

Target staging domains:

```text
app-staging.pzapata.com      -> Vercel
api-staging.pzapata.com      -> new VPS / Coolify / gateway
supabase-staging.pzapata.com -> new VPS / Coolify / self-hosted Supabase
```

Target staging flow:

```text
GitHub
  -> Vercel frontend deploy
  -> app-staging.pzapata.com
  -> VITE_API_BASE_URL=https://api-staging.pzapata.com
  -> Cloudflare DNS
  -> new VPS public IP
  -> Coolify proxy / Traefik
  -> icarus-gateway:8080
  -> internal Docker services
  -> self-hosted Supabase/Postgres on the same VPS network
```

## 1. Required VPS Specs

### Minimum Staging VPS

Use only for staging or low-traffic validation:

- 4 vCPU
- 16 GB RAM
- 200 GB NVMe SSD
- Ubuntu 24.04 LTS
- Static public IPv4
- Root or sudo SSH access
- Provider firewall support
- Automated snapshot support
- At least 1 TB monthly bandwidth

### Recommended Production-Ready VPS

Use this for a stable off-Tec staging environment that can become production with moderate traffic:

- 8 vCPU
- 32 GB RAM
- 400 GB to 800 GB NVMe SSD
- Ubuntu 24.04 LTS
- Static public IPv4
- Optional IPv6
- Provider-level firewall
- Daily snapshots
- Separate backup storage or object storage
- Monitoring/alerting support
- Ability to resize CPU/RAM/storage without full rebuild

### Storage Notes

Self-hosted Supabase storage uses object files outside normal PostgreSQL dumps. Plan disk capacity for:

- PostgreSQL data volume.
- Supabase Storage objects.
- MinIO/S3-compatible object storage data if used by the self-hosted stack.
- Local dump files during migration.
- Temporary restore validation files.
- Docker image/cache growth.

Do not size the VPS only for current database dumps. Leave working space for at least:

```text
2x current Postgres data size
+ 2x current storage object size
+ 30 GB Docker/runtime headroom
```

### Network Requirements

- Inbound TCP 80 and 443 open to the public.
- SSH restricted by IP where possible.
- PostgreSQL should not be publicly exposed by default.
- Supabase/Postgres should be reachable by backend containers over private Docker networking.
- External DB access should be avoided unless there is a specific operational need.

## 2. Coolify Installation Checklist

Use the official Coolify installation docs as the source of truth before running commands:

```text
https://coolify.io/docs/installation
```

Checklist:

- Provision the VPS with Ubuntu 24.04 LTS.
- Point a temporary DNS record to the VPS, for example:

  ```text
  coolify-staging.pzapata.com
  ```

- SSH into the VPS as a sudo-capable user.
- Confirm basic system information:

  ```bash
  hostnamectl
  free -h
  df -h
  ip addr
  ```

- Apply system updates:

  ```bash
  sudo apt update
  sudo apt upgrade
  ```

- Install Coolify using the current official command from Coolify docs.
- Confirm Coolify containers are running:

  ```bash
  sudo docker ps
  ```

- Confirm Coolify proxy is listening on 80/443:

  ```bash
  sudo ss -tulpn | grep -E ':80|:443'
  ```

- Log into Coolify.
- Configure the server resource.
- Configure GitHub integration.
- Configure domain/TLS handling through Coolify proxy.
- Confirm Let's Encrypt certificate issuance works for a test app before deploying Supabase or backend services.

Do not deploy production workloads before confirming:

- DNS resolves to the new VPS.
- Ports 80 and 443 are reachable externally.
- TLS certificates issue successfully.
- Docker has sufficient disk space.
- Coolify can pull from the GitHub repository.
- Server backups/snapshots are enabled.

## 3. Supabase Self-Hosted Migration Steps

### Target Supabase Runtime

Deploy a new self-hosted Supabase stack on the VPS through Coolify.

Target public URL:

```text
https://supabase-staging.pzapata.com
```

Target internal networking:

```text
backend services -> Docker network -> Supabase Postgres/Kong/Auth/Storage
```

Target public Supabase access:

```text
frontend -> https://supabase-staging.pzapata.com
backend admin/store services -> https://supabase-staging.pzapata.com or internal URL where appropriate
```

### Supabase Deployment Checklist

- Create a new Coolify Supabase service or equivalent self-hosted Supabase deployment.
- Use staging-only secrets.
- Do not reuse production secrets unless explicitly required for restore compatibility.
- Configure:
  - `SUPABASE_PUBLIC_URL`
  - `API_EXTERNAL_URL`
  - `GOTRUE_SITE_URL`
  - `GOTRUE_URI_ALLOW_LIST`
  - Google OAuth callback URL
  - SMTP settings if email auth flows are needed
  - Storage backend settings
  - JWT secret handling
  - Postgres password
  - Pooler settings if enabled
- Confirm public health:

  ```bash
  curl -I https://supabase-staging.pzapata.com
  curl -I https://supabase-staging.pzapata.com/auth/v1/health
  ```

- Confirm internal Postgres connectivity from a temporary container on the same Docker network.
- Confirm Supabase Studio works through the configured domain if it is exposed.
- Confirm Storage API works before object migration.

### Important Auth Compatibility Note

Supabase Auth JWT validation depends on the JWT secret and token issuer configuration. If preserving existing user sessions is required, secrets and Auth data migration must be planned carefully. If forcing users to sign in again is acceptable, migration can be simpler, but Auth users still need to be migrated.

Do not rotate JWT secrets during the first restore unless the team accepts session invalidation and has tested token validation across frontend/backend.

## 4. Postgres Dump/Restore Strategy For All Service DBs

Current architecture uses separate service databases. The VPS target should preserve that model to avoid business logic and query changes.

Active service databases:

| Service | Env var | Database role |
| --- | --- | --- |
| profile-service | `PROFILE_DB_URL` | Profile/accounts data and Auth token validation support. |
| community-service | `COMMUNITY_DB_URL` | Posts, replies, categories. |
| matches-service | `MATCHES_DB_URL` | Matches, teams, venues, seasons, demo replay, match views. |
| rooms-service | `ROOMS_DB_URL` | Chat rooms, room members, chat messages. |
| analytics-service | `ANALYTICS_DB_URL` | Analytics DB health/stub data. |
| history-service | `HISTORY_DB_URL` | History pages, hero content, timeline, legends, classic matches. |
| cards-service | `CARDS_DB_URL` | Cards, athletes, user cards, packs, sync logs. |
| offseason-service | `OFFSEASON_DB_URL` | Offseason game sessions and leaderboard. |
| news-service | `NEWS_DB_URL` | News source/article cache. |
| feedback-service | `FEEDBACKMAIL_DB_URL` | Feedback/recommendations. |

Legacy/unused:

| Env var | Status |
| --- | --- |
| `STORE_DB_URL` | Legacy/unused by current store service. Do not treat as an active restore blocker. |
| `AUTH_DB_URL` | Legacy/unused by current active service code. Supabase Auth uses the Supabase Postgres/Auth configuration. |

### Dump Collection On Tec VM

Before migration window:

- Create fresh custom-format dumps for each active service database.
- Create schema-only dumps for each active service database.
- Create role/user inventory.
- Create row-count reports for every table.
- Create extension inventory.
- Create view/function/trigger inventory.

Recommended dump format:

```bash
pg_dump --no-owner --no-privileges -Fc "$PROFILE_DB_URL" -f profile_db.dump
pg_dump --schema-only --no-owner --no-privileges "$PROFILE_DB_URL" -f profile_db.schema.sql
```

Repeat for:

- `COMMUNITY_DB_URL`
- `MATCHES_DB_URL`
- `ROOMS_DB_URL`
- `ANALYTICS_DB_URL`
- `HISTORY_DB_URL`
- `CARDS_DB_URL`
- `OFFSEASON_DB_URL`
- `NEWS_DB_URL`
- `FEEDBACKMAIL_DB_URL`

### Restore On New VPS

For each active service DB:

- Create the database.
- Create the service-specific DB user.
- Grant only required privileges.
- Restore schema/data from the custom-format dump.
- Reapply ownership/privileges intentionally, not blindly from old host.
- Validate extensions.
- Validate views/functions/triggers.
- Validate row counts against Tec source.

Example restore pattern:

```bash
createdb "$TARGET_PROFILE_DB_NAME"
pg_restore --no-owner --no-privileges --dbname "$TARGET_PROFILE_DB_URL" profile_db.dump
```

### Restore Validation

For every service database:

- `SELECT count(*)` for each expected table.
- Confirm views can be queried.
- Confirm app service health endpoint.
- Confirm app service key endpoint paths through gateway.
- Confirm no service is writing to the old Tec DB.

## 5. Storage Bucket Migration Strategy

Known buckets referenced by code:

| Bucket | Used by | Notes |
| --- | --- | --- |
| `avatars` | Frontend profile page | User avatar uploads and public URLs. |
| `feedback-images` | Frontend feedback service | Feedback image uploads. Bucket name may be controlled by `VITE_SUPABASE_FEEDBACK_BUCKET`. |
| `store-images` | `admin-store-service` | Product image uploads using service key. |

### Storage Migration Steps

- Inventory buckets on the Tec Supabase host.
- Record:
  - public/private status
  - policies
  - object counts
  - approximate storage size
  - MIME/file-size restrictions
- Create matching buckets on the new Supabase host.
- Recreate bucket policies.
- Copy objects from old storage backend to new storage backend.
- Preserve object paths where possible.
- Validate public URLs for public buckets.
- Validate authenticated upload/download flows for private buckets.

### Storage URL Compatibility

If public object URLs are stored in application tables, they may contain the old Supabase domain:

```text
http://supabase.10.14.255.82.nip.io/storage/v1/object/public/...
```

Before cutover:

- Identify persisted storage URLs in DB tables.
- Prefer storing object paths going forward.
- If current data stores full URLs, plan a controlled SQL update after restore to replace old public base URL with:

  ```text
  https://supabase-staging.pzapata.com
  ```

Do not perform URL rewriting until object copy and URL validation are complete.

## 6. Auth Migration Strategy

### Current Auth Dependencies

- Frontend uses Supabase Auth through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- Profile service validates bearer tokens with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Google OAuth is enabled in current runtime.
- Current live findings showed localhost and old `nip.io` assumptions in Auth config.

### Target Auth Settings

Staging:

```text
SITE_URL / GOTRUE_SITE_URL=https://app-staging.pzapata.com
Allowed redirect URLs:
  https://app-staging.pzapata.com/auth/callback
  https://app-staging.pzapata.com
Google OAuth callback:
  https://supabase-staging.pzapata.com/auth/v1/callback
```

Production later:

```text
SITE_URL / GOTRUE_SITE_URL=https://app.pzapata.com
Allowed redirect URLs:
  https://app.pzapata.com/auth/callback
  https://app.pzapata.com
Google OAuth callback:
  https://supabase.pzapata.com/auth/v1/callback
```

### Auth Migration Steps

- Export Auth-related schemas/data from the current Supabase Postgres database.
- Confirm whether existing password hashes and identities are compatible with the target self-hosted Supabase version.
- Restore Auth data into the new Supabase Postgres database.
- Preserve or intentionally rotate JWT secret depending on session continuity decision.
- Configure Google OAuth client to include the new callback URL.
- Configure allowed redirect URLs.
- Configure SMTP if email confirmation/recovery is used.
- Test:
  - existing user sign-in
  - new user sign-up
  - Google OAuth
  - token validation by `profile-service`
  - sign-out
  - protected profile endpoints

### Session Continuity Decision

Before cutover, decide one of:

- Preserve sessions: keep compatible JWT secret and Auth data. Higher operational sensitivity.
- Force re-login: rotate or change Auth runtime as needed. Simpler, but user-facing impact.

Do not mix this with unrelated backend deployment changes.

## 7. Backend Services Deployment Strategy

### Preserve Current Service Layout

Deploy the same microservices to the new VPS through Coolify or Compose-managed Coolify deployments:

- `gateway`
- `profile-service`
- `community-service`
- `matches-service`
- `rooms-service`
- `analytics-service`
- `store-service`
- `history-service`
- `cards-service`
- `offseason-service`
- `news-service`
- `feedback-service`
- `admin-store-service` if needed for staging admin flows

### Gateway

Keep nginx as the public API gateway.

Target flow:

```text
api-staging.pzapata.com
  -> Coolify proxy / Traefik
  -> gateway container on port 8080
  -> service DNS names on Docker network
```

The Phase 2 gateway change to Compose service DNS should be preserved.

### Deployment Order

Deploy in this order:

1. Supabase stack.
2. Service databases restored.
3. Gateway and one simple service.
4. Matches service.
5. Profile/Auth-dependent flow.
6. Storage-dependent flows.
7. Remaining services.
8. Vercel env update.
9. Full staging validation.

### MVP Backend Slice

First useful validation slice:

- `gateway`
- `matches-service`
- `profile-service`
- `store-service`
- self-hosted Supabase
- required DBs for those services

Reason:

- Matches validates read-heavy API behavior.
- Profile validates Auth token validation and profile DB access.
- Store validates Stripe/env behavior and previously had DB-disconnected runtime confusion.

## 8. Gateway, Domain, and DNS Strategy

### Cloudflare DNS

Create staging records:

```text
app-staging.pzapata.com      CNAME -> Vercel target
api-staging.pzapata.com      A/CNAME -> new VPS/Coolify target
supabase-staging.pzapata.com A/CNAME -> new VPS/Coolify target
```

Use Cloudflare proxy mode only after confirming:

- Coolify can issue/serve TLS correctly.
- WebSocket/Auth/Storage endpoints behave correctly.
- Large uploads are not blocked by Cloudflare limits.

If Cloudflare proxy causes issues, temporarily use DNS-only while validating.

### Coolify Routing

Configure Coolify routes:

```text
api-staging.pzapata.com
  -> gateway container internal port 8080

supabase-staging.pzapata.com
  -> Supabase Kong/public API internal port
```

Do not expose individual backend microservices publicly unless there is a deliberate debugging window and firewall controls are in place.

### Gateway CORS

Gateway CORS must allow:

```text
https://app-staging.pzapata.com
```

Do not use:

```text
Access-Control-Allow-Origin: *
```

Do not hardcode changing Vercel preview URLs into the stable staging gateway path.

Recommended behavior:

- Reflect only allowlisted origins.
- Add `Vary: Origin`.
- Use `add_header ... always` so successful API responses and error responses include CORS headers consistently.
- Keep OPTIONS preflight behavior centralized in the gateway.

## 9. Required Env Var Changes

### Vercel Staging

Update Vercel staging env:

```text
VITE_API_BASE_URL=https://api-staging.pzapata.com
VITE_SUPABASE_URL=https://supabase-staging.pzapata.com
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<new-staging-anon-or-publishable-key>
VITE_SUPABASE_FEEDBACK_BUCKET=feedback-images
```

Frontend must never receive:

- service role key
- database passwords
- JWT secret
- OAuth client secret
- Stripe secret key
- SMTP password

### Backend Services

Update service DB URLs to point to the new VPS self-hosted Postgres/Supabase database host.

Active DB URL env vars:

```text
PROFILE_DB_URL=<new-profile-db-url>
COMMUNITY_DB_URL=<new-community-db-url>
MATCHES_DB_URL=<new-matches-db-url>
ROOMS_DB_URL=<new-rooms-db-url>
ANALYTICS_DB_URL=<new-analytics-db-url>
HISTORY_DB_URL=<new-history-db-url>
CARDS_DB_URL=<new-cards-db-url>
OFFSEASON_DB_URL=<new-offseason-db-url>
NEWS_DB_URL=<new-news-db-url>
FEEDBACKMAIL_DB_URL=<new-feedback-db-url>
```

Supabase backend env:

```text
SUPABASE_URL=https://supabase-staging.pzapata.com
SUPABASE_ANON_KEY=<new-staging-anon-key>
SUPABASE_SERVICE_KEY=<new-staging-service-role-key>
```

Service-to-service URLs should use internal Docker/Coolify DNS where possible:

```text
PROFILE_SERVICE_URL=http://profile-service:4003
COMMUNITY_SERVICE_URL=http://community-service:4006
STORE_SERVICE_URL=http://store-service:4005
```

### Gateway Env

```text
FRONTEND_URL=https://app-staging.pzapata.com
CORS_ALLOWED_ORIGINS=https://app-staging.pzapata.com
GATEWAY_PORT=8080
```

Only use env vars that the current gateway config actually consumes. If `CORS_ALLOWED_ORIGINS` is documented but not consumed by nginx, update the gateway config in a separate small PR before depending on it.

### External APIs

Carry over or recreate staging-safe values for:

- Stripe publishable/secret keys and webhook secret.
- OpenAI key if used by deployed services.
- GetXAPI key for matches sync.
- News API keys.
- Email/SMTP settings.
- Google OAuth client ID/secret.

Use staging credentials where possible.

## 10. CI/CD Plan For Merge-To-Main Deploys

### Frontend

Vercel should remain GitHub-connected:

- PRs create preview deployments.
- `main` deploys to staging or production depending branch strategy.
- Vercel env vars are managed in Vercel, not committed.
- Build command remains scoped to `apps/web`.

### Backend On Coolify

Use Coolify GitHub integration:

- Connect the repository.
- Configure the backend deployment resource.
- Use the appropriate compose file set for the VPS target.
- Keep Tec-specific override out of the new VPS deployment.
- Configure automatic deploy on merge to `main` after staging is stable.
- Use manual deploy approval initially until rollback is tested.

Suggested staging rollout:

1. Manual deploy from selected branch.
2. Manual deploy from `main`.
3. Auto-deploy from `main` after two successful deploy cycles.
4. Add PR checks before auto-deploy becomes required.

### PR Checks

Add lightweight checks before backend auto-deploy:

- Compose config validation.
- Gateway nginx config test.
- Frontend build.
- Service install/build checks.
- Unit tests where available.
- Secret scan.

### Deployment Template For New Services

Every new service should define:

- Service folder.
- Dockerfile.
- `package.json` scripts.
- Required env vars.
- Health endpoint.
- Gateway route.
- DB URL or storage/auth dependency.
- Compose service entry.
- Coolify deployment inclusion.
- Minimal validation command.

## 11. Rollback Strategy

### DNS Rollback

Keep Tec staging alive until the new VPS has passed validation.

Rollback:

- Repoint `api-staging.pzapata.com` back to the Cloudflare Tunnel/Tec path.
- Repoint `supabase-staging.pzapata.com` only after confirming Auth/Storage behavior.
- Keep low DNS TTL during migration.

### Vercel Rollback

Rollback:

- Restore previous `VITE_API_BASE_URL`.
- Restore previous `VITE_SUPABASE_URL`.
- Redeploy last known-good Vercel deployment.

### Backend Rollback

Rollback:

- Stop new VPS backend deployment.
- Keep Tec containers running.
- Repoint DNS to old staging path.
- Do not run destructive migrations against Tec during validation.

### Database Rollback

Rollback:

- Treat Tec DBs as source of truth until cutover.
- During validation, keep new VPS DBs as copies.
- If cutover writes occur on the new VPS, rollback requires either:
  - accepting lost staging writes, or
  - replaying write delta back to Tec.

For staging, accepting lost writes may be acceptable. For production, a write-free maintenance window or replication strategy is required.

### Supabase Auth/Storage Rollback

Rollback:

- Restore frontend/backend Supabase URLs to old host.
- Keep old buckets and Auth data untouched.
- Do not delete old storage objects until new storage is validated and a retention period has passed.

## 12. Validation Checklist

### VPS/Coolify

- [ ] VPS has expected CPU/RAM/disk.
- [ ] Ubuntu updates applied.
- [ ] Coolify installed.
- [ ] Coolify reachable over HTTPS.
- [ ] Coolify proxy healthy.
- [ ] GitHub integration works.
- [ ] Test app deploys successfully.

### Supabase

- [ ] `https://supabase-staging.pzapata.com` resolves.
- [ ] TLS certificate valid.
- [ ] Auth health endpoint responds.
- [ ] Storage API responds.
- [ ] Studio access works if exposed.
- [ ] Google OAuth callback configured.
- [ ] Allowed redirect URLs configured.
- [ ] SMTP status known.
- [ ] Supabase keys recorded in secret manager/Coolify/Vercel.

### Databases

- [ ] All active service DBs restored.
- [ ] Row counts match source.
- [ ] Schema-only dumps archived.
- [ ] Views/functions/triggers validated.
- [ ] Service DB users/privileges validated.
- [ ] No service points to Tec DB after cutover.

### Storage

- [ ] Buckets recreated.
- [ ] Policies recreated.
- [ ] Object counts match source.
- [ ] Public object URLs work.
- [ ] Upload flows work.
- [ ] Stored URL rewrite decision documented.

### Backend

- [ ] Gateway serves `/health` if available.
- [ ] Gateway routes to all services.
- [ ] `GET /matches/` works.
- [ ] Profile/Auth flow works.
- [ ] Store health/status works.
- [ ] Community endpoints work.
- [ ] Rooms endpoints work.
- [ ] History endpoints work.
- [ ] Cards endpoints work.
- [ ] Offseason endpoints work.
- [ ] News endpoints work.
- [ ] Feedback endpoints work.
- [ ] CORS allows `https://app-staging.pzapata.com`.
- [ ] CORS rejects unknown origins.

### Frontend

- [ ] `app-staging.pzapata.com` resolves to Vercel.
- [ ] Vercel env points to new staging API.
- [ ] Vercel env points to new staging Supabase.
- [ ] Login works.
- [ ] Google OAuth works.
- [ ] Profile loads.
- [ ] Avatar upload works.
- [ ] Matches page works.
- [ ] Store UI works.
- [ ] Feedback image upload works.

### CI/CD

- [ ] Vercel deploys frontend from GitHub.
- [ ] Coolify can deploy backend from GitHub.
- [ ] Manual backend deploy works.
- [ ] Auto-deploy policy documented.
- [ ] Rollback procedure tested.

## 13. Risks And Blockers

### High-Risk Items

- Auth migration may fail if JWT/Auth settings, identities, or OAuth callbacks are not restored correctly.
- Storage migration may miss objects or policies if only database dumps are restored.
- Public object URLs may remain coupled to old `nip.io` or Tec Supabase URLs.
- Service DB restores may miss roles, extensions, views, functions, or privileges.
- DNS cutover can break staging if Coolify proxy or TLS is not ready.
- Cloudflare proxy mode can affect uploads, WebSockets, headers, or TLS if enabled too early.

### Medium-Risk Items

- Coolify resource definitions may not map one-to-one from the Tec VM deployment.
- Current docs mention env vars that may not be consumed by runtime config.
- Gateway CORS needs a small, deliberate config change for `app-staging.pzapata.com`.
- `store-service` currently has historical DB-disconnected confusion despite not using `STORE_DB_URL`.
- Some services may have implicit startup expectations tied to old Docker network names.

### Blockers Before Cutover

- New VPS provisioned with public inbound 80/443.
- Coolify installed and serving HTTPS.
- Supabase stack deployed on the new VPS.
- Fresh database dumps collected from Tec.
- All active service DBs restored and row-count validated.
- Storage buckets and objects migrated.
- Auth/OAuth settings validated.
- Vercel staging env updated and redeployed.
- API gateway CORS allows `https://app-staging.pzapata.com`.
- DNS rollback path confirmed.

## Recommended Execution Order

1. Provision VPS and install Coolify.
2. Configure Cloudflare DNS for temporary Coolify validation domain.
3. Deploy a test app through Coolify and confirm HTTPS.
4. Deploy self-hosted Supabase to the new VPS.
5. Configure `supabase-staging.pzapata.com`.
6. Collect fresh Tec DB dumps and storage/Auth inventory.
7. Restore service DBs on the new VPS.
8. Migrate Storage buckets and objects.
9. Migrate Auth data and configure OAuth callbacks.
10. Deploy backend gateway and MVP service slice.
11. Validate gateway, matches, profile/Auth, store, and storage flows.
12. Deploy remaining backend services.
13. Update Vercel staging env to new API/Supabase URLs.
14. Validate full staging end to end.
15. Enable backend auto-deploy from GitHub after manual deploys are reliable.
16. Keep Tec staging available for rollback during a defined retention window.

## Non-Goals For This Phase

- No migration to Supabase Cloud.
- No schema redesign.
- No business logic rewrite.
- No gateway replacement.
- No service consolidation.
- No production cutover until staging migration is validated.
- No secret rotation unless required and explicitly planned.
- No deletion of Tec VM data, volumes, or backups during validation.
