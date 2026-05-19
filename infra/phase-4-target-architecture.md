# Phase 4 Target Architecture

## Purpose

Phase 4 prepares the Sports Engagement Platform for real staging and production deployment without changing business logic, database schemas, credentials, or Supabase configuration in this step.

This document defines the target architecture and the safe migration path. It is documentation only.

## Current Architecture State

The platform is a microservices-based fan engagement application:

- Frontend: React and Vite.
- Backend: Node.js microservices.
- API gateway: nginx.
- Auth, Storage, and database infrastructure: currently self-hosted Supabase running in Docker.
- Deployment portability work already completed:
  - Base Docker Compose is environment-agnostic.
  - Tec-specific Docker networking is isolated in `infra/docker-compose.tec.yml`.
  - Gateway upstreams use Compose service DNS names.
  - Service database URLs are environment-driven and overrideable.
  - Environment examples and database URL templates are documented.

The remaining infrastructure concern is that Supabase and database access still depend on environment-specific hosts and URLs. Those must be made stable before production traffic is moved.

## Target Architecture Decision

- Frontend: Vercel.
- Backend: Railway.
- API gateway: nginx remains the public API entrypoint.
- Supabase: keep self-hosted if possible, but move away from Tec-dependent networking and temporary domains.

The target architecture should avoid Tec VM/container/IP dependencies. Supabase should become a standalone infrastructure dependency reachable through stable production and staging domains.

## Environment Topologies

### Local Development

- Frontend runs with Vite.
- Backend services and nginx gateway run through Docker Compose.
- Supabase can be reached through one of:
  - local self-hosted Supabase,
  - a local tunnel to existing Supabase,
  - explicit development database URLs.
- Local database URLs may use `host.docker.internal` where appropriate.
- Vite may use a local gateway proxy for development only.

### Staging

Required domains:

- `app-staging.example.com`
- `api-staging.example.com`
- `supabase-staging.example.com`

Recommended staging topology:

- Vercel hosts the staging frontend.
- Railway hosts the nginx gateway as the public API service.
- Railway hosts backend services as private/internal services when possible.
- Self-hosted Supabase staging is exposed through `supabase-staging.example.com` with HTTPS.
- Railway services use environment-provided database URLs and Supabase API URLs.
- Vercel uses public `VITE_*` variables for API and Supabase access.

### Production

Required domains:

- `app.example.com`
- `api.example.com`
- `supabase.example.com`

Recommended production topology:

- Vercel hosts the production frontend.
- Railway hosts the public nginx API gateway at `api.example.com`.
- Backend services are private/internal behind the gateway when possible.
- Self-hosted Supabase runs on a stable host outside Tec and is exposed at `supabase.example.com`.
- Databases remain separate per service unless a later migration phase explicitly changes that.

## Self-Hosted Supabase Requirements

Keeping self-hosted Supabase is viable only if it is treated as production infrastructure.

Required:

- Stable host outside the Tec VM/container dependency.
- Public DNS name for staging and production.
- HTTPS/TLS reverse proxy in front of Supabase services.
- Stable public API/Auth/Storage URLs.
- Database access strategy for Railway services.
- Backups for Postgres data and Storage objects.
- OAuth callback URLs configured for staging and production frontend domains.
- Monitoring for availability, disk, database health, storage usage, and certificate expiry.

Database access options for Railway:

- Expose a secure managed Postgres/Supabase pooler endpoint with SSL.
- Restrict database access by firewall or allowlisted egress IPs where possible.
- Prefer service-specific database users and full per-service database URLs.
- Avoid exposing raw Postgres broadly without TLS and access controls.

Supabase URL requirements:

- Frontend must use the public HTTPS Supabase URL.
- Backend services must use the correct Supabase API URL and keys.
- Storage public URLs must resolve from Vercel-hosted frontend pages.
- Auth redirects must point to final staging and production frontend URLs.

## Railway Deployment Considerations

Recommended Railway layout:

- nginx gateway is public.
- Backend services are private/internal when possible.
- Gateway routes external API requests to internal service URLs.
- Database URLs are stored as Railway secrets.
- Supabase keys and external API keys are stored as Railway secrets.

Important considerations:

- Railway injects a `PORT` value for public services. The gateway must either listen on the expected port or Railway must be configured to route to the port nginx uses.
- Node services already read `process.env.PORT`; verify each Railway service has a matching port configuration.
- Gateway upstream names may need Railway internal service hostnames rather than Compose service DNS names.
- Keep only the gateway public unless a service has a direct public-use case.
- Add a gateway health endpoint before relying on Railway health checks.

Required backend secrets include:

- `PROFILE_DB_URL`
- `COMMUNITY_DB_URL`
- `MATCHES_DB_URL`
- `ROOMS_DB_URL`
- `ANALYTICS_DB_URL`
- `HISTORY_DB_URL`
- `CARDS_DB_URL`
- `OFFSEASON_DB_URL`
- `NEWS_DB_URL`
- `FEEDBACKMAIL_DB_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `GETXAPI_KEY`
- `NEWS_API_KEY`

## Vercel Deployment Considerations

The frontend should be deployed to Vercel with environment-specific public variables.

Required variables:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_SUPABASE_FEEDBACK_BUCKET`

Optional or feature-specific variables:

- `VITE_ADMIN_STORE_URL`
- `VITE_ELEVENLABS_AGENT_ID`
- `VITE_CHAT_DEV_USER_ID`

Rules:

- Never expose backend secrets through `VITE_*` variables.
- `VITE_API_BASE_URL` should point to the public gateway domain.
- `VITE_SUPABASE_URL` should point to the public Supabase HTTPS domain.
- Vercel preview, staging, and production environments should have separate values.

## nginx Gateway Strategy

`gateway/nginx.conf` remains the main API gateway config.

For Compose-based local development, Compose service DNS names are appropriate.

For Railway, gateway upstreams may need to become environment-specific internal service URLs. That can be handled in a later PR by either:

- templating nginx config at container startup, or
- maintaining a Railway-specific gateway config, or
- configuring Railway service names so nginx can resolve them consistently.

The current gateway config is enough for local Compose and Tec-compatible Compose flows. It is not yet fully production-ready for Railway without validating port handling, upstream DNS, and CORS.

## `nginx-demo.conf` Status

`nginx-demo.conf` is Tec/demo legacy.

Do not remove it yet.

It should remain until Railway and Vercel staging are validated. After staging works through the normal nginx gateway, remove or archive `nginx-demo.conf` in a dedicated cleanup PR.

## Risk Analysis

### Supabase Risks

- Supabase Auth callbacks may fail if staging and production URLs are not configured correctly.
- Storage public URLs may break if the public Supabase domain changes without updating environment variables and object URL behavior.
- Service-role keys must never be exposed to frontend code.
- Moving Supabase away from Tec networking without verified backups can risk data loss.
- OAuth provider configuration may still reference old local, Tec, or temporary domains.

### Railway Risks

- Gateway may not listen on the Railway-expected port without configuration.
- nginx may fail to resolve upstreams if Railway internal service DNS differs from Compose DNS.
- Private service networking must be validated per Railway environment.
- Database connections may fail if self-hosted Supabase only allows Tec/local network access.
- Managed or self-hosted Postgres endpoints may require SSL query parameters in database URLs.

### Vercel Risks

- Vite variables are build-time values. Wrong environment values require a new deployment.
- Frontend Auth and Storage calls depend on `VITE_SUPABASE_URL` being publicly reachable.
- CORS must allow the final Vercel domains.

### Gateway/CORS Risks

- Existing demo CORS rules are broad and should not be the final production policy.
- Credentials and bearer-token routes require careful origin handling.
- Gateway health checks and error behavior should be explicit before production.

## Low-Risk Migration Order

1. Finalize this target architecture document.
2. Inventory current self-hosted Supabase runtime configuration.
3. Provision staging domains:
   - `app-staging.example.com`
   - `api-staging.example.com`
   - `supabase-staging.example.com`
4. Put self-hosted Supabase staging behind HTTPS.
5. Validate Supabase Auth, Storage, and database access through the staging domain.
6. Prepare Railway gateway deployment with a health endpoint and validated port handling.
7. Deploy the gateway and a minimal backend service set to Railway staging.
8. Deploy the frontend to Vercel staging.
9. Validate end-to-end staging flows.
10. Expand backend service coverage.
11. Prepare production domains and repeat the same steps.
12. Remove `nginx-demo.conf` only after Railway/Vercel staging works.

## Proposed Phase 4 PR Roadmap

### Phase 4.1A: Target Architecture Documentation

Add this architecture document only.

No runtime behavior changes.

### Phase 4.1B: Supabase Runtime Inventory

Document current Supabase runtime configuration:

- domains and public URLs,
- Auth callback URLs,
- Storage bucket settings,
- Postgres access method,
- backup locations and restore process.

### Phase 4.1C: Gateway Deployment Readiness

Prepare nginx for Railway deployment:

- health endpoint,
- port handling,
- deployment notes.

No route simplification yet.

### Phase 4.1D: Gateway Upstream Strategy

Define how nginx resolves Railway internal services:

- config templating,
- Railway internal URLs,
- fallback behavior for Compose.

### Phase 4.1E: Production CORS Policy

Replace demo-oriented origins with explicit staging and production origins.

Keep local development support.

### Phase 4.1F: Vercel Staging Setup

Document and validate frontend environment variables:

- `VITE_API_BASE_URL`,
- `VITE_SUPABASE_URL`,
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Phase 4.1G: Tec Demo Proxy Retirement

Remove or archive `nginx-demo.conf` after staging is proven through Railway and Vercel.

### Phase 4.2: Data Migration Readiness

Only after infrastructure staging works:

- verify backups,
- collect schema and row counts,
- define cutover plan,
- plan Supabase Auth and Storage migration if needed.
