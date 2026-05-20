# Phase 4.1F Findings Analysis and Migration Blockers

## Executive Summary

The live runtime confirms that the platform has a complete self-hosted Supabase stack, active application containers, a working gateway layer, and Coolify-managed Traefik ingress. This is a strong starting point for migration because the system is already containerized and Supabase is running as a coherent stack.

The main migration blockers are not missing services. They are environment coupling issues:

- Supabase public URLs are tied to `supabase.10.14.255.82.nip.io`.
- Supabase runtime URLs currently use HTTP.
- Supabase Auth still contains localhost redirect assumptions.
- Google OAuth callback URLs are tied to the current `nip.io` host.
- Railway cannot reach the current internal Docker network.
- Supabase Postgres is not externally reachable from Railway today.
- Storage public URLs may already be persisted with the old Supabase public URL.

The safest path is to define stable staging domains first, stand up HTTPS for Supabase and the API gateway, update Auth/OAuth configuration in a controlled staging path, then decide the database connectivity model for Railway. No production migration should begin until the live Supabase runtime configuration, bucket policies, and backup/restore readiness are fully captured.

## Critical Blockers

### Supabase Is Coupled to `supabase.10.14.255.82.nip.io`

The live Supabase runtime uses the `nip.io` host across public URL variables, Coolify FQDN values, Auth callback settings, and Traefik routing labels.

Observed pattern:

```text
supabase.10.14.255.82.nip.io
```

This blocks target staging and production architecture because Vercel, Railway, OAuth providers, and browser clients need stable application-owned domains.

### Supabase Runtime Uses HTTP URLs

Current Supabase runtime URL variables point to HTTP URLs.

Observed pattern:

```text
http://supabase.10.14.255.82.nip.io
```

The target architecture requires HTTPS for:

- Browser Auth flows.
- OAuth callback reliability.
- Storage object URLs.
- Vercel frontend usage.
- Production API expectations.
- Secure backend-to-Supabase calls.

### Auth Depends on Localhost Settings

Supabase Auth currently includes localhost-oriented settings:

```text
GOTRUE_SITE_URL=http://localhost:5173
GOTRUE_URI_ALLOW_LIST=http://localhost:5173/auth/callback
```

This blocks staging and production frontend deployment because successful redirects need environment-specific frontend URLs, not local dev URLs.

### OAuth Callback URLs Are Environment-Coupled

Google OAuth is enabled, but callback URLs currently point to the `nip.io` Supabase host:

```text
http://supabase.10.14.255.82.nip.io/auth/v1/callback
```

Staging and production need explicit Google OAuth authorized callback URLs for the future Supabase domains.

### Railway Cannot Access the Internal Docker Network

The current app and Supabase stack share the Docker bridge network:

```text
do4ksgcc0wksg4wwg4osgk0o
```

Railway services will not be attached to this network. Any backend service that currently relies on internal Docker DNS, internal Supabase hostnames, or Docker-local database access needs externally reachable equivalents.

### Postgres Is Not Externally Reachable

The Supabase Postgres container exposes `5432/tcp` internally but is not directly published to the public host interface. The observed `pg-proxy-temp` container binds Postgres to:

```text
127.0.0.1:5432
```

This enables local host access only. It does not provide a Railway-compatible database endpoint.

### Storage URLs May Be Coupled to the Old Supabase Public URL

The app generates public object URLs through Supabase Storage for buckets such as:

- `avatars`
- `feedback-images`
- `store-images`

If generated URLs are persisted in application databases, existing rows may point to the old `nip.io` Supabase public URL. This needs verification before changing Supabase domains.

## Medium-Risk Items

### `nginx-demo.conf` Legacy Proxy

`nginx-demo.conf` remains a Tec/demo legacy file. It is not the primary migration blocker, but it can confuse future deployment ownership if it remains near production configs without clear separation.

### Broad CORS Rules

Gateway CORS still permits broad temporary and IP-derived domains such as:

- `trycloudflare.com`
- `sslip.io`
- `nip.io`
- localhost variants

This should be tightened after staging and production domains are finalized and validated.

### `pg-proxy-temp`

`pg-proxy-temp` provides localhost-only Postgres access through `127.0.0.1:5432`. It is useful for host-local operations but should not be treated as a production connectivity strategy.

### Legacy `icarus-*` Names

The current live containers still use `icarus-*` names. Phase 2 made the repo's base gateway portable with Compose service DNS, but the live Tec/Coolify runtime still has legacy container naming.

### Internal Docker DNS Assumptions

Supabase services currently use internal Docker DNS names such as:

- `supabase-db`
- `supabase-kong`
- `supabase-auth`
- `supabase-storage`
- `supabase-rest`
- `supabase-supavisor`

These are valid inside the current Docker network only.

## What Is Safe / Already Good

- A full self-hosted Supabase stack exists and is running.
- Supabase Auth, Storage, Realtime, REST, Kong, Studio, Meta, Supavisor, Postgres, MinIO, and related services were discovered.
- Major Supabase containers are healthy.
- Coolify/Traefik ingress already exists.
- Let’s Encrypt ACME support is enabled in Traefik.
- Postgres is not publicly exposed by default.
- Application services are already containerized.
- The app gateway exists and is running.
- App services and Supabase share a Docker network today, which explains why current internal communication works.
- Supabase Storage is backed by a self-hosted MinIO service.
- Google OAuth is already configured and enabled.

## Railway Impact

Before Railway backend deployment, the project needs a clear replacement for Docker-network-local access.

Railway backend services will need:

- Public or private access to each active service database.
- A stable `SUPABASE_URL` over HTTPS.
- A stable Supabase Auth/Storage URL that does not depend on `nip.io`.
- Backend secrets configured in Railway, not in frontend envs.
- Service-to-service routing that does not rely on `icarus-*` container names.
- A gateway deployment model that honors Railway `PORT` handling.
- A decision on whether nginx runs as a single public Railway service or whether services are exposed individually behind Railway networking.

Railway cannot use the current `do4ksgcc0wksg4wwg4osgk0o` Docker network, `supabase-db` internal DNS, or localhost-only `pg-proxy-temp` database access.

## Vercel Impact

Before Vercel frontend deployment, the frontend needs stable public environment values:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_SUPABASE_FEEDBACK_BUCKET`, if the default bucket should be overridden

Vercel must not receive backend-only secrets such as:

- Supabase service role keys.
- Database URLs.
- OAuth client secrets.
- Stripe secret keys.
- SMTP passwords.

Supabase Auth must allow the Vercel staging and production frontend domains as redirect targets.

## Supabase Domain/HTTPS Migration Requirements

The target architecture requires replacing the current `nip.io`/HTTP Supabase URL with stable HTTPS domains:

```text
https://supabase-staging.example.com
https://supabase.example.com
```

Required prerequisites:

- DNS records for staging and production Supabase domains.
- Traefik or another reverse proxy routing those domains to Supabase Kong.
- HTTPS certificates issued and renewed automatically.
- Supabase runtime variables updated in the relevant environment:
  - `SUPABASE_PUBLIC_URL`
  - `API_EXTERNAL_URL`
  - `SITE_URL`
  - public REST/API URL variables where applicable
- Frontend and backend envs updated to point to the stable HTTPS Supabase URL.
- Verification that Auth, Storage, REST, and any public object URLs work through the new domain.

These are requirements for future implementation. This document does not propose changing production immediately.

## Auth/OAuth Migration Requirements

Auth migration requires coordinated updates across Supabase Auth, frontend deployment, and Google OAuth configuration.

Required future values:

- Staging frontend site URL:
  - `https://app-staging.example.com`
- Production frontend site URL:
  - `https://app.example.com`
- Staging Supabase OAuth callback:
  - `https://supabase-staging.example.com/auth/v1/callback`
- Production Supabase OAuth callback:
  - `https://supabase.example.com/auth/v1/callback`

Supabase Auth needs environment-appropriate settings for:

- `GOTRUE_SITE_URL`
- `GOTRUE_URI_ALLOW_LIST`
- `ADDITIONAL_REDIRECT_URLS`
- Google OAuth redirect URI/callback settings

Google OAuth console configuration must include the new callback URLs before switching frontend users to the new domains.

## Storage Migration Implications

The current app uses Supabase Storage for:

- Profile avatars.
- Feedback images.
- Store product images.

The storage stack is self-hosted and backed by MinIO. The app uses Supabase-generated public URLs, so the configured Supabase public URL affects new object URLs.

Storage items to verify before migration:

- Bucket existence.
- Bucket public/private status.
- Row-level security policies.
- File size limits.
- MIME type limits.
- Object counts.
- Whether public URLs are persisted in app database rows.
- Whether existing persisted URLs point to `supabase.10.14.255.82.nip.io`.

If old public URLs are persisted, a later data cleanup or compatibility redirect may be needed after the Supabase public domain changes.

## Database Connectivity Implications

Railway needs a database connectivity path that does not rely on the current Docker network.

Possible approaches:

### Public Postgres or Supavisor With TLS and Allowlisting

Expose a database endpoint through Postgres or Supavisor with:

- TLS enabled.
- Strict firewall rules.
- Railway egress/IP allowlisting where feasible.
- Per-service credentials.
- Connection pooling limits.

This keeps the backend on Railway while keeping Supabase self-hosted, but it requires careful network security and operational monitoring.

### VPN or Tunnel

Use a private network, VPN, or secure tunnel between Railway services and the Supabase host.

This avoids broad public database exposure but adds operational complexity and a new availability dependency.

### Keep Backend Near Supabase

Keep backend services on the same host or same private network as Supabase while moving only the frontend to Vercel first.

This is operationally conservative and avoids immediate external database exposure, but it delays the full Railway backend migration.

### Move Supabase to a New VPS Later

Move the self-hosted Supabase stack to a stable VPS or managed infrastructure with a stable domain, TLS, backups, and explicit database exposure strategy.

This can remove Tec-specific coupling, but it is a larger infrastructure migration and should follow verified backups and restore testing.

## Recommended Migration Path

1. Finish documenting live Supabase configuration.
   - Confirm bucket policies, object counts, database list, roles, TLS behavior, and backup/restore status.

2. Create stable staging domains.
   - `app-staging.example.com`
   - `api-staging.example.com`
   - `supabase-staging.example.com`

3. Validate HTTPS routing to Supabase Kong on staging domain.
   - Do not remove the current `nip.io` route until staging is verified.

4. Prepare Auth/OAuth staging settings.
   - Add staging callback URLs in Google OAuth.
   - Add staging redirect URLs in Supabase Auth.

5. Validate Vercel staging frontend against staging Supabase/API URLs.
   - Use frontend-safe env only.

6. Decide Railway database connectivity model.
   - Public TLS endpoint with allowlisting, VPN/tunnel, backend-near-Supabase, or move Supabase first.

7. Deploy a minimal Railway staging backend path.
   - Start with gateway and one low-risk service.
   - Use staging envs and non-destructive validation.

8. Confirm Storage behavior on staging domain.
   - Upload, retrieve, and render objects.
   - Check whether persisted URLs require compatibility handling.

9. Only after staging is stable, plan production domain changes.
   - Keep rollback path to current Tec/Coolify runtime until production validation is complete.

## Updated Phase 4 Progress Tracker

| Phase | Status | Output |
| --- | --- | --- |
| 4.1A Target Architecture Definition | Done | `infra/phase-4-target-architecture.md` |
| 4.1B Supabase Runtime Inventory | Done | `infra/supabase-runtime-inventory.md` |
| 4.1C Supabase Runtime Export Checklist | Done | `infra/supabase-runtime-export-checklist.md` |
| 4.1D Runtime Export Execution Plan | Done | `infra/phase-4-runtime-export-execution-plan.md` |
| 4.1E Live Runtime Findings | Done | `infra/phase-4-live-runtime-findings.md` |
| 4.1F Findings Analysis and Migration Blockers | Current | `infra/phase-4-findings-analysis.md` |

## Source Documents

This analysis is based on:

- `infra/phase-4-target-architecture.md`
- `infra/supabase-runtime-inventory.md`
- `infra/supabase-runtime-export-checklist.md`
- `infra/phase-4-runtime-export-execution-plan.md`
- `infra/phase-4-live-runtime-findings.md`
