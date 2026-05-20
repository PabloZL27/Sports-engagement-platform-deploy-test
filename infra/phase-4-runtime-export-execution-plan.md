# Phase 4.1D Runtime Export Execution Plan

## Purpose

Phase 4.1D is a manual execution phase for collecting the real self-hosted Supabase runtime configuration from the current Supabase host before any migration, deployment, credential, schema, or runtime changes.

The goal is to confirm what is actually running today: public URLs, Auth settings, Storage buckets and policies, Postgres access, reverse proxy/TLS configuration, backups, and external connectivity constraints. This document is intended to be used as a visual progress tracker by the team while executing the Supabase runtime export checklist.

## Prerequisites

- SSH access to the current Supabase host.
- Docker access on the Supabase host.
- `psql` access if available.
- Access to reverse proxy configuration if applicable.
- Access to current environment files if applicable.
- Permission to read container configuration, Docker networks, Docker volumes, and proxy configuration.
- A secure place to store masked findings.
- No runtime changes should be made during this phase.

## Safety Rules

- Do not edit env files.
- Do not restart containers.
- Do not rotate secrets.
- Do not run migrations.
- Do not delete volumes.
- Do not change Docker networks.
- Do not change reverse proxy configuration.
- Do not change Supabase Auth, Storage, Realtime, Kong, or Postgres configuration.
- Do not expose secrets in documentation.
- Mask passwords, JWT secrets, service role keys, anon keys, OAuth secrets, SMTP passwords, database passwords, and access tokens.
- Paste only masked values, hostnames, ports, database names, provider names, enabled/disabled status, and non-secret configuration summaries.

## Progress Tracker

Use `Not started`, `In progress`, `Blocked`, or `Done` in the Status column.

| Step | Area | Command/Action | Expected Output | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Host access | SSH into the Supabase host. | Shell access to the current host. | Not started |  |
| 2 | Docker access | `docker ps` | Docker responds without permission errors. | Not started |  |
| 3 | Docker container inventory | `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"` | Running container names, images, status, and ports. | Not started |  |
| 4 | Supabase container inventory | `docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" \| grep -Ei "supabase\|kong\|auth\|gotrue\|rest\|postgrest\|storage\|realtime\|studio\|meta\|db\|postgres\|pooler\|supavisor\|imgproxy\|edge"` | All Supabase-related containers, including stopped containers. | Not started |  |
| 5 | Docker network inventory | `docker network ls` | Docker network names and drivers. | Not started |  |
| 6 | Container network mapping | `docker inspect <container_name> --format '{{json .NetworkSettings.Networks}}'` | Networks attached to each Supabase container. | Not started |  |
| 7 | Docker volume inventory | `docker volume ls` | Docker volume names. | Not started |  |
| 8 | Container volume mapping | `docker inspect <container_name> --format '{{range .Mounts}}{{println .Type .Name .Source .Destination}}{{end}}'` | Volume/source/destination mappings for each container. | Not started |  |
| 9 | Supabase public URLs | `docker inspect <container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' \| grep -E "SUPABASE_PUBLIC_URL\|API_EXTERNAL_URL\|SITE_URL\|PUBLIC_REST_URL\|KONG\|GOTRUE\|AUTH\|STORAGE\|REALTIME\|POSTGREST\|REST"` | Public URL and runtime URL variables, masked where needed. | Not started |  |
| 10 | Auth/SITE_URL/OAuth configuration | `docker inspect <auth_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' \| grep -E "GOTRUE\|SITE_URL\|URI_ALLOW_LIST\|REDIRECT\|EXTERNAL\|JWT\|GOOGLE\|SMTP\|MAILER\|DISABLE_SIGNUP"` | Auth URL, redirect, OAuth, SMTP, and JWT presence. Secrets masked. | Not started |  |
| 11 | Auth health | `curl -i <SUPABASE_PUBLIC_URL>/auth/v1/health` | HTTP response showing Auth health availability. | Not started |  |
| 12 | Storage config | `docker inspect <storage_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' \| grep -E "STORAGE\|FILE_SIZE\|UPLOAD\|S3\|AWS\|REGION\|BUCKET\|TENANT\|POSTGREST\|DATABASE\|ANON\|SERVICE\|JWT"` | Storage runtime settings and backend type. Secrets masked. | Not started |  |
| 13 | Storage bucket inventory | `psql "<MASKED_CONNECTION>" -c "select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at from storage.buckets order by name;"` | Bucket list, public/private status, file size limits, MIME constraints. | Not started |  |
| 14 | Storage policies | `psql "<MASKED_CONNECTION>" -c "select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'storage' order by tablename, policyname;"` | Storage row-level security policy list. | Not started |  |
| 15 | Object counts per bucket | `psql "<MASKED_CONNECTION>" -c "select bucket_id, count(*) as object_count from storage.objects group by bucket_id order by bucket_id;"` | Object count per bucket. | Not started |  |
| 16 | Postgres container/host | `docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" \| grep -Ei "postgres\|supabase-db\|db"` | Postgres container name, image, status, and port mapping. | Not started |  |
| 17 | Postgres exposed ports | `docker port <postgres_container_name>` | Published host ports, if any. | Not started |  |
| 18 | Postgres database list | `psql "<MASKED_CONNECTION>" -c "select datname from pg_database where datistemplate = false order by datname;"` | Database names. | Not started |  |
| 19 | Postgres roles/users | `psql "<MASKED_CONNECTION>" -c "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolreplication from pg_roles order by rolname;"` | Role names and non-secret privilege flags. | Not started |  |
| 20 | SSL/TLS availability | `psql "<MASKED_CONNECTION>" -c "show ssl;"` | `on` or `off`. | Not started |  |
| 21 | Postgres listen config | `psql "<MASKED_CONNECTION>" -c "show listen_addresses; show port;"` | Listen addresses and database port. | Not started |  |
| 22 | Active DB clients | `psql "<MASKED_CONNECTION>" -c "select datname, usename, client_addr, application_name, state, count(*) from pg_stat_activity group by datname, usename, client_addr, application_name, state order by datname, usename, client_addr;"` | Current client sources and connection states. | Not started |  |
| 23 | Reverse proxy inventory | `docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" \| grep -Ei "nginx\|traefik\|caddy\|kong\|proxy\|certbot\|letsencrypt"` | Proxy and certificate-related containers. | Not started |  |
| 24 | Reverse proxy config location | `find / -maxdepth 5 -type f \( -name "nginx.conf" -o -name "*.conf" -o -name "Caddyfile" -o -name "traefik*.yml" -o -name "docker-compose*.yml" \) 2>/dev/null \| grep -Ei "nginx\|caddy\|traefik\|proxy\|supabase\|compose"` | Candidate proxy config files. | Not started |  |
| 25 | Domain DNS | `getent hosts <supabase_domain>` | Domain resolves to expected host/IP. | Not started |  |
| 26 | TLS certificate | `openssl s_client -connect <supabase_domain>:443 -servername <supabase_domain> </dev/null 2>/dev/null \| openssl x509 -noout -subject -issuer -dates` | Certificate subject, issuer, start, and expiry dates. | Not started |  |
| 27 | HTTP/HTTPS behavior | `curl -I http://<supabase_domain>` and `curl -I https://<supabase_domain>` | Redirect and HTTPS response behavior. | Not started |  |
| 28 | Backups inventory | `find / -maxdepth 6 -type f \( -name "*.dump" -o -name "*.sql" -o -name "*.sql.gz" -o -name "*.tar" -o -name "*.zip" \) -printf "%TY-%Tm-%Td %TH:%TM %s %p\n" 2>/dev/null \| sort` | Recent backup files and timestamps. | Not started |  |
| 29 | Database sizes | `psql "<MASKED_CONNECTION>" -c "select datname, pg_size_pretty(pg_database_size(datname)) as size from pg_database where datistemplate = false order by pg_database_size(datname) desc;"` | Database sizes. | Not started |  |
| 30 | Restore readiness | Confirm documented restore command and whether it has been tested. | Restore process status and latest test date. | Not started |  |
| 31 | Railway connectivity feasibility | Review external Postgres host, port, SSL, firewall, and allowlist requirements. | Risk classification: low/medium/high/blocked. | Not started |  |
| 32 | Vercel frontend dependency checks | Confirm required public frontend envs and allowed Auth redirect URLs. | Vercel env readiness status. | Not started |  |

## Docker Container Inventory

Collect:

- Supabase-related container names.
- Images and tags.
- Running/stopped status.
- Published ports.
- Compose project names if available.
- Which container is Kong/API gateway.
- Which container is Auth/GoTrue.
- Which container is Storage.
- Which container is PostgREST.
- Which container is Realtime.
- Which container is Postgres.
- Which container is Studio.
- Whether Supavisor or another pooler is running.

Masked results:

```text
Containers:
- name:
  image:
  status:
  ports:
  role:

Notes:
```

## Docker Network Inventory

Collect:

- Docker network names.
- Network drivers.
- Whether the network is external.
- Which containers are attached.
- Whether application containers share a network with Supabase.
- Whether the network name is Tec-specific.

Masked results:

```text
Networks:
- name:
  driver:
  external:
  attached containers:
  migration risk:

Notes:
```

## Docker Volume Inventory

Collect:

- Postgres data volume.
- Storage data volume or mounted path.
- Kong/proxy config mounts.
- Certbot/Let’s Encrypt certificate volumes.
- Any backup volumes.

Masked results:

```text
Volumes and mounts:
- container:
  source:
  destination:
  purpose:
  backup status:

Notes:
```

## Supabase Public URLs

Identify:

- `SUPABASE_PUBLIC_URL`
- `API_EXTERNAL_URL`
- `SITE_URL`
- `PUBLIC_REST_URL`
- Kong/API URL
- Auth URL
- Storage URL
- Realtime URL
- Studio URL, if exposed

Masked results:

```text
SUPABASE_PUBLIC_URL:
API_EXTERNAL_URL:
SITE_URL:
PUBLIC_REST_URL:
Kong/API URL:
Auth URL:
Storage URL:
Realtime URL:
Studio URL:
HTTP enabled:
HTTPS enabled:
Notes:
```

## Auth, SITE_URL, and OAuth Configuration

Identify:

- Auth container name.
- `SITE_URL`.
- Allowed redirect URLs.
- Google OAuth provider enabled/disabled status.
- Google OAuth callback URL.
- Other OAuth providers.
- SMTP configured yes/no.
- SMTP host and sender only, with credentials masked.
- JWT secret presence only, never the value.
- Whether localhost, nip.io, sslip.io, or temporary tunnel domains are still configured.

Masked results:

```text
Auth container:
SITE_URL:
Allowed redirect URLs:
Google OAuth enabled:
Google OAuth callback URL:
Other OAuth providers:
SMTP configured:
SMTP host:
SMTP sender:
JWT secret present:
Temporary/legacy domains found:
Migration risk:
Notes:
```

## Storage Bucket Inventory

Identify the buckets used by the app:

- `avatars`
- `feedback-images`
- `store-images`

Also record any additional buckets.

Masked results:

```text
Buckets:
- name:
  public:
  file_size_limit:
  allowed_mime_types:
  object_count:
  app usage:
  migration risk:

Notes:
```

## Storage Policies

Collect row-level security policies for the `storage` schema.

Do not paste secrets. Policy SQL is usually safe to paste, but review before committing it.

Masked results:

```text
Storage policies:
- table:
  policy:
  command:
  roles:
  summary:
  migration risk:

Notes:
```

## Object Counts Per Bucket

Collect object counts and approximate size if available.

Masked results:

```text
Object counts:
- bucket:
  count:
  approximate size:
  backup status:

Notes:
```

## Postgres Database List

Identify:

- All non-template databases.
- Which application service owns each database.
- Whether Auth/Storage internal schemas live in the same Postgres instance.

Masked results:

```text
Databases:
- name:
  owning service:
  size:
  notes:

Notes:
```

## Postgres Roles and Users

Identify roles without exposing passwords:

- Service users.
- Supabase internal users.
- Superuser roles.
- Login-enabled roles.
- Roles used by application service DB URLs.

Masked results:

```text
Roles:
- role:
  login:
  superuser:
  createdb:
  createrole:
  replication:
  owning service:
  migration risk:

Notes:
```

## Postgres Exposed Ports

Identify:

- Internal Postgres port.
- Published host port.
- Bind address if known.
- Firewall or cloud security group restrictions.
- Whether external access is currently possible.

Masked results:

```text
Postgres access:
Internal host:
Internal port:
Published host:
Published port:
Bind address:
Firewall restrictions:
External access possible:
Notes:
```

## SSL/TLS Availability

Identify:

- Whether Postgres SSL is enabled.
- Whether public Supabase API is available over HTTPS.
- Whether HTTP redirects to HTTPS.
- Whether certificate renewal is automated.

Masked results:

```text
Postgres SSL enabled:
Supabase HTTPS enabled:
HTTP redirects to HTTPS:
Certificate provider:
Certificate expiration:
Renewal method:
Notes:
```

## Reverse Proxy, Domain, and TLS Config

Identify:

- Current public domain.
- Current public IP.
- Reverse proxy type.
- Proxy config location.
- TLS certificate provider.
- Certificate expiration date.
- Whether the proxy routes API, Auth, Storage, and Realtime paths.

Masked results:

```text
Current public domain:
Current public IP:
Reverse proxy type:
Proxy config location:
Certificate provider:
Certificate expiration:
Routes API:
Routes Auth:
Routes Storage:
Routes Realtime:
Migration risk:
Notes:
```

## Backups and Restore Readiness

Identify:

- Current backup location.
- Latest dump date.
- Backup format.
- Whether all service databases are covered.
- Whether Supabase internal schemas are covered.
- Storage backup process.
- Restore command.
- Whether restore has been tested.

Do not run a new backup as part of this plan unless a separate approved backup task is opened.

Masked results:

```text
Database backup location:
Latest database backup date:
Backup format:
All service DBs covered:
Supabase internal schemas covered:
Storage backup location:
Latest storage backup date:
Restore command documented:
Restore tested:
Restore test date:
Migration risk:
Notes:
```

## Railway Connectivity Feasibility

Classify whether Railway backend services could connect to the current self-hosted database/Supabase runtime.

Check:

- Stable database host.
- Public or private connectivity path.
- Published Postgres port.
- Firewall allowlist feasibility.
- SSL/TLS support.
- Connection pooler availability.
- Per-service database credentials.
- Whether Railway services should use direct Postgres URLs or a managed database migration should happen first.

Masked results:

```text
Railway connectivity classification: low/medium/high/blocked
Stable DB host available:
External DB port available:
SSL required:
SSL supported:
Firewall allowlisting possible:
Pooler available:
Recommended connection method:
Blocking issues:
Notes:
```

## Vercel Frontend Dependency Checks

Confirm frontend-facing environment and Auth requirements:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_SUPABASE_FEEDBACK_BUCKET`
- Supabase Auth `SITE_URL`.
- Allowed redirect URLs for staging and production.
- Google OAuth authorized callback URLs.
- No backend-only secrets in Vercel env.

Masked results:

```text
Vercel app domain:
VITE_API_BASE_URL:
VITE_SUPABASE_URL:
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY present:
VITE_SUPABASE_FEEDBACK_BUCKET:
Auth SITE_URL ready:
Allowed redirect URLs ready:
Google OAuth callback URLs ready:
Backend-only secrets absent from Vercel env:
Migration risk:
Notes:
```

## Final Output Template

Paste the final masked findings here after executing the checklist.

```text
Collection date:
Collected by:
Supabase host:
Environment:

Runtime URLs:
- SUPABASE_PUBLIC_URL:
- API_EXTERNAL_URL:
- SITE_URL:
- PUBLIC_REST_URL:
- Kong/API URL:
- Auth URL:
- Storage URL:
- Realtime URL:

Docker:
- Supabase containers:
- Networks:
- Volumes:
- Published ports:

Auth:
- SITE_URL:
- Allowed redirects:
- OAuth providers:
- SMTP configured:
- Legacy domains:

Storage:
- Buckets:
- Policies:
- Object counts:

Database:
- Host:
- Port:
- Databases:
- Roles:
- SSL/TLS:
- External access:

Reverse proxy/TLS:
- Domain:
- Proxy:
- TLS provider:
- Certificate expiry:

Backups:
- Latest DB backup:
- Latest storage backup:
- Restore tested:

Railway feasibility:
- Classification:
- Blockers:

Vercel readiness:
- Classification:
- Blockers:

Critical blockers:
- 

Medium-risk items:
- 

Recommended next action:
- 
```

## Completion Criteria

Phase 4.1D is complete when:

- All runtime URLs are identified.
- Auth redirect settings are identified.
- Google OAuth callback URLs are identified.
- Storage buckets are identified.
- Storage bucket policies are identified.
- Object counts per bucket are documented.
- Postgres database list is documented.
- Postgres roles/users are documented without secrets.
- Postgres exposed ports and access method are understood.
- SSL/TLS availability is documented.
- Reverse proxy domain and certificate status are documented.
- Backup and restore status is documented.
- Railway connectivity risk is classified.
- Vercel frontend dependency risks are classified.
- No secrets are committed to documentation.
