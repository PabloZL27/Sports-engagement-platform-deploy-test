# Staging Migration Runbook

This runbook captures the current staging deployment model for the Sports Engagement Platform deployment fork.

## Staging CD Workflow

The first backend staging CD workflow lives at `.github/workflows/deploy-staging.yml`.

### Trigger behavior

The workflow runs only on:

- Pushes to `main`
- Manual `workflow_dispatch`

It does not run on `pull_request`. Pull requests should continue to use the existing PR Checks workflow, and branch protection should require those checks before changes can merge into `main`.

### Required GitHub Secrets

Configure these repository secrets before enabling staging CD:

- `COOLIFY_DEPLOY_WEBHOOK_URL`: Coolify deployment webhook URL for the staging backend compose application.
- `COOLIFY_API_TOKEN`: Coolify API/deploy token used to authenticate the staging deployment webhook request.
- `STAGING_API_BASE_URL`: public staging API base URL, expected to be `https://api-staging.pzapata.com`.

Do not commit webhook URLs, tokens, service keys, database URLs, or Supabase secrets into the repository.

### Coolify webhook flow

When the workflow starts from `main` or a manual run, it validates that required secrets exist and then triggers Coolify with:

```bash
curl -fsSL \
  -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
  -X POST "$COOLIFY_DEPLOY_WEBHOOK_URL"
```

Coolify remains responsible for pulling/building/deploying the backend, gateway, and service containers on the GCP VM. This workflow does not replace Coolify and does not modify Docker Compose.

### Frontend deployment

Frontend deployment remains handled by Vercel. Vercel should stay connected to GitHub and deploy `apps/web` according to the Vercel project configuration. The backend CD workflow does not deploy the frontend.

Current staging frontend and API domains:

- Frontend: `https://app-staging.pzapata.com`
- API Gateway: `https://api-staging.pzapata.com`
- Supabase: `https://supabase-staging.pzapata.com`

### Smoke tests

After triggering Coolify, the workflow waits briefly and then runs API smoke tests against `STAGING_API_BASE_URL`.

Required endpoint:

- `GET /matches/health`

Optional endpoints:

- `GET /profile/health`
- `GET /store/health`
- `GET /community/health`

Optional endpoints are retried and reported, but they do not fail the deployment if unavailable. This keeps the first CD workflow compatible with services whose health endpoints are not guaranteed yet.

The smoke test paths and retry timing are defined as workflow-level environment variables:

- `REQUIRED_HEALTH_PATHS`
- `OPTIONAL_HEALTH_PATHS`
- `DEPLOY_SETTLE_SECONDS`
- `HEALTH_RETRY_ATTEMPTS`
- `HEALTH_RETRY_DELAY_SECONDS`

### Manual rerun

To redeploy staging manually:

1. Open GitHub Actions.
2. Select `Deploy Staging Backend`.
3. Choose `Run workflow`.
4. Run it from `main`.

Use manual reruns after fixing transient Coolify deploy failures or after updating staging secrets in GitHub/Coolify.

### Limitations and future improvements

This is intentionally the first CD step only:

- No production deployment is configured.
- No deployment runs from pull requests.
- No secrets are stored in files.
- The workflow assumes branch protection keeps `main` validated by PR Checks.
- Optional health endpoints should become required once each service exposes a stable non-DB or DB-aware health route.
- Future hardening should add deployment status polling if Coolify exposes a reliable status endpoint.
- Future workflows can split frontend/backend checks, add release tagging, and add production promotion after staging QA.
