# Supabase Runtime Export Checklist

## Scope

Use this checklist to collect the live self-hosted Supabase runtime configuration from the current Supabase host before migration or deployment work.

This is documentation only. Do not use this checklist to change configuration, rotate secrets, restart services, migrate data, or modify Docker Compose files.

## Secret Handling Rules

- Mask all passwords, JWT secrets, service role keys, anon keys, OAuth secrets, SMTP passwords, database passwords, and access tokens.
- Paste only hostnames, ports, database names, provider names, enabled/disabled status, and masked values.
- Use placeholders such as `<MASKED>`, `<HOST>`, `<PORT>`, and `<CONFIRM_ON_HOST>`.
- Do not paste full connection strings unless credentials are removed or replaced with `<MASKED>`.

## Operator Info

```text
Operator:
Date collected:
Supabase host:
Environment:
Access method:
Notes:
```

## 1. Supabase Public URL and Runtime Config

### Manual Commands

Run on the Supabase host.

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

Find Supabase-related containers.

```bash
docker ps --format "{{.Names}}" | grep -Ei "supabase|kong|auth|gotrue|rest|postgrest|storage|realtime|studio|meta|db|postgres|pooler|supavisor|imgproxy|edge"
```

Inspect environment variables for each relevant container. Mask values before pasting results.

```bash
docker inspect <container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | sort
```

Search for runtime URL variables. Mask secrets before saving.

```bash
docker inspect <container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "SUPABASE_PUBLIC_URL|API_EXTERNAL_URL|SITE_URL|PUBLIC_REST_URL|KONG|GOTRUE|AUTH|STORAGE|REALTIME|POSTGREST|REST"
```

If a Supabase project directory exists on the host, locate env/config files without printing secrets.

```bash
find / -maxdepth 4 -type f \( -name ".env" -o -name "*.env" -o -name "docker-compose*.yml" -o -name "config.toml" \) 2>/dev/null | grep -Ei "supabase|docker|compose|env|config"
```

### Output Template

```text
SUPABASE_PUBLIC_URL:
API_EXTERNAL_URL:
SITE_URL:
PUBLIC_REST_URL:
Kong/API URL:
Auth URL:
Storage URL:
Realtime URL:
PostgREST URL:
Studio URL:
Notes:
```

## 2. Docker and Container Inventory

### Manual Commands

List running containers.

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

List all Supabase-related containers, including stopped containers.

```bash
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -Ei "supabase|kong|auth|gotrue|rest|postgrest|storage|realtime|studio|meta|db|postgres|pooler|supavisor|imgproxy|edge"
```

List Docker networks.

```bash
docker network ls
```

Inspect networks used by Supabase containers.

```bash
docker inspect <container_name> --format '{{json .NetworkSettings.Networks}}'
```

List exposed and published ports for a container.

```bash
docker port <container_name>
```

List Docker volumes.

```bash
docker volume ls
```

Inspect mounted volumes for a container.

```bash
docker inspect <container_name> --format '{{range .Mounts}}{{println .Type .Name .Source .Destination}}{{end}}'
```

If Docker Compose is used, identify the project and files.

```bash
docker compose ls
```

```bash
docker compose -f <compose_file> ps
```

### Output Template

```text
Supabase containers:
- name:
  image:
  status:
  ports:
  networks:
  volumes:

Docker networks:
- name:
  driver:
  external:
  attached containers:

Docker volumes:
- name:
  mounted by:
  purpose:

Compose project name:
Compose files found:
Notes:
```

## 3. Supabase Auth Config

### Manual Commands

Inspect Auth/GoTrue container environment. Mask secrets.

```bash
docker inspect <auth_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | sort
```

Filter for Auth, redirect, OAuth, and SMTP settings. Mask secrets.

```bash
docker inspect <auth_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "GOTRUE|SITE_URL|URI_ALLOW_LIST|REDIRECT|EXTERNAL|JWT|GOOGLE|SMTP|MAILER|DISABLE_SIGNUP"
```

Check whether the Auth service is reachable through the public Supabase URL.

```bash
curl -i <SUPABASE_PUBLIC_URL>/auth/v1/health
```

Check public Auth callback endpoint response shape. This should not include secrets.

```bash
curl -i <SUPABASE_PUBLIC_URL>/auth/v1/callback
```

### Output Template

```text
Auth container name:
SITE_URL:
Allowed redirect URLs:
API external URL:
Google OAuth enabled: yes/no/unknown
Google OAuth callback URL:
Other OAuth providers:
Signup enabled:
SMTP configured: yes/no/unknown
SMTP host:
SMTP sender/from address:
SMTP secret values masked: yes/no
JWT secret present: yes/no, value masked
Auth health endpoint result:
Notes:
```

## 4. Storage Config

### Manual Commands

Inspect Storage container environment. Mask secrets.

```bash
docker inspect <storage_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | sort
```

Filter Storage settings. Mask secrets.

```bash
docker inspect <storage_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "STORAGE|FILE_SIZE|UPLOAD|S3|AWS|REGION|BUCKET|TENANT|POSTGREST|DATABASE|ANON|SERVICE|JWT"
```

List buckets through SQL. Use a read-only connection if available. Mask connection credentials.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at from storage.buckets order by name;"
```

List object counts per bucket.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select bucket_id, count(*) as object_count from storage.objects group by bucket_id order by bucket_id;"
```

List storage policies.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'storage' order by tablename, policyname;"
```

Check Storage health or object API availability.

```bash
curl -i <SUPABASE_PUBLIC_URL>/storage/v1/
```

### Output Template

```text
Storage container name:
Storage backend: local/S3/unknown
Storage URL:

Buckets:
- name:
  public:
  file_size_limit:
  allowed_mime_types:
  object_count:
  application usage:

Storage policies:
- table:
  policy:
  command:
  roles:
  summary:

Storage health result:
Notes:
```

## 5. Database Access

### Manual Commands

Identify Postgres containers.

```bash
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -Ei "postgres|supabase-db|db"
```

Inspect Postgres container environment. Mask secrets.

```bash
docker inspect <postgres_container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | sort
```

Inspect exposed ports.

```bash
docker port <postgres_container_name>
```

Inspect Postgres network attachments.

```bash
docker inspect <postgres_container_name> --format '{{json .NetworkSettings.Networks}}'
```

List databases.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select datname from pg_database where datistemplate = false order by datname;"
```

List roles without passwords.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin, rolreplication from pg_roles order by rolname;"
```

Check SSL setting.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "show ssl;"
```

Check listen addresses and port.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "show listen_addresses; show port;"
```

Check active connection sources.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select datname, usename, client_addr, application_name, state, count(*) from pg_stat_activity group by datname, usename, client_addr, application_name, state order by datname, usename, client_addr;"
```

From a machine outside the Supabase host network, test TCP reachability only if approved by the operator.

```bash
nc -vz <postgres_public_host> <postgres_public_port>
```

### Output Template

```text
Postgres container name:
Postgres host:
Internal port:
Published external port:
Networks:
Volumes:
SSL enabled: yes/no/unknown
External access enabled: yes/no/unknown
Railway could connect externally: yes/no/unknown
Connection method:
- Docker network:
- Public TCP:
- VPN/tunnel:
- Other:

Databases:
- name:
  owning service:
  notes:

Roles/users:
- role:
  login:
  privileges summary:
  owning service:

Notes:
```

## 6. Backups

### Manual Commands

Locate backup directories without printing secrets.

```bash
find / -maxdepth 5 -type d \( -iname "*backup*" -o -iname "*dump*" -o -iname "*supabase*" \) 2>/dev/null
```

List recent dump files.

```bash
find / -maxdepth 6 -type f \( -name "*.dump" -o -name "*.sql" -o -name "*.sql.gz" -o -name "*.tar" -o -name "*.zip" \) -printf "%TY-%Tm-%Td %TH:%TM %s %p\n" 2>/dev/null | sort
```

List Postgres volume mount path.

```bash
docker inspect <postgres_container_name> --format '{{range .Mounts}}{{println .Type .Name .Source .Destination}}{{end}}'
```

Check database sizes.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select datname, pg_size_pretty(pg_database_size(datname)) as size from pg_database where datistemplate = false order by pg_database_size(datname) desc;"
```

Check storage object counts and approximate metadata sizes.

```bash
psql "<POSTGRES_CONNECTION_WITH_MASKED_PASSWORD_WHEN_DOCUMENTING>" -c "select bucket_id, count(*) as object_count, pg_size_pretty(sum(coalesce((metadata->>'size')::bigint, 0))) as metadata_size from storage.objects group by bucket_id order by bucket_id;"
```

Document the current backup command if one exists. Do not run a new backup from this checklist unless separately approved.

```bash
history | grep -E "pg_dump|pg_restore|supabase|backup|dump" | tail -50
```

### Restore Checklist Template

```text
Latest DB dump location:
Latest DB dump date:
Dump format:
Dump includes all service DBs: yes/no/unknown
Dump includes roles: yes/no/unknown
Dump includes schemas: yes/no/unknown
Restore command documented: yes/no
Restore command, with secrets masked:
Restore tested: yes/no
Restore test date:

Storage backup location:
Storage backup process:
Storage backup latest date:
Storage restore process documented: yes/no
Storage restore tested: yes/no

Notes:
```

## 7. Reverse Proxy and TLS

### Manual Commands

Identify likely reverse proxy containers.

```bash
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -Ei "nginx|traefik|caddy|kong|proxy|certbot|letsencrypt"
```

Find proxy config files.

```bash
find / -maxdepth 5 -type f \( -name "nginx.conf" -o -name "*.conf" -o -name "Caddyfile" -o -name "traefik*.yml" -o -name "docker-compose*.yml" \) 2>/dev/null | grep -Ei "nginx|caddy|traefik|proxy|supabase|compose"
```

Inspect public DNS resolution from the host.

```bash
getent hosts <supabase_domain>
```

Check HTTPS certificate details.

```bash
openssl s_client -connect <supabase_domain>:443 -servername <supabase_domain> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

Check public HTTP/HTTPS responses.

```bash
curl -I http://<supabase_domain>
```

```bash
curl -I https://<supabase_domain>
```

Check Supabase API health through HTTPS.

```bash
curl -i https://<supabase_domain>/auth/v1/health
```

### Output Template

```text
Current public domain:
Current public IP:
HTTPS enabled: yes/no
HTTP redirects to HTTPS: yes/no
Reverse proxy type:
Reverse proxy container/service:
Proxy config location:
Certificate provider:
Certificate expiration:
Renewal method:
Supabase API reachable over HTTPS: yes/no
Auth health reachable over HTTPS: yes/no
Storage reachable over HTTPS: yes/no
Realtime reachable over HTTPS: yes/no/unused
Notes:
```

## 8. Final Findings Template

```text
Critical blockers:
- 

Medium-risk items:
- 

Unknowns requiring confirmation:
- 

Safe to proceed with staging planning: yes/no

Required follow-up before migration:
- 

Operator sign-off:
Date:
```

## Completion Checklist

- [ ] Supabase public URLs collected and masked.
- [ ] Container inventory collected.
- [ ] Docker networks and volumes collected.
- [ ] Auth settings collected and secrets masked.
- [ ] OAuth providers and callback URLs confirmed.
- [ ] SMTP presence confirmed without exposing credentials.
- [ ] Storage buckets listed.
- [ ] Bucket policies collected and reviewed.
- [ ] Object counts collected.
- [ ] Postgres host, ports, DBs, and roles collected.
- [ ] SSL/TLS database availability confirmed.
- [ ] Railway external connectivity feasibility recorded.
- [ ] Backup locations and latest dump dates recorded.
- [ ] Restore checklist documented.
- [ ] Reverse proxy config location recorded.
- [ ] TLS certificate provider and expiration recorded.
- [ ] No secrets pasted into repo documentation.
