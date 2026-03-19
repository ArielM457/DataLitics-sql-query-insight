# Issue #06 — Multi-Tenant Data Isolation: Progress & Analysis

**Type:** Security · **Priority:** High · **Estimated:** 4h

---

## What Was Done

### Analysis of Existing Implementation

A full codebase audit was performed to map what was already in place for multi-tenant isolation before writing any new code.

**Already implemented (prior to this session):**

- `dab/empresa_a/dab-config.json` and `dab/empresa_b/dab-config.json` — each tenant has its own DAB configuration with its own connection string injected via environment variable (`@env('TENANT_EMPRESA_A_CONNECTION')`). The infra-level isolation is solid: each DAB container has `external: false` ingress, meaning it is only reachable from inside the Container Apps environment — never directly from the internet.
- `backend/app/models/request.py` — both `QueryRequest` and `OnboardingRequest` carry `tenant_id` as a required field.
- `infra/container-apps.yml` — the backend receives `DAB_BASE_URL_EMPRESA_A` and `DAB_BASE_URL_EMPRESA_B` as separate environment variables, each pointing to the internal FQDN of the corresponding DAB container.
- `dab/empresa_b/dab-config.json` — the HR schema excludes `salary`, `ssn`, and `bank_account` from the `analyst` role, satisfying the sensitive-column exclusion requirement.

---

## What Needs to Be Implemented

### 1. DAB Routing Logic (`agent_execution.py`)

The `ExecutionAgent.execute()` method currently raises `NotImplementedError`. The routing logic — mapping a `tenant_id` to the correct DAB base URL — needs to be implemented here. The pattern is straightforward:

```python
DAB_URLS = {
    "empresa_a": settings.DAB_BASE_URL_EMPRESA_A,
    "empresa_b": settings.DAB_BASE_URL_EMPRESA_B,
}

if tenant_id not in DAB_URLS:
    raise HTTPException(status_code=403, detail="Unknown tenant")

dab_url = DAB_URLS[tenant_id]
```

This is the core enforcement point: a user with `tenant_id = "empresa_a"` will only ever reach the DAB container configured with empresa A's connection string.

### 2. Automated Isolation Test

No isolation tests exist yet. A `test_tenant_isolation.py` file needs to be created in `backend/tests/` that verifies:
- `empresa_a` resolves to the correct DAB URL
- `empresa_b` resolves to a different DAB URL
- An unknown `tenant_id` raises a 403
- A request without a `tenant_id` is rejected at the auth layer

### 3. AI Search Schema Partitioning

The `RAGClient.search_schema()` method accepts `tenant_id` as a parameter but raises `NotImplementedError`. The Azure AI Search index needs a `tenant_id` field on every document so that queries are always filtered by tenant. This is **blocked by Issue #09** (AI Search provisioning and indexing).

---

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Each company has its own `dab-config.json` with connection in `.env` | ✅ Done | Both empresa_a and empresa_b configured |
| User from empresa A cannot access empresa B data | ⚠️ Infra ready, routing code pending | `agent_execution.py` needs implementation |
| AI Search index partitioned by `tenant_id` | ❌ Blocked | Depends on Issue #09 |
| DAB routes via `tenant_id` from Firebase token | ⚠️ Structure ready, code pending | Auth placeholder in `auth.py` (Issue #10) |
| Automated cross-tenant isolation test | ❌ Missing | No tests exist yet |

---

## Definition of Done Remaining

- [ ] Implement `get_dab_url(tenant_id)` routing in `agent_execution.py`
- [ ] Write `backend/tests/test_tenant_isolation.py` with cross-tenant access tests
- [ ] Verify once Issue #09 is complete that AI Search filters by `tenant_id`
- [ ] Full end-to-end test once Issue #10 (Firebase Auth) is implemented
