# Issue #05 — DAB Granular Role Permissions: Progress & Implementation

**Type:** Infrastructure · **Priority:** High · **Estimated:** 5h

---

## What Was Implemented

### Per-Tenant DAB Configuration Files

Each tenant has its own `dab-config.json` with role-based permissions applied per entity.

**`dab/empresa_a/dab-config.json`** — Contoso Sales schema:

| Entity | analyst | manager | admin |
|---|---|---|---|
| Sales | read (excludes `internal_notes`, `cost_price`, `margin`) | read all | read all |
| Customers | read (excludes `email`, `phone`, `address`) | read all | read all |
| Products | read (excludes `supplier_cost`) | read all | read all |
| Stores | read all | read all | read all |

**`dab/empresa_b/dab-config.json`** — HR schema:

| Entity | analyst | manager | admin |
|---|---|---|---|
| Employees | read (excludes `salary`, `ssn`, `bank_account`) | read all | read all |
| (other tables) | read all | read all | read all |

### Permission Rules Applied to All Entities

- No role has `create`, `update`, or `delete` permissions. Any write attempt returns **403** automatically from DAB — no custom code needed.
- `analyst` is the most restrictive role: read-only, with sensitive columns excluded at the DAB layer before data reaches the backend.
- `manager` has full read access to all columns.
- `admin` has full read access to all columns.

### Connection String Injection

Each `dab-config.json` references its connection string via environment variable:

```json
"connection-string": "@env('TENANT_EMPRESA_A_CONNECTION')"
```

The actual connection string is never stored in the config file — it is injected at runtime from the Container App environment.

### DAB Docker Build

Each tenant's DAB image is built from a single `Dockerfile` using a build argument:

```dockerfile
FROM mcr.microsoft.com/azure-databases/data-api-builder:latest
ARG TENANT=empresa_a
WORKDIR /App
COPY ${TENANT}/dab-config.json ./dab-config.json
EXPOSE 5000
```

The `ARG` is declared after `FROM` so it is available in the build stage. GitHub Actions builds one image per tenant:

```bash
docker build --build-arg TENANT=empresa_a -t dataagent-dab-empresa-a .
docker build --build-arg TENANT=empresa_b -t dataagent-dab-empresa-b .
```

### Runtime Isolation

DAB containers are deployed with `external: false` ingress — they are only reachable from inside the Container Apps environment, never directly from the internet. The backend calls the correct DAB container based on the `tenant_id` from the Firebase token.

---

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Each company has its own `dab-config.json` | ✅ Done | empresa_a and empresa_b |
| `analyst` role — read-only with sensitive columns excluded | ✅ Done | Per entity, per tenant |
| `manager` role — full read access | ✅ Done | |
| `admin` role — full read access | ✅ Done | |
| Write attempt returns 403 for any role | ✅ Done | DAB enforces this automatically |
| DAB runs in Container App with `.env` as credential source | ✅ Done | `@env(...)` pattern |
| DAB containers not exposed to the internet | ✅ Done | `external: false` ingress |

---

## What Remains

- **Issue #08** — Create the actual Azure SQL databases with Contoso and HR data so DAB has real tables to expose.
- **Issue #15** — Implement the `ExecutionAgent` to call DAB's REST API with the user's role in the request header.
