# Infrastructure Compose Flows

This folder contains the Docker Compose files used to run the platform across different environments.

## Base portable compose

`docker-compose.yml` is the environment-agnostic base compose file. It uses a normal Compose-managed network and expects environment-specific values to come from an env file.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml config
```

## Local development

Use the base compose file plus the local override.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml -f infra/docker-compose.local.yml up -d --build
```

## Tec legacy deployment

Use the base compose file plus the Tec override. This preserves the external Tec/Supabase Docker network.

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml -f infra/docker-compose.tec.yml up -d --build
```

## Future production deployment

Use the base compose file with a production env file.

```bash
docker compose --env-file infra/.env.production -f infra/docker-compose.yml up -d --build
```

## Notes

- `docker-compose.tec.yml` is only for the Tec legacy environment.
- `docker-compose.local.yml` is only for local development overrides.
- The base compose file should remain portable and should not contain Tec-specific network names.
- Gateway routing should use Compose service DNS names, not fixed container names.