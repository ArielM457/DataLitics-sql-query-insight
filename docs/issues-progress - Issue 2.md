## #02 — Provision Azure Container Apps for FastAPI Backend and DAB

**Type:** `infra` · **Priority:** `high` · **Status:** Completed

---

### What We Did

We provisioned the full cloud infrastructure for the DataAgent backend, getting both the FastAPI service and Data API Builder (DAB) running on Azure with automatic deploys from GitHub.

**Infrastructure created on Azure:**
- One **Azure Container Registry (ACR)** — `dataagentacr.azurecr.io` — stores all Docker images for the project.
- Two **Container Apps Environments** — one for production (`dataagent-env`) and one for staging (`dataagent-env-staging`), both on the Consumption plan which scales to zero instances when idle.
- Three **production Container Apps**: `dataagent-backend` (FastAPI, external ingress on port 8000), `dataagent-dab-empresa-a` and `dataagent-dab-empresa-b` (DAB, internal ingress on port 5000).
- Three **staging Container Apps** — mirror of production with a `-staging` suffix for pre-production testing.
- One **Service Principal** (`dataagent-cicd`) with Contributor and AcrPush roles, used exclusively by the CI/CD pipeline.

**Files created or updated in the repo:**
- `dab/Dockerfile` — containerizes DAB using the official Microsoft image. Tenant selection (`empresa_a` or `empresa_b`) is handled via a Docker build argument, producing a separate image per tenant.
- `dab/empresa_a/dab-config.json` and `dab/empresa_b/dab-config.json` — updated host mode from `development` to `production` and added Azure Container Apps CORS origins.
- `.github/workflows/deploy.yml` — full CI/CD pipeline with five stages: lint backend, lint frontend, test backend, build and push images to ACR, deploy to staging (automatic on `develop`), deploy to production (manual approval on `main`).
- `infra/setup.sh` — one-time provisioning script using Azure CLI to create all resources without needing Docker locally (`az acr import` instead of `docker push`).
- `infra/container-apps.yml` — rewritten as a proper Azure Container Apps reference spec documenting all services, scale rules, and environment variables.
- `backend/.flake8` — flake8 configuration that ignores `F401` unused imports in `__init__.py` files, which are intentional re-exports.
- `frontend/.eslintrc.json` — ESLint configuration for Next.js so the linter runs non-interactively in CI.

**Acceptance criteria met:**
- FastAPI responds on `/health` with status 200 from the internet.
- DAB runs in a separate Container App with `/health` active.
- Deploy runs automatically from GitHub Actions on push to `main` and `develop`.
- Environment variables are injected directly into Container Apps — no Key Vault.
- All services scale to zero replicas when there is no traffic.
- A separate staging environment exists for testing before production.
