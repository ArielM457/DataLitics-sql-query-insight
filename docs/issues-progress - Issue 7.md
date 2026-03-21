# Issue #07 — Automatic Company Onboarding: Progress & Implementation

**Type:** Feature · **Priority:** High · **Estimated:** 4h

---

## What Was Implemented

### 1. Schema Inspector (`backend/app/core/schema_inspector.py`)

Connects to any Azure SQL database using a connection string and introspects its schema automatically. Key behaviors:

- `test_connection()` — attempts a 10-second timeout connection to validate the connection string before doing any real work. Returns `True/False` without raising exceptions.
- `introspect()` — queries `INFORMATION_SCHEMA.TABLES` and `INFORMATION_SCHEMA.COLUMNS` to extract every user table with its column names, SQL types, nullability, and a `sensitive` flag.
- Sensitive column detection is automatic: any column whose name matches a known PII pattern (`salary`, `ssn`, `bank_account`, `email`, `phone`, `address`, `tax_id`, `date_of_birth`, etc.) is flagged as sensitive at introspection time.

### 2. DAB Config Generator (`backend/app/core/dab_generator.py`)

Takes an introspected schema and produces a complete, ready-to-deploy `dab-config.json`. Rules applied automatically:

- **analyst role** — read-only, with all sensitive columns listed under `fields.exclude`. If a table has no sensitive columns, no field exclusion is added.
- **manager role** — full read access to all columns.
- **admin role** — full read access to all columns.
- No role receives `create`, `update`, or `delete` permissions — any write attempt returns 403 from DAB.
- Connection string is always injected via environment variable (`@env('TENANT_X_CONNECTION')`), never hardcoded.

### 3. Onboarding Endpoints (`backend/app/routers/onboarding.py`)

**`POST /onboarding/connect`**

Full flow:
1. Verifies Firebase token — rejects if role is not `admin` (403).
2. Tests the database connection — returns 400 with a descriptive error if it fails.
3. Introspects all tables and columns.
4. Returns 400 if the database has no tables.
5. Generates the `dab-config.json` for the tenant.
6. Returns a structured response with: schema summary per table (column count + which columns are excluded for analyst), the full `dab_config` object, and `next_steps` instructions for deploying the DAB container.

**`GET /onboarding/schema/{tenant_id}`**

1. Verifies Firebase token.
2. Enforces cross-tenant isolation: a non-admin user can only retrieve their own tenant's schema.
3. Reads the connection string from `TENANT_{TENANT_ID}_CONNECTION` environment variable.
4. Returns 404 if the tenant is not configured on the server.
5. Returns live schema by introspecting the database directly.

### 4. Response Model (`backend/app/models/response.py`)

Added `OnboardingResponse` Pydantic model with: `status`, `tenant_id`, `company_name`, `tables_found`, `schema_summary`, `dab_config`, `next_steps`.

### 5. ODBC Driver in Dockerfile (`backend/Dockerfile`)

Added installation of **Microsoft ODBC Driver 18 for SQL Server** to the Docker image. This is required by `pyodbc` to connect to Azure SQL from a Linux container. Uses the official Microsoft Debian 12 (bookworm) package repository.

### 6. Dependencies (`backend/requirements.txt`)

Added `pyodbc>=5.2.0`.

### 7. Tests (`backend/tests/test_onboarding.py`)

13 tests covering:
- Sensitive column detection in `SENSITIVE_COLUMN_PATTERNS`
- `test_connection()` returns True/False correctly (mocked pyodbc)
- `introspect()` returns correct table/column structure
- DAB config structure is valid
- Analyst role excludes sensitive columns
- Manager role has full read access
- Tables without sensitive columns have no field exclusion
- GraphQL is disabled in generated config
- Connection string uses env var format
- `/connect` endpoint rejects non-admin roles (403)
- `/connect` endpoint returns 400 on failed connection
- `/connect` endpoint returns correct schema summary and dab_config

---

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| Admin can submit a connection string and get a generated `dab-config.json` | ✅ Done |
| Sensitive columns auto-detected and excluded from analyst | ✅ Done |
| Connection tested before introspecting | ✅ Done |
| Cross-tenant schema access blocked for non-admin | ✅ Done |
| Role enforcement: only admin can onboard | ✅ Done |
| ODBC Driver installed in Docker image | ✅ Done |
| 13 automated tests passing | ✅ Done |

---

## What Remains for Full End-to-End

- **Issue #08** — Create Azure SQL databases with real data (Contoso Sales, HR) so `/connect` can be tested against a real DB.
- **Issue #09** — Index introspected schemas in Azure AI Search so the agents can query schema context during SQL generation.
- **Issue #23** — Automate DAB container redeployment after onboarding (currently the admin receives `next_steps` with manual instructions).
