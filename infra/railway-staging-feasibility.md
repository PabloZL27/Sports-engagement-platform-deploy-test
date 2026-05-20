# Phase 4.2C Railway Staging Feasibility

## Purpose

This document evaluates the safest incremental way to deploy backend services and the API gateway to Railway for staging.

This is documentation and planning only. It does not deploy services, change Docker Compose, modify runtime infrastructure, change service code, rotate secrets, or expose credentials.

## Feasibility Conclusion

Deploying only the current nginx gateway to Railway is not viable as the first useful staging step.

The current gateway config proxies to Compose service DNS names such as:

```text
matches-service:4002
profile-service:4006
store-service:4005
```

Those names only resolve inside the current Docker/Compose network. A Railway-hosted gateway would not be attached to the Tec/Coolify Docker network and would not be able to resolve or reach those upstreams.

The smallest useful Railway staging slice should include the gateway plus at least one backend service deployed into the same Railway environment. The easiest first functional slice is:

```text
Railway public gateway
  -> Railway private store-service
```

This slice validates:

- Railway public HTTPS routing.
- Gateway-to-service routing over Railway private networking.
- Vercel `VITE_API_BASE_URL` pointing at Railway.
- A non-DB health endpoint through the gateway.
- Basic service container deployment from the monorepo.

It avoids the main immediate blocker: Railway cannot currently reach the self-hosted Supabase/Postgres Docker network.

## Railway Platform Constraints Relevant Here

Railway public HTTP services should listen on the Railway-provided `PORT` value or have an explicitly configured target port.

Railway private networking gives services internal DNS names under:

```text
<service-name>.railway.internal
```

Services in the same Railway project/environment can call each other over those private names. Railway private DNS does not make Tec/Coolify Docker names resolvable.

References:

- Railway Public Networking: https://docs.railway.com/public-networking
- Railway Private Networking: https://docs.railway.com/private-networking
- Railway Domains: https://docs.railway.com/networking/domains/working-with-domains
- Railway Healthchecks: https://docs.railway.com/reference/healthchecks

## Current Gateway Findings

The gateway Dockerfile is minimal:

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
```

The gateway listens on:

```nginx
listen 8080;
```

The current repository Compose publishes:

```text
host 8081 -> gateway container 8080
```

The gateway upstreams are static Compose service DNS names:

| Gateway path | Current upstream |
| --- | --- |
| `/matches/` | `matches-service:4002` |
| `/rooms/` | `rooms-service:4003` |
| `/analytics/` | `analytics-service:4004` |
| `/store/` | `store-service:4005` |
| `/news/` | `news-service:4011` |
| `/feedback` | `feedback-service:4012` |
| `/profile/` | `profile-service:4006` |
| `/cards/` | `cards-service:4009` |
| `/tweets` | `tweets-service:4007` |
| `/history/` | `history-service:4008` |
| `/offseason/` | `offseason-service:4010` |
| `/community/` | `community-service:4001` |
| `/dashboard/` | `dashboard-service:4015` |
| `/admin-store/` | `admin-store-service:4013` |

On Railway, those upstream names would need to become Railway private DNS names or be preserved by matching Railway service names and DNS behavior explicitly. The current config does not do that.

## Service Build Findings

Each backend service has its own Dockerfile and `package.json`, which is good for incremental Railway deployment.

Most services are simple Node/Express containers. Most also require direct database access.

| Service | Dockerfile | Runtime dependency profile | Railway first-slice fit |
| --- | --- | --- | --- |
| `store-service` | Node 20 Alpine | `STRIPE_SECRET_KEY`, `FRONTEND_URL`; `/health` does not require DB. | Best first slice for gateway health validation. |
| `tweets-service` | Node 20 Alpine | `GETXAPI_KEY`; no DB. | Possible lightweight API slice, but depends on external API key and feature relevance. |
| `dashboard-service` | Node 20 Alpine | Calls profile/community/store service URLs. | Useful later after dependencies exist on Railway. |
| `matches-service` | Node 20 Alpine | `MATCHES_DB_URL`; health checks DB. | Blocked until DB connectivity exists. |
| `profile-service` | Node 18 | `PROFILE_DB_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`; health checks DB. | Higher-risk first slice because it needs DB and Supabase Auth. |
| `community-service` | Node 20 Alpine | `COMMUNITY_DB_URL`, `PROFILE_SERVICE_URL`. | Blocked until DB and profile dependency are reachable. |
| `rooms-service` | Node 20 Alpine | `ROOMS_DB_URL`. | Blocked until DB connectivity exists. |
| `analytics-service` | Node 20 Alpine | `ANALYTICS_DB_URL`. | Blocked until DB connectivity exists. |
| `history-service` | Node 20 Alpine | `HISTORY_DB_URL`. | Blocked until DB connectivity exists. |
| `cards-service` | Node 20 Alpine | `CARDS_DB_URL`. | Blocked until DB connectivity exists. |
| `offseason-service` | Node 20 Alpine | `OFFSEASON_DB_URL`, optional profile URL. | Blocked until DB connectivity exists. |
| `news-service` | Node 20 Alpine | `NEWS_DB_URL`, `NEWS_API_KEY`. | Blocked until DB connectivity exists for full use. |
| `feedback-service` | Node 20 Alpine | `FEEDBACKMAIL_DB_URL`, optional `OPENAI_API_KEY`. | Blocked until DB connectivity exists. |
| `admin-store-service` | Node 20 Alpine | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. | Not first slice; higher secret/storage/webhook surface. |

## Is Gateway + Matches-Service the Best First Slice?

No.

`matches-service` is easy to build, but its health endpoint and primary routes require `MATCHES_DB_URL`. Railway cannot currently reach the self-hosted Postgres instance because it is Docker-network-local on the Tec host and not externally exposed.

Gateway + matches-service becomes useful only after a Railway-compatible database connectivity strategy exists.

## Is Gateway + Profile-Service the Best First Slice?

No.

`profile-service` needs:

- `PROFILE_DB_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

It also validates Supabase Auth tokens and has a DB-backed health endpoint. It is important, but it is not the smallest low-risk Railway test.

## Recommended Smallest Deployable Railway Slice

### Slice 1: Gateway + Store Service Health

Deploy:

- `gateway`
- `store-service`

Purpose:

- Prove Railway can host a public API gateway.
- Prove the Vercel frontend can call a Railway HTTPS API.
- Prove gateway-to-service routing works inside Railway.
- Validate `/store/health` without needing database connectivity.

Expected public test:

```text
GET https://<railway-api-domain>/store/health
```

Expected response:

```json
{
  "ok": true,
  "service": "store-service"
}
```

This is the smallest useful slice because `store-service` has a lightweight non-DB health endpoint.

### Required Caveat

The current gateway config points to:

```text
store-service:4005
```

Railway private DNS usually uses:

```text
store-service.railway.internal:4005
```

So the Railway slice will likely need a later Railway-specific gateway config or startup templating. This document does not make that change.

## Alternative First Slice

### Gateway + Tweets Service

This avoids DB connectivity but requires `GETXAPI_KEY` for useful route behavior.

It is less useful than store health for infrastructure validation because `/tweets` depends on an external API key and third-party API behavior.

## Required Railway Environment Variables

### Gateway Service

Current gateway has no environment variables.

Likely future Railway needs:

| Variable | Purpose |
| --- | --- |
| `PORT` | If using user-defined Railway port, set to `8080`, or adjust gateway to listen on Railway-provided `PORT` later. |
| `CORS_ALLOWED_ORIGINS` | Future hardening if nginx config is templated. |
| `STORE_SERVICE_URL` | Future templating target, for example `http://store-service.railway.internal:4005`. |

Current static nginx does not consume these variables. They are future config needs, not active variables.

### Store Service

For first health-only validation:

| Variable | Required for `/health` | Required for full store use | Notes |
| --- | --- | --- | --- |
| `PORT` | Railway provided or set explicitly | Yes | Service already uses `process.env.PORT || 4005`. |
| `STRIPE_SECRET_KEY` | No | Yes | Required for product and checkout routes. Do not expose to frontend. |
| `FRONTEND_URL` | No | Yes | Should point to Vercel staging for checkout redirects. |

For full store use, set:

```text
STRIPE_SECRET_KEY=<masked>
FRONTEND_URL=https://<vercel-staging-domain>
```

### Future DB-Backed Service Variables

Most services will need one DB URL each:

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
```

Additional service variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GETXAPI_KEY
NEWS_API_KEY
OPENAI_API_KEY
OPENAI_MODERATION_MODEL
PROFILE_SERVICE_URL
COMMUNITY_SERVICE_URL
STORE_SERVICE_URL
ROOMS_CHAT_PRUNE_INTERVAL_MS
ENABLE_AUTO_SYNC
SYNC_INTERVAL_MS
NEWS_QUERY
NEWS_PAGE_SIZE
NEWS_SORT
NEWS_LANGUAGE
NEWS_DB_MANAGE_SCHEMA
WORDLE_TIMEZONE
```

Do not put these in Vercel unless they are intentionally frontend-safe `VITE_*` values.

## Database Connectivity Requirements

Railway cannot currently use:

```text
supabase-db-do4ksgcc0wksg4wwg4osgk0o
supabase-db
host.docker.internal
127.0.0.1:5432 on the Tec host
```

The live runtime showed:

- Supabase Postgres is internal to Docker.
- The database container does not publish a public host port.
- `pg-proxy-temp` binds to `127.0.0.1:5432`, which is host-local only.
- Railway is not attached to the Tec Docker network.

Before any DB-backed service moves to Railway, one of these strategies is required:

1. Public Postgres or Supavisor endpoint with TLS and strict allowlisting.
2. VPN or tunnel between Railway and the Tec/Supabase host.
3. Keep DB-backed backend services near Supabase until Supabase moves.
4. Move Supabase/Postgres to new stable infrastructure first.

## Is Temporary Public Postgres Access Needed?

Not for the first recommended slice if the slice is gateway + store-service health only.

Temporary public Postgres access becomes necessary only when migrating a DB-backed service such as:

- matches-service
- profile-service
- community-service
- rooms-service
- analytics-service
- history-service
- cards-service
- offseason-service
- news-service
- feedback-service

If temporary public Postgres is used later, it should require:

- TLS.
- Firewall restrictions.
- Railway egress/static IP strategy if available.
- Least-privilege service credentials.
- Connection limits or Supavisor/pooler.
- A tested rollback plan.

## Railway First vs Coolify/Traefik First

Recommended next action: expose the current gateway through Coolify/Traefik first.

Reason:

- It directly fixes the current Vercel failure by giving `VITE_API_BASE_URL` a public HTTPS API origin.
- It keeps backend services and Supabase on the same Docker network where they already work.
- It avoids solving Railway-to-Postgres connectivity immediately.
- It has lower blast radius than moving services to Railway before database access is solved.

Recommended sequence:

1. Expose current `icarus-gateway:8080` through Coolify/Traefik as `https://api-staging.example.com`.
2. Add the Vercel staging origin to gateway CORS.
3. Set Vercel `VITE_API_BASE_URL=https://api-staging.example.com`.
4. Validate the existing backend stack from Vercel.
5. Then create a Railway proof-of-concept with gateway + store-service health.
6. Only after that, solve database connectivity for DB-backed Railway services.

## Railway Proof-of-Concept Plan

When the team is ready to deploy to Railway, use this staging POC order:

1. Create Railway project/environment for staging.
2. Deploy `store-service` from `services/store-service`.
3. Confirm Railway service listens on its configured `PORT`.
4. Deploy gateway from `gateway`.
5. Use a Railway-specific gateway config or templating later so `/store/` routes to the Railway private store service URL.
6. Generate a Railway public domain for the gateway.
7. Test:

   ```bash
   curl -i https://<railway-gateway-domain>/store/health
   ```

8. Point Vercel staging `VITE_API_BASE_URL` to the Railway gateway only after the health route works.

## Current Blockers Before Railway Backend Migration

- Gateway upstreams are static Compose DNS names.
- Gateway does not currently template upstreams from environment variables.
- Gateway listens on fixed `8080`; Railway public networking may require explicit target port or `PORT` handling.
- DB-backed services cannot reach current self-hosted Postgres from Railway.
- Supabase public URL is still HTTP/`nip.io` based.
- Auth/OAuth settings are not yet staging-domain ready.
- CORS does not yet explicitly allow the Vercel staging domain.

## Minimal Staging Recommendation

Lowest-risk immediate fix:

```text
Vercel -> Coolify/Traefik -> existing icarus-gateway -> existing Docker services
```

Smallest Railway feasibility slice after that:

```text
Railway public gateway -> Railway private store-service -> /store/health
```

Do not attempt a full Railway backend migration until database connectivity and Supabase domain/HTTPS work are resolved.
