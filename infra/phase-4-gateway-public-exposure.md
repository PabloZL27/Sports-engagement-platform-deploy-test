# Phase 4.2B Gateway Public Exposure Investigation

## Purpose

This document investigates how the current nginx API gateway can be exposed publicly for the Vercel frontend without changing runtime behavior yet.

This phase is documentation and planning only. It does not change Docker Compose, Coolify, Traefik, nginx, backend services, Supabase, or frontend code.

## Current Problem

The Vercel frontend cannot use the current local development API settings because:

- `VITE_API_BASE_URL=http://localhost:8081` points at the browser user's own machine, not the deployment host.
- Docker-internal service names are not resolvable from Vercel or from the browser.
- The current public API exposure strategy has not been formalized.
- CORS is not yet explicitly configured for the Vercel staging domain.

The frontend needs a public HTTPS API origin, for example:

```text
https://api-staging.example.com
```

## Current Gateway Exposure Assumptions

### Repository Configuration

The base Compose file defines the gateway as:

```yaml
gateway:
  container_name: icarus-gateway
  ports:
    - "8081:8080"
```

The gateway container listens internally on port `8080`.

The host publishes:

```text
host port 8081 -> gateway container port 8080
```

The gateway is attached to the shared application/Supabase network:

```text
supabase_net
```

In the current live Tec/Coolify environment, that shared network is:

```text
do4ksgcc0wksg4wwg4osgk0o
```

### Live Runtime Findings

The live `docker ps` output showed:

```text
icarus-gateway  80/tcp, 0.0.0.0:8081->8080/tcp, :::8081->8080/tcp
```

This means the gateway is published on the host at port `8081`.

That does not automatically make it a Vercel-ready public API because:

- The host IP shown in prior runtime findings is private/Tec-network oriented.
- The current intended frontend deployment is on the public internet.
- Browser calls from Vercel require a reachable public origin.
- Production browser calls should use HTTPS.
- CORS must allow the Vercel staging origin.

## Current Reverse Proxy Chain

### Supabase Chain

The live Supabase public chain is:

```text
Browser -> Coolify Traefik -> Supabase Kong -> Supabase services
```

Supabase Kong is not directly published to host ports. Traefik routes to Kong through Coolify-managed labels.

### Application Gateway Chain Today

The application gateway currently appears to be reachable on the host through direct port publishing:

```text
Host port 8081 -> icarus-gateway:8080 -> backend services
```

From the repository and collected runtime findings, the app gateway is not yet confirmed as being exposed through a stable Traefik HTTPS route such as:

```text
https://api-staging.example.com -> Traefik -> icarus-gateway:8080
```

### `nginx-demo.conf`

`nginx-demo.conf` is marked legacy/Tec/demo only.

It assumes:

```text
frontend: 10.14.255.82:4173
gateway:  10.14.255.82:8081
```

It should not be used for Vercel staging or portable production routing. It is not the recommended public API exposure path.

## Current Gateway Routing

`gateway/nginx.conf` remains the active application API gateway config.

It routes public path prefixes to internal Compose service DNS names:

| Gateway path | Upstream |
| --- | --- |
| `/matches/` | `matches-service:4002` |
| `/rooms/` | `rooms-service:4003` |
| `/analytics/` | `analytics-service:4004` |
| `/store/` | `store-service:4005` |
| `/news/` | `news-service:4011` |
| `/feedback` and `/feedback/` | `feedback-service:4012` |
| `/profile/` | `profile-service:4006` |
| `/cards/` and `/api/cards/` | `cards-service:4009` |
| `/tweets` | `tweets-service:4007` |
| `/history/` | `history-service:4008` |
| `/offseason/` | `offseason-service:4010` |
| `/community/` | `community-service:4001` |
| `/dashboard/` | `dashboard-service:4015` |
| `/admin-store/` | `admin-store-service:4013` |
| `/webhooks/stripe` | `admin-store-service:4013` |

This is correct for containers sharing the same Docker network. It is not directly resolvable outside Docker, which is why the public entrypoint must be the gateway, not the individual service names.

## Is the Existing Gateway Already Publicly Reachable?

The gateway is host-published on port `8081`.

From the live output, it is reachable at least from the host and possibly from machines that can route to the host:

```text
http://<host>:8081
```

It is not yet confirmed as a stable public Vercel-ready API because:

- No stable public API domain was confirmed.
- No HTTPS Traefik route to `icarus-gateway` was confirmed.
- `10.14.255.82` is a private/internal network address.
- Vercel cannot use `localhost:8081`.
- A browser on the public internet generally cannot route to `10.14.255.82:8081`.

Manual verification commands for the server/operator:

```bash
curl -i http://127.0.0.1:8081/store/health
curl -i http://10.14.255.82:8081/store/health
curl -i https://api-staging.example.com/store/health
```

The first two validate host/local network exposure. The final command validates the desired public HTTPS route after it exists.

## Lowest-Risk Public Exposure Path

The lowest-risk path is to keep the current nginx gateway as the single public API entrypoint and expose it through Coolify/Traefik with a staging API domain.

Recommended target chain:

```text
Vercel frontend
  -> https://api-staging.example.com
  -> Coolify Traefik
  -> icarus-gateway:8080
  -> internal backend services over Docker network
```

This path is low risk because:

- It does not expose every backend service individually.
- It preserves the existing gateway routing model.
- It uses the existing Coolify/Traefik ingress system.
- It avoids `nginx-demo.conf`.
- It keeps backend service DNS internal to Docker.
- It avoids changing business logic.
- It can be tested with a staging hostname before any production switch.

## Should Traefik Expose the Gateway Directly?

Yes, for the current Tec/Coolify staging path, Traefik should expose the existing nginx gateway container directly.

Recommended Traefik target:

```text
icarus-gateway:8080
```

Recommended public domain:

```text
api-staging.example.com
```

Do not route Traefik directly to individual Node services for the first Vercel integration. That would bypass the existing gateway behavior and increase CORS, routing, and auth surface area.

## Should nginx Remain in Front?

Yes.

The nginx gateway should remain the API aggregation layer for this phase.

Reasons:

- The frontend expects one API base URL.
- The gateway already knows the route-to-service mapping.
- Backend service hostnames remain Docker-internal.
- Public exposure stays limited to one container.
- Later Railway work can decide whether nginx remains public there too.

## Can a Temporary Public URL Be Used?

A temporary public URL can be used only for short validation.

Options:

- Coolify-generated preview/domain, if available.
- Cloudflare Tunnel URL, if already configured and intentionally pointed at the gateway.
- A temporary `nip.io` or `sslip.io` hostname routed through Traefik.

Temporary URLs should not become the Vercel staging contract. The staging frontend should move quickly to:

```text
https://api-staging.example.com
```

## Required CORS Changes

Current gateway CORS allows localhost, `trycloudflare.com`, `sslip.io`, and `nip.io` patterns.

For Vercel staging, the gateway should allow the exact Vercel staging/frontend origin, for example:

```text
https://app-staging.example.com
```

If using a Vercel preview deployment temporarily, allow the specific preview origin only while testing.

Recommended eventual CORS policy:

```text
https://app-staging.example.com
https://app.example.com
http://localhost:<dev ports>
http://127.0.0.1:<dev ports>
```

Do not rely on broad `*.nip.io`, `*.sslip.io`, or `*.trycloudflare.com` rules as the final staging/production policy.

Important current edge case:

- `/profile/` currently uses `Access-Control-Allow-Origin $http_origin` rather than the filtered `$cors_origin`.
- Before production hardening, `/profile/` should use the same allowlist model as the rest of the gateway.

## Required Frontend Env Changes

In Vercel staging, set:

```text
VITE_API_BASE_URL=https://api-staging.example.com
```

Do not set:

```text
VITE_API_BASE_URL=http://localhost:8081
```

Do not use Docker service names from the frontend:

```text
matches-service
profile-service
icarus-gateway
supabase-db
```

Frontend public envs should point only to browser-reachable HTTPS origins.

## Safe Migration From `localhost:8081` to Public HTTPS API

Recommended sequence:

1. Keep the current local `localhost:8081` path for local development.
2. Create a staging API domain, for example `api-staging.example.com`.
3. Add a Traefik/Coolify route from the staging API domain to `icarus-gateway:8080`.
4. Verify the route from outside the Docker host:

   ```bash
   curl -i https://api-staging.example.com/store/health
   ```

5. Add the Vercel staging origin to gateway CORS.
6. Deploy Vercel with:

   ```text
   VITE_API_BASE_URL=https://api-staging.example.com
   ```

7. Verify browser calls from the Vercel frontend.
8. Keep the old `localhost:8081` flow for local development.
9. Remove broad temporary CORS only after staging domains are stable.

This plan avoids changing production behavior until the staging public API is validated.

## Validation Checklist

Manual checks after a future runtime exposure change:

```bash
curl -i http://127.0.0.1:8081/store/health
curl -i http://10.14.255.82:8081/store/health
curl -i https://api-staging.example.com/store/health
curl -i -H "Origin: https://app-staging.example.com" https://api-staging.example.com/store/health
curl -i -X OPTIONS -H "Origin: https://app-staging.example.com" -H "Access-Control-Request-Method: GET" https://api-staging.example.com/store/health
```

Browser checks:

- Vercel app loads.
- API requests target `https://api-staging.example.com`.
- No requests target `localhost:8081`.
- No requests target Docker-internal hostnames.
- CORS preflight succeeds.
- Authenticated profile calls include `Authorization` and are accepted.
- Store health endpoint works.
- Feedback/profile routes work through the gateway.

## Recommended First Runtime Change Later

When ready to make runtime changes, the first low-risk runtime change should be outside this documentation PR:

1. Configure a Coolify/Traefik HTTPS route for `api-staging.example.com`.
2. Point it to the existing `icarus-gateway` container on port `8080`.
3. Do not expose individual backend services.
4. Do not remove `nginx-demo.conf`.
5. Do not remove current `8081` publishing until staging is verified.

## Blockers Before Vercel Can Use the API

- A browser-reachable HTTPS API origin is not yet confirmed.
- `VITE_API_BASE_URL` must stop pointing to `localhost:8081` in Vercel.
- Gateway CORS must explicitly allow the Vercel staging frontend origin.
- `/profile/` CORS should be aligned with the gateway allowlist before production hardening.
- If using Stripe checkout, `FRONTEND_URL` on the store service must point to the Vercel staging frontend for staging checkout redirects.

## Summary Recommendation

Expose the existing nginx gateway through Coolify/Traefik at a stable staging API domain.

Use:

```text
Vercel -> https://api-staging.example.com -> Traefik -> icarus-gateway:8080 -> internal services
```

Avoid:

- `localhost:8081` in Vercel.
- Direct public exposure of every backend service.
- `nginx-demo.conf` for staging.
- Long-term reliance on tunnel or `nip.io` URLs.
