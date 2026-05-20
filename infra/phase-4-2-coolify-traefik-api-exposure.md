# Phase 4.2 Coolify/Traefik API Exposure Plan

## Goal

Expose the existing `icarus-gateway` publicly over HTTPS for the Vercel staging frontend.

This phase should only configure public ingress for the already-running gateway. It should not change service code, database schemas, secrets, Supabase configuration, Docker Compose files, frontend code, or backend business logic.

## Target Flow

```text
Vercel frontend
  -> https://api-staging.<domain>
  -> Coolify/Traefik
  -> icarus-gateway:8080
  -> internal Docker services
```

The gateway remains the single public API entrypoint. Backend services remain private on the existing Docker network.

## Why This Is Lower Risk Than Railway Right Now

Railway is not the lowest-risk immediate path because:

- The current gateway upstreams use Docker/Compose service DNS names.
- Railway cannot resolve Tec/Coolify Docker-internal names.
- Most useful backend services require direct database connectivity.
- Current Supabase/Postgres is internal to the Tec/Coolify Docker network.
- Railway would require either gateway templating, Railway-specific DNS, or deploying service slices before it can be useful.

Coolify/Traefik exposure is lower risk because:

- The existing app services and Supabase already share the working Docker network.
- `icarus-gateway` already routes to internal services successfully.
- Only one public route needs to be added.
- It directly fixes the Vercel `localhost:8081` problem.
- It avoids exposing individual backend services.
- It avoids immediate database networking changes.

## Current Known Gateway State

From runtime findings:

```text
icarus-gateway
host port 8081 -> container port 8080
network: do4ksgcc0wksg4wwg4osgk0o
```

The gateway should be targeted by Traefik on:

```text
icarus-gateway:8080
```

Do not use `nginx-demo.conf` for this path. It is legacy/Tec/demo only.

## Required Coolify Configuration

In Coolify, configure a public HTTPS route for the existing gateway.

Recommended settings:

```text
Application/service: existing icarus-gateway
Public domain: api-staging.<domain>
Target container port: 8080
Protocol: HTTPS
Proxy: Coolify Traefik
TLS: enabled
Certificate: Let's Encrypt / Coolify-managed
HTTP to HTTPS redirect: enabled if available
```

Important:

- Route to the gateway container port `8080`, not the host-published port `8081`.
- Keep the existing `8081` host port during validation.
- Do not expose individual service containers publicly.
- Do not change service environment variables in this phase unless a separate approved task is opened.

## Required DNS / Domain Setup

Create a staging API DNS record:

```text
api-staging.<domain>
```

Point it to the current Coolify/Traefik host public address.

Recommended record type:

```text
A     api-staging.<domain> -> <public-host-ip>
```

or, if using a canonical host:

```text
CNAME api-staging.<domain> -> <coolify-public-hostname>
```

Before enabling Vercel against this API, confirm:

- DNS resolves publicly.
- Traefik has issued a valid HTTPS certificate.
- HTTP redirects to HTTPS, if configured.
- `https://api-staging.<domain>` routes to `icarus-gateway`.

## Required Gateway / CORS Checks

The Vercel frontend origin must be allowed by gateway CORS.

Required staging frontend origin:

```text
https://app-staging.<domain>
```

If using a Vercel-generated preview domain temporarily, allow only the specific preview origin during testing.

Current known CORS considerations:

- Gateway CORS already allows localhost for development.
- Gateway CORS currently includes broad temporary patterns such as `trycloudflare.com`, `sslip.io`, and `nip.io`.
- `/profile/` currently reflects `$http_origin` rather than using the filtered allowlist.

Do not tighten or refactor CORS in the same runtime change that first exposes the gateway. First confirm the public route works, then make a small follow-up PR/config change for CORS hardening if needed.

Minimum staging check:

```text
Origin: https://app-staging.<domain>
Access-Control-Allow-Origin: https://app-staging.<domain>
```

## Required Vercel Environment Update

In the Vercel staging frontend environment, update:

```text
VITE_API_BASE_URL=https://api-staging.<domain>
```

Remove or replace any staging value like:

```text
VITE_API_BASE_URL=http://localhost:8081
```

Do not use:

```text
10.14.255.82
localhost
icarus-gateway
matches-service
profile-service
supabase-db
```

The frontend must use a browser-reachable HTTPS API origin.

## Validation Commands

Run these from the Coolify host:

```bash
curl -i http://127.0.0.1:8081/store/health
curl -i http://10.14.255.82:8081/store/health
```

Run these from a machine outside the Docker host/network:

```bash
curl -i https://api-staging.<domain>/store/health
curl -i https://api-staging.<domain>/matches/health
curl -i https://api-staging.<domain>/profile/health
```

Check CORS from outside the Docker host/network:

```bash
curl -i \
  -H "Origin: https://app-staging.<domain>" \
  https://api-staging.<domain>/store/health
```

Check preflight:

```bash
curl -i -X OPTIONS \
  -H "Origin: https://app-staging.<domain>" \
  -H "Access-Control-Request-Method: GET" \
  https://api-staging.<domain>/store/health
```

After Vercel env update and redeploy:

- Open the Vercel staging frontend.
- Confirm browser network requests use `https://api-staging.<domain>`.
- Confirm no browser requests use `localhost:8081`.
- Confirm no browser requests use Docker-internal hostnames.
- Confirm `/store/health` succeeds.
- Confirm one DB-backed route behavior is understood, even if DB-dependent failures are unrelated to exposure.

## Rollback Plan

If public API exposure causes issues:

1. Revert Vercel staging `VITE_API_BASE_URL` to the previous value or remove it.
2. Disable or remove the Coolify/Traefik route for `api-staging.<domain>`.
3. Keep the existing local/Tec gateway path on `8081`.
4. Do not restart backend services unless required by Coolify for route removal.
5. Confirm current local gateway still works:

   ```bash
   curl -i http://127.0.0.1:8081/store/health
   ```

This rollback should not require database changes, schema changes, service code changes, or secret rotation.

## Risks and Blockers

### Risks

- DNS may not point to the correct Coolify/Traefik host.
- Traefik certificate issuance may fail if DNS or HTTP challenge is not reachable.
- CORS may reject the Vercel staging origin.
- `/profile/` has a different CORS behavior than most gateway routes.
- Existing backend DB issues may appear after public routing works; those should not be confused with gateway exposure problems.
- Stripe checkout redirects may still require `FRONTEND_URL` to point to the Vercel staging domain.

### Blockers

- No public domain available for `api-staging.<domain>`.
- DNS cannot point to the Coolify/Traefik host.
- Coolify cannot route the existing `icarus-gateway` service to port `8080`.
- Gateway container is not attached to the expected Docker network.
- Vercel staging domain is not known, so CORS cannot be made precise.

## Explicit Non-Goals

Do not change in this phase:

- Service code.
- Gateway code.
- Frontend code.
- Docker Compose files.
- Supabase configuration.
- Database schemas.
- Database credentials.
- OAuth credentials.
- Stripe secrets.
- Runtime secrets.
- Storage buckets or policies.

This phase is only for planning and later manually configuring HTTPS ingress to the existing gateway.

## Recommended Next Action

When ready for runtime work, perform a small manual Coolify/Traefik change:

```text
api-staging.<domain> -> icarus-gateway:8080
```

Then update only the Vercel staging environment:

```text
VITE_API_BASE_URL=https://api-staging.<domain>
```

Validate with `curl` and browser network requests before any further infrastructure migration.
