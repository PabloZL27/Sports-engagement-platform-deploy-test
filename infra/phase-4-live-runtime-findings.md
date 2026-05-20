# Phase 4.1E Live Runtime Findings

## Executive Summary

- A live self-hosted Supabase stack exists on the current host and the major Supabase containers are running healthy.
- Coolify is managing the deployed Supabase stack and application services.
- Coolify Traefik is managing ingress for HTTP/HTTPS on the host.
- Supabase Kong is running behind the Coolify Traefik proxy.
- Supabase services and application services share the same Docker bridge network.
- The Supabase Postgres container is not directly published to the public host interface.
- A temporary local Postgres proxy container exists and binds Postgres to localhost only.
- The runtime still depends on `nip.io` and `localhost` URL assumptions.
- The current Supabase public URL pattern is HTTP and IP-derived rather than a stable application-owned domain.

No secrets are included in this document. Passwords, JWT secrets, service role keys, anon keys, OAuth secrets, API keys, and database credentials are intentionally omitted.

## Docker Runtime Findings

### Supabase Containers Discovered

The live host includes a Coolify-managed self-hosted Supabase stack with these containers:

| Container | Image | Observed role | Status |
| --- | --- | --- | --- |
| `supabase-storage-do4ksgcc0wksg4wwg4osgk0o` | `supabase/storage-api:v1.14.6` | Supabase Storage API | Running, healthy |
| `supabase-auth-do4ksgcc0wksg4wwg4osgk0o` | `supabase/gotrue:v2.174.0` | Supabase Auth / GoTrue | Running, healthy |
| `supabase-rest-do4ksgcc0wksg4wwg4osgk0o` | `postgrest/postgrest:v12.2.12` | PostgREST | Running |
| `supabase-edge-functions-do4ksgcc0wksg4wwg4osgk0o` | `supabase/edge-runtime:v1.67.4` | Edge Functions runtime | Running, healthy |
| `realtime-dev-do4ksgcc0wksg4wwg4osgk0o` | `supabase/realtime:v2.34.47` | Supabase Realtime | Running, healthy |
| `supabase-supavisor-do4ksgcc0wksg4wwg4osgk0o` | `supabase/supavisor:2.5.1` | Supabase pooler | Running, healthy |
| `supabase-studio-do4ksgcc0wksg4wwg4osgk0o` | `supabase/studio:2026.01.07-sha-037e5f9` | Supabase Studio | Running, healthy |
| `supabase-meta-do4ksgcc0wksg4wwg4osgk0o` | `supabase/postgres-meta:v0.89.3` | Postgres metadata API | Running, healthy |
| `supabase-kong-do4ksgcc0wksg4wwg4osgk0o` | `kong:2.8.1` | Supabase API gateway | Running, healthy |
| `supabase-analytics-do4ksgcc0wksg4wwg4osgk0o` | `supabase/logflare:1.4.0` | Supabase analytics/logging | Running, healthy |
| `supabase-db-do4ksgcc0wksg4wwg4osgk0o` | `supabase/postgres:15.8.1.048` | Supabase Postgres | Running, healthy |
| `supabase-vector-do4ksgcc0wksg4wwg4osgk0o` | `timberio/vector:0.28.1-alpine` | Log routing | Running |
| `supabase-minio-do4ksgcc0wksg4wwg4osgk0o` | `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z` | Object storage backend | Running, healthy |
| `imgproxy-do4ksgcc0wksg4wwg4osgk0o` | `darthsim/imgproxy:v3.8.0` | Image proxy | Running, healthy |

### Application Containers Discovered

The live host also contains current application containers:

| Container | Observed role | Status |
| --- | --- | --- |
| `icarus-gateway` | Application nginx/API gateway | Running |
| `icarus-auth` | Auth service | Running |
| `icarus-profile` | Profile service | Running |
| `icarus-store` | Store service | Running |
| `icarus-news` | News service | Running |
| `icarus-history` | History service | Running |
| `icarus-cards` | Cards service | Running |
| `icarus-tweets` | Tweets service | Running |
| `icarus-matches` | Matches service | Running |
| `icarus-rooms` | Rooms service | Running |
| `icarus-offseason` | Offseason service | Running |
| `icarus-analytics` | Analytics service | Running |

Additional containers observed:

- `coolify`
- `coolify-db`
- `coolify-realtime`
- `coolify-redis`
- `coolify-sentinel`
- `coolify-proxy`
- Cloudflare tunnel containers
- `demo-proxy`
- `pg-proxy-temp`

### Networking Model

Docker networks discovered:

| Network | Driver | Notes |
| --- | --- | --- |
| `bridge` | bridge | Default Docker bridge network. |
| `coolify` | bridge | Coolify internal network. |
| `do4ksgcc0wksg4wwg4osgk0o` | bridge | Shared Supabase/application network. |
| `host` | host | Docker host network. |
| `none` | null | Docker none network. |

The main Supabase/application network is:

```text
Network: do4ksgcc0wksg4wwg4osgk0o
Driver: bridge
Subnet: 10.0.2.0/24
Gateway: 10.0.2.1
Internal: false
Attachable: true
```

The network includes Supabase services, application services, the application gateway, `pg-proxy-temp`, and `coolify-proxy`.

### Internal Service Communication Observations

- Supabase containers have Docker DNS aliases such as `supabase-kong`, `supabase-auth`, `supabase-db`, and related service names.
- Application containers use the same bridge network as Supabase.
- The app stack and Supabase stack are coupled through the shared `do4ksgcc0wksg4wwg4osgk0o` Docker network.
- Supabase Postgres is reachable internally as `supabase-db`.
- Supabase Kong is reachable internally as `supabase-kong`.

## Reverse Proxy / Ingress Findings

### Traefik Usage

The host uses `coolify-proxy` running `traefik:v3.6` as the public ingress proxy.

Observed public host port bindings:

```text
80/tcp -> host port 80
443/tcp -> host port 443
443/udp -> host port 443
8080/tcp -> host port 8080
```

Traefik is configured with:

- HTTP entrypoint on port `80`.
- HTTPS entrypoint on port `443`.
- HTTP/3 enabled on HTTPS.
- Docker provider enabled.
- File provider enabled at `/traefik/dynamic/`.
- Docker provider `exposedbydefault=false`.
- ACME HTTP challenge enabled.
- ACME storage at `/traefik/acme.json`.

The Traefik container mounts:

```text
/data/coolify/proxy -> /traefik
/var/run/docker.sock -> /var/run/docker.sock:ro
```

### Kong Behind Traefik

Supabase Kong is not directly published to host ports. Its exposed container ports include:

```text
8000/tcp
8001/tcp
8443/tcp
8444/tcp
```

The observed Docker port mapping for Kong shows no direct host publication. Traffic reaches Kong through Coolify/Traefik routing.

### Coolify-Managed Labels

Supabase Kong has Coolify and Traefik labels indicating:

- Coolify manages the resource.
- The Coolify project is the Supabase project.
- The service is `supabase-kong`.
- Traefik is enabled for the container.
- The HTTP router matches the current `supabase.10.14.255.82.nip.io` host.
- The Traefik service forwards to Kong port `8000`.

## Supabase Runtime URL Findings

The current runtime URL pattern is IP-derived and `nip.io` based.

Observed URL variables include:

| Variable | Current non-secret pattern |
| --- | --- |
| `SUPABASE_URL` | `http://supabase.10.14.255.82.nip.io` |
| `API_EXTERNAL_URL` | `http://supabase.10.14.255.82.nip.io` |
| `SUPABASE_PUBLIC_URL` | `http://supabase.10.14.255.82.nip.io` |
| `SUPABASE_PUBLIC_API` | `http://supabase.10.14.255.82.nip.io` |
| `SERVICE_URL_SUPABASEKONG` | `http://supabase.10.14.255.82.nip.io` |
| `SERVICE_URL_SUPABASEKONG_8000` | `http://supabase.10.14.255.82.nip.io:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://supabase.10.14.255.82.nip.io` |
| `COOLIFY_URL` | `http://supabase.10.14.255.82.nip.io` |
| `COOLIFY_FQDN` | `supabase.10.14.255.82.nip.io` |
| `SERVICE_FQDN_SUPABASEKONG` | `supabase.10.14.255.82.nip.io` |
| `SERVICE_FQDN_SUPABASEKONG_8000` | `supabase.10.14.255.82.nip.io:8000` |

These values currently point to HTTP URLs and the `supabase.10.14.255.82.nip.io` host.

## Auth / OAuth Findings

### Google OAuth

Google OAuth is enabled in the Supabase Auth container.

Observed non-secret Auth settings include:

| Setting | Current non-secret value |
| --- | --- |
| `GOTRUE_EXTERNAL_GOOGLE_ENABLED` | `true` |
| `ENABLE_GOOGLE_SIGNUP` | `true` |
| `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` | Present |
| `GOOGLE_CLIENT_ID` | Present |
| `GOTRUE_EXTERNAL_GOOGLE_SECRET` | Present, omitted |
| `GOOGLE_CLIENT_SECRET` | Present, omitted |

### SITE_URL and Localhost Assumptions

Observed Auth settings include:

| Setting | Current non-secret value |
| --- | --- |
| `GOTRUE_SITE_URL` | `http://localhost:5173` |
| `GOTRUE_URI_ALLOW_LIST` | `http://localhost:5173/auth/callback` |
| `ADDITIONAL_REDIRECT_URLS` | Empty |

The Auth container therefore still contains localhost-oriented redirect assumptions.

### Callback URL Coupling

Observed Google callback settings include:

| Setting | Current non-secret value |
| --- | --- |
| `GOOGLE_CALLBACK_URI` | `http://supabase.10.14.255.82.nip.io/auth/v1/callback` |
| `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` | `http://supabase.10.14.255.82.nip.io/auth/v1/callback` |

The callback URL is coupled to the current `nip.io` Supabase public host and uses HTTP.

### SMTP Findings

SMTP-related variables are present. The observed SMTP host, user, password, sender, and admin email values are empty or omitted. No SMTP secret values are included in this document.

## Database Findings

### Postgres Container

The live Supabase Postgres container is:

```text
supabase-db-do4ksgcc0wksg4wwg4osgk0o
```

Image:

```text
supabase/postgres:15.8.1.048
```

Observed status:

```text
Running, healthy
```

### Public Exposure

The Supabase Postgres container exposes container port `5432/tcp`, but the `docker ps` output does not show a direct public host port mapping for the Postgres container.

Observed implication:

- Postgres is internal Docker-network reachable.
- Postgres is not directly published to `0.0.0.0` from the database container.

### Local Postgres Proxy

A temporary proxy container was observed:

```text
pg-proxy-temp
```

Image:

```text
alpine/socat
```

Observed port mapping:

```text
127.0.0.1:5432 -> 5432/tcp
```

This indicates local-host-only Postgres access from the Supabase host, not public external access.

### Railway Connectivity Implication

The current database access path is Docker-network-local or host-local through the temporary proxy. No evidence was collected that Postgres is currently reachable from an external platform such as Railway.

## Storage Findings

### MinIO Usage

The self-hosted Supabase stack includes a MinIO container:

```text
supabase-minio-do4ksgcc0wksg4wwg4osgk0o
```

Image:

```text
ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z
```

Observed status:

```text
Running, healthy
```

This confirms the current self-hosted Supabase Storage stack is backed by a local MinIO service.

### Storage API

The Supabase Storage API container is:

```text
supabase-storage-do4ksgcc0wksg4wwg4osgk0o
```

Observed status:

```text
Running, healthy
```

### Buckets Previously Identified From Application Code

The application code references these buckets:

- `avatars`
- `feedback-images`
- `store-images`

Bucket existence, public/private status, policies, object counts, and file limits still need to be confirmed from the live database/storage runtime.

## Infrastructure Coupling Findings

### nip.io Dependency

The live Supabase public URL configuration uses:

```text
supabase.10.14.255.82.nip.io
```

This appears in Supabase public URL variables, Auth callback variables, Coolify FQDN variables, and Traefik routing labels.

### localhost Dependency

Supabase Auth currently includes:

```text
GOTRUE_SITE_URL=http://localhost:5173
GOTRUE_URI_ALLOW_LIST=http://localhost:5173/auth/callback
```

These values are tied to local frontend development.

### Docker Network Dependency

Supabase and application services share:

```text
do4ksgcc0wksg4wwg4osgk0o
```

The network is a Docker bridge network with subnet `10.0.2.0/24`.

### Internal DNS Dependency

Supabase services use internal Docker DNS names such as:

- `supabase-db`
- `supabase-kong`
- `supabase-auth`
- `supabase-storage`
- `supabase-rest`
- `supabase-supavisor`

Application services and Supabase services are currently co-located on the same Docker network, making these DNS names available internally on the host.

### Tec/Network Coupling

The current runtime is coupled to:

- Host IP `10.14.255.82`.
- The `nip.io` hostname derived from that IP.
- The Coolify resource/network identifier `do4ksgcc0wksg4wwg4osgk0o`.
- Docker-network-local service names.
- Localhost-only Postgres proxying.

## Migration-Relevant Findings

These are findings only, not risk classifications:

- The Supabase runtime is Coolify-managed.
- Public ingress is handled by Traefik.
- Supabase Kong is routed by Traefik and is not directly published on the host.
- Supabase Postgres is not publicly exposed by its container.
- A localhost-only Postgres proxy exists on `127.0.0.1:5432`.
- Supabase Auth is configured with localhost `SITE_URL` and URI allow list values.
- Google OAuth is enabled.
- Google OAuth callback URLs currently point to the `nip.io` Supabase URL.
- Current Supabase public URLs use HTTP.
- The app and Supabase services share the same Docker bridge network.
- MinIO is present as the local object storage backend.
- Storage buckets referenced by application code are `avatars`, `feedback-images`, and `store-images`.
- Coolify/Traefik labels route the current `nip.io` Supabase host to Kong port `8000`.

## Runtime Evidence References

The findings in this document are based on the following runtime inspection commands and outputs collected from the live host:

- `sudo docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"`
  - Produced the container inventory, image list, status list, and visible port mappings.
- `sudo docker network ls`
  - Produced the Docker network inventory.
- `sudo docker volume ls`
  - Produced the Docker volume inventory.
- `sudo docker network inspect do4ksgcc0wksg4wwg4osgk0o`
  - Produced the shared network details, subnet, gateway, attached containers, internal IPs, and network membership observations.
- `sudo docker inspect coolify-proxy`
  - Produced the Traefik ingress configuration, public port bindings, ACME configuration, mounted proxy config path, and network attachments.
- `sudo docker inspect supabase-kong-do4ksgcc0wksg4wwg4osgk0o`
  - Produced Kong runtime URL variables, Traefik/Coolify labels, internal routing details, and Kong network exposure details.
- `sudo docker inspect supabase-auth-do4ksgcc0wksg4wwg4osgk0o`
  - Produced Auth runtime variables, Google OAuth enablement, `GOTRUE_SITE_URL`, URI allow list, callback URL settings, and Auth health status.

Secret-bearing command output was reviewed only to extract non-secret infrastructure facts. Secret values were omitted from this document.
