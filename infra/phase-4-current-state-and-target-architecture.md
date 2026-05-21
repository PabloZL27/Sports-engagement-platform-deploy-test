# Phase 4 Current State and Target Architecture

## 1. Purpose

This document gives future Codex sessions and team members full context for the Phase 4 infrastructure migration.

The goal is not only to make the current staging setup reachable. The final goal is a complete, stable migration where:

- The frontend deploys automatically from GitHub to Vercel.
- Backend services deploy automatically from GitHub.
- The platform no longer depends on the Tec VM as the main production or staging host.
- Services can be added without overloading a single VM/container environment.
- Database and Supabase are moved to stable managed infrastructure or another clearly defined production-ready setup.
- CI/CD supports the team workflow where merging to `main` deploys changes.

This document records what has already been tried, what worked, what failed, what is temporary, and what the final migration direction is.

## 2. Current State

- Frontend is deployed on Vercel.
- Vercel has `VITE_API_BASE_URL` set to:

  ```text
  https://api-staging.pzapata.com
  ```

- Domain `pzapata.com` is managed through Cloudflare.
- `api-staging.pzapata.com` points to a Cloudflare Tunnel.
- Cloudflare Tunnel is installed on the Tec VM.
- Cloudflare Tunnel is running persistently through systemd as:

  ```text
  cloudflared.service
  ```

- The tunnel routes:

  ```text
  api-staging.pzapata.com -> http://localhost:8081 on the Tec VM
  ```

- `localhost:8081` maps to the existing `icarus-gateway` container.
- `icarus-gateway` routes to the current Docker Compose microservices.
- Supabase/Postgres is still self-hosted on the Tec VM.
- Docker Compose services are still running on the Tec VM/Coolify deployment.
- Matches service works through the public staging API.
- Store service is reachable but currently reports DB disconnected.
- Frontend can reach the staging API.
- There is a frontend route issue where:

  ```text
  /matches?teamSlug=tennessee-titans
  ```

  gets redirected by nginx.

- The slash-safe expected form is:

  ```text
  /matches/?teamSlug=tennessee-titans
  ```

## 3. What Has Been Tried

### Railway Staging Feasibility

Railway staging feasibility was investigated.

Finding:

- Gateway-only Railway deployment is not viable as a quick patch.

Reason:

- Current nginx upstreams depend on Docker Compose service DNS names such as `matches-service`, `profile-service`, and `store-service`.
- Railway cannot resolve those Docker-internal names unless the relevant services are also deployed there or the gateway config is adapted for Railway service DNS.
- Most useful backend services also require database connectivity, and Railway cannot currently reach the Tec VM's Docker-internal Supabase/Postgres host.

Conclusion:

- Small Railway slices may still be useful later.
- Railway should not be used as a partial gateway-only patch.

### Coolify/Traefik Direct Public Exposure

The desired flow was:

```text
Vercel frontend
  -> https://api-staging.<domain>
  -> Coolify/Traefik
  -> icarus-gateway:8080
  -> internal services
```

Finding:

- Direct exposure failed.

Reason:

- The Tec VM is behind NAT/firewall.
- Public inbound traffic does not reliably reach the VM.
- Cloudflare returned `522` when trying direct DNS/proxied access.

Conclusion:

- Coolify/Traefik direct public exposure is architecturally reasonable, but not viable on the current Tec VM network path without solving inbound access.

### Cloudflare Tunnel

Cloudflare Tunnel was adopted as the current staging exposure solution.

Current flow:

```text
Vercel frontend
  -> https://api-staging.pzapata.com
  -> Cloudflare Tunnel
  -> Tec VM localhost:8081
  -> icarus-gateway
  -> internal Docker services
```

Finding:

- This works behind NAT.
- It makes the existing backend reachable from Vercel.

Important clarification:

- This is a valid staging bridge.
- This is not the final migration target.
- It does not remove the Tec VM dependency.
- It does not reduce service load on the Tec VM.
- It does not provide full backend CI/CD.

## 4. Current Temporary Staging Architecture

```text
GitHub
  -> Vercel frontend deploy
  -> Vercel app uses VITE_API_BASE_URL=https://api-staging.pzapata.com
  -> Cloudflare DNS/Tunnel
  -> cloudflared.service on Tec VM
  -> http://localhost:8081
  -> icarus-gateway container
  -> Docker Compose microservices
  -> self-hosted Supabase/Postgres on Tec VM
```

This architecture is temporary and staging-oriented.

It is useful because:

- Vercel can reach the backend.
- The current backend stack remains unchanged.
- It avoids immediate public inbound networking changes on the Tec VM.
- It preserves the current Docker Compose/Coolify runtime while migration planning continues.

It is limited because:

- The Tec VM is still a central dependency.
- Backend deploys are not yet automated from GitHub.
- Supabase/Postgres remains self-hosted on the Tec VM.
- All services still share the constrained Tec VM runtime.
- Cloudflare Tunnel is acting as a bridge, not as a full backend migration strategy.

## 5. Final Target Architecture

### Frontend

- Vercel connected to GitHub.
- Merges to `main` trigger automatic frontend deployment.
- Preview deployments for PRs if possible.
- Frontend uses environment-specific public API and Supabase URLs.
- Frontend should not contain backend-only secrets.

### Backend

- Backend services should be independently deployable or deployed through a reliable orchestrated backend flow.
- Backend CI/CD should trigger after merges to `main`.
- New services should be easy to add using a clear template:
  - service folder
  - Dockerfile or build config
  - package scripts
  - env contract
  - healthcheck
  - gateway route
  - DB URL
  - CI/CD deployment config

Possible backend targets still need final decision:

- Railway
- Another managed container platform
- A new VPS with proper orchestration
- A hybrid transition path

### Database and Supabase

Long term, move away from Tec VM self-hosted Supabase as the core production/staging dependency.

Evaluate:

- Managed Supabase.
- Managed Postgres.
- Railway Postgres.
- Another stable DB provider.
- A new production-ready self-hosted Supabase setup on stable infrastructure.

Database/Supabase migration must include:

- Existing DB dumps.
- Schema migration plan.
- Auth migration plan.
- Storage bucket migration.
- RLS/policy migration.
- Environment variable updates.
- Backup verification.
- Restore testing.
- Rollback plan.

### Gateway

- Keep nginx gateway for now unless there is a clear replacement.
- Routes should be explicit and consistent.
- CORS should be cleaned up and aligned with Vercel staging/production domains.
- Avoid hardcoded Tec IPs, localhost assumptions, and provider-specific values in base configs.

### Infrastructure

- Avoid concentrating all services plus Supabase plus Coolify on the same constrained Tec VM.
- Use the Tec VM only as a temporary/staging bridge until full migration is complete.
- Keep Tec-specific settings isolated in Tec-specific override files.
- Preserve docker-compose portability work already completed.

## 6. Known Issues

### Frontend Route Slash Issue

Current issue:

```text
/matches?teamSlug=tennessee-titans
```

gets redirected by nginx.

Expected slash-safe form:

```text
/matches/?teamSlug=tennessee-titans
```

This should be fixed in frontend routing/API URL construction and deployed through the GitHub/Vercel flow.

### Store Service DB Disconnected

Store service is reachable through the staging API, but currently reports DB disconnected.

This needs investigation separately from gateway reachability.

### Temporary Cloudflare Tunnel Dependency

The staging API currently depends on:

```text
api-staging.pzapata.com -> Cloudflare Tunnel -> Tec VM localhost:8081
```

This is acceptable as a temporary bridge but not a final architecture.

### Supabase Still on Tec VM

Supabase Auth, Storage, and Postgres remain self-hosted on the Tec VM.

### Backend CI/CD Not Complete

Frontend is on Vercel, but backend deployment automation from GitHub is not yet complete.

## 7. Migration Risks

- Treating Cloudflare Tunnel as the final architecture would leave the Tec VM as the central backend dependency.
- Moving backend services to Railway before solving database connectivity would create partial deployments that cannot serve real traffic.
- Changing Supabase/Auth/Storage URLs without a complete migration plan can break login, storage URLs, callbacks, and persisted object URLs.
- Tightening CORS too early can break working staging traffic.
- Leaving broad CORS rules permanently creates security risk.
- Updating gateway routing without validation can break multiple frontend workflows at once.
- Migrating DBs without restore testing risks data loss or long downtime.
- Keeping all services on one constrained VM risks overload as more services are added.

## 8. Recommended Next Steps

1. Document the current Cloudflare Tunnel setup and operational commands.
2. Fix the frontend `/matches` route slash issue in code and deploy via GitHub/Vercel flow.
3. Validate Vercel staging end to end:
   - Matches
   - Auth/profile
   - Store
   - Community
   - Rooms
4. Investigate store-service DB disconnected.
5. Define final hosting decision for backend services.
6. Define database/Supabase migration target.
7. Create CI/CD roadmap:
   - frontend Vercel auto-deploy
   - backend auto-deploy
   - PR checks
   - secrets/env handling
   - rollback
8. Plan migration away from Tec VM in phases.

## 9. Constraints / Non-Goals

- Do not rewrite business logic unnecessarily.
- Do not make large risky runtime changes without documenting first.
- Preserve current working staging while planning final migration.
- Prefer incremental migration with rollback at every phase.
- Keep docker-compose portability work already completed.
- Avoid hardcoded localhost, Tec IPs, or provider-specific assumptions in base configs.
- Keep Tec-specific settings isolated in Tec-specific override files.
- Do not commit secrets.
- Do not treat the current Cloudflare Tunnel bridge as the final migration outcome.
- Do not use Railway as a gateway-only patch unless backend service DNS and database connectivity are solved.
- Do not remove the Tec VM path until a replacement backend and database architecture is validated.
