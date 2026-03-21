# DataAgent — Architecture Documentation

## Overview

DataAgent is a multi-agent system that converts natural language questions into SQL queries, executes them securely against tenant databases, and generates analytical insights with visualizations. The system uses a pipeline of 4 specialized AI agents, each with a distinct responsibility.

---

## Agent Architecture

### Agent 1: Intention Agent (`agent_intention.py`)
- **Responsibility:** Analyzes the user's natural language question to extract analytical intent.
- **Technology:** Semantic Kernel + RAG (Azure AI Search over reference books).
- **Input:** User question, tenant ID, user role.
- **Output:** Structured intent with target tables, metrics, filters, time period, and suggested technique.
- **Issue:** #11

### Agent 2: SQL Agent (`agent_sql.py`)
- **Responsibility:** Generates, validates, and secures SQL queries from the extracted intent.
- **Technology:** LangGraph with a multi-node directed graph pipeline.
- **Pipeline Nodes:**
  1. **Generate** — Creates SQL from intention + tenant schema.
  2. **Validate** — Verifies SQL syntax and structure with `sqlparse`.
  3. **PromptShields** — Checks for prompt injection attacks via Azure AI Content Safety.
  4. **ContextFilter** — Ensures the query only accesses authorized tables/columns.
  5. **Ready** — Final approved query.
- **Input:** Intention dict, tenant schema.
- **Output:** SQL string, explanation, risk level, blocked status.
- **Issues:** #12, #13, #14

### Agent 3: Execution Agent (`agent_execution.py`)
- **Responsibility:** Executes validated SQL queries against the tenant database via DAB.
- **Technology:** Data API Builder REST API + Circuit Breaker (`pybreaker`).
- **Input:** Validated SQL, tenant ID, user role.
- **Output:** Query results, row count, execution time.
- **Issue:** #15

### Agent 4: Insights Agent (`agent_insights.py`)
- **Responsibility:** Generates human-readable insights, findings, and chart recommendations.
- **Technology:** RAG from Cole Nussbaumer's book + Azure OpenAI GPT-4o.
- **Input:** Query data, original question, tenant ID.
- **Output:** Summary, findings, recommendations, chart type, source citation.
- **Issue:** #16

---

## Security Flow

The security layer operates at multiple points in the pipeline:

```
User Question
    │
    ▼
┌─────────────────┐
│  Prompt Shields  │ ← Azure AI Content Safety
│  (Issue #13)     │   Detects prompt injection & jailbreak
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  Context Filter  │ ← Tenant schema + user role
│  (Issue #14)     │   Blocks unauthorized table/column access
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  Risk Analyzer   │ ← SQL analysis
│  (Issue #17)     │   Classifies risk: low | medium | high
└────────┬────────┘
         │
         ▼
    Execute Query
```

### Security Components:
- **Prompt Shields** (`prompt_shields.py`): Calls Azure AI Content Safety API to detect prompt injection, jailbreak attempts, and adversarial inputs. Blocks malicious queries before SQL generation.
- **Context Filter** (`context_filter.py`): Validates that generated SQL only accesses tables and columns the user's role is authorized to query. Prevents cross-tenant data leakage.
- **Risk Analyzer** (`risk_analyzer.py`): Classifies the risk level of approved queries based on sensitive column access, estimated result size, and cross-domain patterns.

---

## Data API Builder (DAB) Permissions

DAB enforces role-based access at the data layer:

| Role      | Read Access  | Sensitive Columns   | Metadata |
|-----------|--------------|---------------------|----------|
| `analyst` | ✅ Limited   | ❌ Excluded          | ❌       |
| `manager` | ✅ Full      | ✅ Full              | ❌       |
| `admin`   | ✅ Full      | ✅ Full              | ✅       |

### Per-Tenant Configuration:
- Each tenant has its own `dab-config.json` in the `dab/` directory.
- Connection strings use `@env()` syntax for secret injection.
- Sensitive columns (e.g., `salary`, `ssn`, `bank_account`, `cost_price`) are excluded from the `analyst` role.

---

## Circuit Breaker (Agent 3)

The Execution Agent uses a Circuit Breaker pattern (`pybreaker`) to protect against DAB service failures:

- **Fail Max:** 5 consecutive failures before opening the circuit.
- **Reset Timeout:** 60 seconds before attempting to close the circuit.
- **Behavior:** When open, requests fail fast with a clear error message instead of waiting for timeout.

---

## Issue References

| Module                | Issue   | Description                              |
|-----------------------|---------|------------------------------------------|
| RAG Client            | #09     | Azure AI Search integration              |
| Firebase Auth         | #10     | Token verification and tenant extraction |
| Intention Agent       | #11     | Semantic Kernel + RAG analysis           |
| SQL Generation        | #12     | LangGraph SQL pipeline                   |
| Prompt Shields        | #13     | Azure AI Content Safety integration      |
| Context Filter        | #14     | Tenant permission validation             |
| Execution Agent       | #15     | DAB REST API + Circuit Breaker           |
| Insights Agent        | #16     | RAG + GPT-4o insights generation         |
| Risk Analyzer         | #17     | SQL risk classification                  |
| Audit Logs            | #18     | Query history and CSV export             |
| Security Dashboard    | #19     | Security metrics aggregation             |
| Chat Interface        | #20     | Frontend chat + API integration          |
| Onboarding            | #23     | Company connection + schema indexing     |
