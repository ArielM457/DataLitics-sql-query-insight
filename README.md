# DataLitics — Enterprise Analytical Intelligence Platform

**Transforming business questions into validated SQL, executed data, and actionable insights — without writing a single line of code.**

---

## Table of Contents

1. [The Challenge](#the-challenge)
2. [The Problem](#the-problem)
3. [Introducing DataLitics](#introducing-datalitics)
4. [Live Demo](#live-demo)
5. [Connecting Your Database](#connecting-your-database)
6. [Sample Questions to Try](#sample-questions-to-try)
7. [Full Feature Set](#full-feature-set)
8. [Security Architecture](#security-architecture)
9. [Performance](#performance)
10. [Innovation](#innovation)
11. [Azure Services Breadth](#azure-services-breadth)
12. [Responsible AI](#responsible-ai)
13. [System Architecture](#system-architecture)
14. [Measuring Success](#measuring-success)

---

## The Challenge

> *"Business users want answers from data, but generating SQL safely and correctly remains a bottleneck. Build an analytical engineering agent that converts natural language questions into validated SQL queries, executes them against a data warehouse or lake, and explains the results in clear business language. The system must decompose analytical intent, generate robust SQL, handle errors gracefully, and deliver insights through automated summaries. Teams must emphasize security, correctness, transparency, approval workflows, and operational reliability."*

This is not a prompt-to-SQL toy. This is an enterprise-grade challenge that demands a production-level system — multi-layer security, role-based access, automated corrections, and transparent, explainable results. DataLitics is the answer.

---

## The Problem

Every enterprise carries the same paradox: mountains of data, and almost no one who can access it independently.

Business analysts, product managers, and executives face a daily bottleneck. They have business questions that live in the data — but the data lives behind SQL, database schemas, and IT queues. The result:

- **Decisions get delayed** while waiting for data team bandwidth
- **Insight requests pile up** and the most urgent ones still wait days
- **Data teams become gatekeepers** instead of strategic partners
- **Non-technical users make decisions on assumptions** because they cannot self-serve

The "just learn SQL" approach fails. SQL is a technical skill that takes time to master. It is error-prone, schema-dependent, and — critically — dangerous. One wrong query against a production database can leak sensitive columns, cause performance degradation, or access data the user was never authorized to see.

What the market needed was not another BI dashboard with pre-built charts. It needed a conversational layer that genuinely understands business intent, generates correct and safe SQL, executes it with role-level enforcement, and then explains the results to a non-technical audience — in their own language.

---

## Introducing DataLitics

DataLitics is a **multi-agent analytical intelligence platform** that sits between your business users and your SQL data warehouse. It accepts natural language questions in any language, orchestrates a four-agent AI pipeline to understand intent, generate and validate SQL, execute it securely, and deliver business-ready insights with automatic chart recommendations.

It is not a chatbot wrapper over GPT. It is a production system built on top of Azure OpenAI, Azure AI Content Safety, Azure AI Search, Microsoft Data API Builder, LangGraph, FastAPI, and Next.js — with enterprise-grade multi-tenancy, Firebase-based authentication, role-based access control, and a full audit trail.

DataLitics was designed from the ground up to address every dimension of the challenge: security first, correctness through automated retry, transparency through explainability, and operational reliability through circuit breakers and graceful degradation.

---

## Live Demo

| Environment | URL |
|---|---|
| Frontend Application | [https://datalitics.vercel.app](https://datalitics.vercel.app) |
| Backend API | [https://dataagent-backend.onrender.com](https://dataagent-backend.onrender.com) |
| API Documentation | [https://dataagent-backend.onrender.com/docs](https://dataagent-backend.onrender.com/docs) |

### Credentials for Demo

A pre-configured demo tenant with sample data is available. Register at [https://datalitics.vercel.app/auth](https://datalitics.vercel.app/auth) and use the invite code provided during the presentation, or contact the team to receive a code.

---

## Connecting Your Database

DataLitics connects to **Microsoft SQL Server** databases (Azure SQL Database, Azure SQL Managed Instance, or on-premise SQL Server with network access).

### Try It With the Live Demo Database

A real Azure SQL database is available for evaluators to test the full onboarding and query flow. Use the credentials below when registering a new company in the application:

| Field | Value |
|---|---|
| **Company Name** | `DataLitics` |
| **SQL Server Host** | `dataliticsdb.database.windows.net` |
| **Database Name** | `sql-data` |
| **Username** | `dataagent_user@dataliticsdb` |
| **Password** | `Arm03092001-7724188123-CameandoYi` |
| **Port** | `1433` |

This database contains real sample data across multiple business domains (sales, inventory, finance) and is ready to query immediately after onboarding.

### Required Connection Information

During onboarding, an administrator provides the following:

| Field | Description | Example |
|---|---|---|
| **Company Name** | Display name for your organization | `DataLitics` |
| **SQL Server Host** | Server address or Azure SQL endpoint | `dataliticsdb.database.windows.net` |
| **Database Name** | Target database name | `sql-data` |
| **Username** | SQL authentication user | `dataagent_user@dataliticsdb` |
| **Password** | SQL authentication password | `Arm03092001-7724188123-CameandoYi` |
| **Port** | TCP port (default 1433) | `1433` |

The connection string format is:

```
mssql+pymssql://dataagent_user@dataliticsdb:Arm03092001-7724188123-CameandoYi@dataliticsdb.database.windows.net:1433/sql-data
```

### Using Your Own Database

If you want to connect your own SQL Server database instead of the demo one, make sure your Azure SQL Server firewall is configured to **allow connections from all IP addresses** (or at least from the backend server's IP). You can do this from the Azure Portal:

> Azure Portal → SQL Server → Networking → Firewall rules → Enable **"Allow Azure services and resources to access this server"** and add a rule for `0.0.0.0` to `255.255.255.255`.

Without this, the onboarding connection test will fail.

### What Happens at Connection Time

Once the administrator submits the connection string, DataLitics automatically:

1. Tests the connection and measures latency
2. Introspects the entire database schema (tables, columns, data types, relationships)
3. Detects sensitive columns (salary, SSN, bank account, passwords, emails, phone numbers) using pattern matching
4. Generates a Microsoft Data API Builder configuration with role-based column exclusions
5. Indexes the schema into Azure AI Search for real-time query routing
6. Sets the administrator's Firebase custom claims (`tenant_id`, `role: admin`)

No manual configuration is required after providing the connection string.

### Supported Database Objects

- Tables (all schemas, configurable whitelist)
- Views (treated identically to tables)
- Columns with all standard SQL Server data types
- Relationships (inferred from column naming conventions and foreign key metadata)

---

## Sample Questions to Try

The following questions can be asked directly in the chat interface. DataLitics handles the SQL, the execution, and the explanation automatically.

### Sales and Revenue

- "What were the top 10 best-selling products this month?"
- "Show me total revenue by region for the last quarter, compared to the same period last year"
- "Which customers have placed more than 5 orders in the last 30 days?"
- "What is the average order value by product category?"
- "Show me the daily sales trend for the current year"

### Inventory and Operations

- "Which products are at risk of stock-out based on current inventory and average daily sales?"
- "What is the average supplier delivery time by category?"
- "Show me inventory turnover rate by warehouse"
- "Which SKUs have not moved in the last 60 days?"

### Finance and Profitability

- "What is the gross margin by product line?"
- "Show me the top 10 customers by lifetime value"
- "Which contracts are expiring in the next 90 days?"
- "What is the monthly burn rate compared to budget?"

### Cross-Domain Analysis

- "Compare sales performance across regions, weighted by headcount"
- "Show me the correlation between marketing spend and revenue growth over the last 12 months"
- "Which customer segments have the highest churn risk based on purchase frequency?"

DataLitics works in **Spanish, English, Portuguese, French, German, Italian**, and any other language supported by Azure OpenAI GPT-4.1 — it detects the input language and responds in kind, including all insights, chart labels, and recommendations.

---

## Full Feature Set

### Natural Language Query Interface

Users ask questions in plain language. DataLitics does not require any knowledge of SQL, database schemas, or table structures. The system infers intent, maps it to the correct tables and columns, and constructs the query automatically.

The interface offers two operating modes:

**Fast Mode** — The question goes directly into the four-agent pipeline. Results in 3 to 8 seconds for most queries.

**Extended Mode** — Before executing, the Clarification Agent asks up to three targeted yes/no or multiple-choice questions to reduce ambiguity. The user answers with a single click. The refined intent is then passed to the main pipeline, producing significantly more precise results.

### The Four-Agent Pipeline

**Agent 1 — Intention Agent**
Receives the user's natural language question along with the tenant's schema, allowed tables, and role-based restrictions. Uses Azure OpenAI GPT-4.1 and dynamically selected Skills to extract a structured analytical intent: target tables, metrics, filters, time period, suggested SQL technique, and whether clarification is required. Validates all referenced tables against the actual schema to prevent hallucinations before passing the intent downstream.

**Agent 2 — SQL Agent (LangGraph Pipeline)**
Receives the structured intent and generates a SQL query using GPT-4.1. The generated query then passes through a five-node LangGraph directed graph:

- Syntax validation via `sqlparse` (rejects non-SELECT statements)
- Forbidden operation detection (blocks DELETE, DROP, UPDATE, INSERT, TRUNCATE, ALTER, EXEC, MERGE, GRANT, REVOKE)
- Prompt injection scanning via Azure AI Content Safety Prompt Shields
- Tenant and role permission validation via Context Filter
- Risk classification (low, medium, high) via Risk Analyzer

If validation fails at any node, the graph routes back to the Generate node with error context, up to three attempts with exponential backoff (1s, 2s, 4s). If all attempts fail, the system escalates with a clear, actionable message to the user.

**Agent 3 — Execution Agent**
Sends the validated SQL to Microsoft Data API Builder via REST. DAB enforces role-based permissions at the column level — analysts cannot read columns that were auto-detected as sensitive. A Circuit Breaker (fail-max: 5, reset: 60s) prevents cascading failures if the database is unreachable. Results are capped at 10,000 rows. Execution time is measured and logged.

**Agent 4 — Insights Agent**
Receives the raw query results and generates a business-ready analysis following the methodology from *Storytelling with Data* by Cole Nussbaumer Knaflic. The output includes a concise summary, specific findings (trends, anomalies, correlations), at least two actionable business recommendations, a chart type recommendation with justification, and a follow-up question suggestion. All text is produced in the language of the original question.

### Dynamic Skills System

DataLitics ships with a curated knowledge base of SQL techniques and data visualization methods, organized as JSON skill documents:

- **SQL Skills**: window functions, aggregation techniques, time-series queries, JOIN patterns, subqueries and CTEs, cohort and retention analysis, data profiling, anomaly detection
- **Insights Skills**: storytelling narrative structure, choosing the right visual, removing clutter, focusing attention, context importance

Skills are selected dynamically at runtime using GPT-4.1 semantic similarity — only the three most relevant skills are injected into each agent's prompt. This keeps token consumption low while improving response quality precisely where it matters.

Administrators can view, create, update, and delete skills through the Skills Management interface. The system continuously recommends new skills based on observed failure patterns.

### Automatic Chart Recommendations

Every query result is accompanied by an AI-recommended visualization. The Insights Agent selects from bar, line, area, pie, scatter, heatmap, or table formats based on the data's dimensions and the key message. The recommendation is cited with a reference to the source book and chapter. Users can override the recommendation and switch between chart types with a single click. All charts are rendered interactively with tooltips.

### Multi-Language Support

Every agent detects the language of the user's input and responds entirely in that language. The system has been tested in Spanish, English, Portuguese, French, German, and Italian. The detection is performed client-side using word frequency scoring and reinforced server-side via the agent system prompts.

### Multi-Tenant Architecture

DataLitics is built for multiple organizations on a single platform instance. Every tenant has:

- A separate database connection routed through a dedicated DAB instance
- A separate schema index in Azure AI Search
- Isolated audit logs in Firestore
- Independent Firebase custom claims
- No cross-tenant data visibility at any layer

### Role-Based Access Control

| Role | Data Access | Column Restrictions | Administrative |
|---|---|---|---|
| Analyst | Tables in admin-approved whitelist | Sensitive columns excluded | None |
| Manager | All tables in tenant schema | No restrictions | None |
| Admin | All tables | No restrictions | Invite, approve users, manage whitelist |
| Platform Admin | All tenants | No restrictions | Manage all companies and users |

Column restrictions for the Analyst role are applied automatically during onboarding based on column name pattern detection. They are enforced at the DAB layer — the SQL query is simply not allowed to return those columns, regardless of what was requested.

### Invitation and Approval Workflow

Administrators generate time-limited invite codes (configurable expiry: 24h, 7d, 30d, custom). New analysts use a code to register. Their account is created in Firebase but placed in a pending state. The administrator reviews pending users in a dedicated approval queue and either approves or rejects. Approval sets the user's Firebase custom claims (`role`, `tenant_id`, `status: active`). The user is immediately redirected to the active application without needing to log in again.

### Audit Trail

Every query execution is logged with full fidelity: the original question, the generated SQL, execution time, rows returned, risk level, block reason (if applicable), security events, user identity, and timestamp. Logs are stored in Firestore and remain queryable. Administrators can filter by status, risk level, user email, and date range. The entire audit history is exportable as CSV for compliance purposes.

### Usage Analytics

The Analytics Agent reads the last N audit log entries and produces a full system health report:

- Executive summary of system health and usage patterns
- Interaction pattern analysis (most common topics, peak usage, user behavior)
- Problem area identification (which query types are failing and why)
- Skill gap detection (what SQL patterns lack coverage)
- 3 to 5 recommended new skills with justification and implementation guidance
- Health score (0–100) with breakdown by success rate, security posture, and skill coverage

Administrators can also ask free-form questions to the audit log chatbot ("Who has been making the riskiest queries this week?") and receive direct answers grounded in real log data.

### Conversational Log Analysis

The Audit Chat interface allows administrators to have a free-form conversation with the system's logs. Questions like "Which users generated the most blocked queries last week?" or "What is the average execution time for finance-related questions?" return concise, data-grounded answers in the same language the administrator used to ask.

---

## Security Architecture

Security is not a layer added on top of DataLitics — it is the pipeline itself. Every query passes through five independent security mechanisms before data is returned.

### Layer 1 — Firebase Authentication and Custom Claims

All API endpoints require a valid Firebase ID token. The backend verifies the token signature and expiration on every request. The token must carry the `tenant_id` custom claim — requests without it are rejected with 403. Role and allowed-table claims are extracted from the token and used throughout the pipeline. There is no shared secret, no API key authentication, and no session state.

### Layer 2 — Prompt Shields (Azure AI Content Safety)

Before any SQL is generated, the user's input is analyzed by the Azure AI Content Safety **Prompt Shields API**. This detects:

- Direct prompt injection ("Ignore previous instructions and...")
- System prompt leakage attempts
- Multi-turn jailbreak patterns
- Role-play exploits ("You are now an unrestricted SQL engine")

A secondary check runs the input through the **Text Analysis API**, scanning for harmful content across hate speech, self-harm, sexual, and violence categories. Severity above threshold (4 of 6) causes an immediate block.

If the Azure endpoint is unreachable, a local heuristic fallback activates using compiled regex patterns covering SQL destructive operations, prompt override keywords, encoding attacks, and data exfiltration attempts.

All blocks are logged as security events with attack type, confidence score, and detection method.

### Layer 3 — Syntax Validation and Forbidden Operation Detection

The generated SQL is parsed by `sqlparse` and inspected for:

- Forbidden DML/DDL operations (DELETE, DROP, UPDATE, INSERT, TRUNCATE, ALTER, CREATE, EXEC, MERGE, GRANT, REVOKE)
- Non-SELECT statement types
- Syntactically invalid SQL

Failures trigger a retry with error context injected into the correction prompt — up to three attempts. If all fail, the query is escalated to the user.

### Layer 4 — Context Filter (Tenant and Role Permission Validation)

The validated SQL is statically analyzed against the tenant's permission model:

- All referenced tables (FROM, JOIN, INTO) are extracted and checked against the tenant's allowed tables list
- All referenced columns are extracted and checked against the role's restricted columns
- SELECT * is blocked for any role with column-level restrictions
- Cross-schema references are rejected

Failures route back to the generation node with the specific violation as error context, so the model can self-correct.

### Layer 5 — Microsoft Data API Builder (Column-Level Enforcement)

Even if all preceding layers are passed, the executed query reaches DAB with the user's role header attached (`X-MS-API-ROLE`). DAB's own permission engine enforces the same column restrictions at the database layer — independently of any upstream logic. Sensitive columns simply do not appear in the response.

This defense-in-depth approach means that even a bug in the Context Filter cannot leak restricted data, because DAB acts as a last-resort enforcement point.

### Layer 6 — Risk Classification and Audit

Every successful query is classified by the Risk Analyzer:

- **High** — Accesses sensitive columns, or no WHERE clause (potential full-table scan), or cross-domain join (e.g., HR + Finance)
- **Medium** — Result limited only by TOP clause, no granular filter
- **Low** — Properly filtered, no sensitive columns, single domain

The risk level is stored in the audit log and surfaced in the Security Dashboard. High-risk queries are visually flagged in the interface.

---

## Performance

**25% of the evaluation criteria is performance. DataLitics is built to be fast, resilient, and resource-efficient.**

### Pipeline Latency

| Operation | Target Latency |
|---|---|
| Clarification Agent (Extended Mode) | < 2 seconds |
| Intention Analysis | < 3 seconds |
| SQL Generation (first attempt) | < 4 seconds |
| Database Execution via DAB | < 2 seconds |
| Insights Generation | < 4 seconds |
| **Total end-to-end (Fast Mode)** | **3 – 8 seconds** |
| **Total end-to-end (Extended Mode)** | **5 – 12 seconds** |

### Resilience Mechanisms

**Circuit Breaker** — The Execution Agent wraps every DAB call in a Circuit Breaker (fail-max: 5 consecutive failures, reset timeout: 60 seconds). When the circuit is open, queries fail immediately with a user-facing message rather than waiting for individual timeouts. This prevents cascading failures and protects the database during instability.

**Exponential Backoff on Retries** — The SQL Agent retries failed generation attempts with 1s, 2s, and 4s delays. This avoids thundering-herd behavior on transient Azure OpenAI rate limits.

**Async Architecture** — The FastAPI backend is fully asynchronous (Python `asyncio`). All agent calls, database writes, and external HTTP requests are non-blocking. Audit log writes happen in background threads so they never add latency to the user's response path.

**Skill Pre-loading** — Skills are selected before entering the LangGraph graph, not during each node execution. This eliminates redundant calls to the Skills Function App inside the retry loop.

**Row Capping** — Query results are capped at 10,000 rows and chart data at 50 samples. This prevents large result sets from causing memory or serialization delays.

**Skills Caching** — The Skills Manager caches the full skill inventory after the first load, refreshing only when explicitly triggered. Individual skill selection calls use this cached inventory rather than re-fetching on every query.

### Observability

Execution time is measured and logged at every pipeline stage (intention, SQL generation, database execution, insights). Administrators see P50 and P95 latency in the Analytics dashboard. Slow queries are identifiable by stage so bottlenecks can be addressed at the correct layer.

---

## Innovation

**25% of the evaluation criteria is innovation.**

DataLitics pushes beyond the obvious approach at every level.

### Agentic Pipeline with LangGraph

Rather than a single monolithic prompt, DataLitics uses **LangGraph** — a directed, stateful graph where each node performs a discrete responsibility and conditional edges route execution based on intermediate results. The SQL Agent's graph contains seven nodes and multiple routing conditions. Retries are built into the graph's structure, not into application code. This makes the pipeline inspectable, testable, and extensible without touching business logic.

### Dynamic Skill Injection

Most NLP-to-SQL systems rely on a fixed system prompt. DataLitics dynamically selects the three most contextually relevant skills from a curated knowledge base using GPT-4.1 semantic similarity — at runtime, for every query. A question about monthly revenue gets SQL aggregation skills. A question about trends gets time-series and visualization skills. A question about customers gets cohort analysis skills. The system improves without redeployment — administrators add new skills through the UI, and all agents benefit immediately.

### Self-Healing SQL Generation

When the SQL Agent fails validation, it does not simply return an error. The error message (including the invalid SQL, the specific validation failure, and the correction instructions) is injected back into the generation prompt. The model sees its own mistake and is asked to fix it. This closed-loop correction mechanism means that many queries which would fail in a single-pass system succeed on the second or third attempt — transparently, with no user intervention.

### Extended Mode — Precision through Dialogue

The Clarification Agent enables a fundamentally different interaction model. Instead of generating a query that might be wrong, the system asks targeted questions that clarify the exact analytical scope before any SQL is written. The questions are rendered as clickable buttons — no typing required. Users answer in one or two clicks, and the resulting context produces dramatically more precise SQL. This mirrors the workflow of a skilled data analyst who asks clarifying questions before writing a query.

### Usage-Driven Skill Recommendations

The Analytics Agent closes the improvement loop. It reads the audit logs, identifies which queries are failing and why, detects the patterns of missing skill coverage, and recommends specific new skills that would address the observed gaps. The system gets smarter over time by analyzing its own failure modes.

### Multi-Language at Every Layer

Language detection is implemented both client-side (word frequency scoring across six languages) and server-side (explicit GPT-4.1 instruction). The client-side detection determines UI chrome language (button labels, status messages). The server-side detection determines all AI-generated content. The two systems operate independently so that neither depends on the other — making the feature robust even if one layer fails.

### Microsoft Data API Builder as Enforcement Layer

Using DAB as the execution engine was a deliberate architectural choice. Rather than executing raw SQL directly against the database, DataLitics routes every query through DAB, which provides an independent column-level enforcement mechanism. This means the security model is implemented in two separate systems — the AI pipeline and the data access layer — so a bug in one cannot be exploited to bypass the other.

---

## Azure Services Breadth

**25% of the evaluation criteria is the breadth of Azure services used.**

DataLitics does not use Azure as a deployment target — it uses Azure as a core functional dependency at every critical layer of the system.

### Azure OpenAI — GPT-4.1

Every agent in the pipeline runs on **Azure OpenAI GPT-4.1**. This includes:

- Intent extraction (Intention Agent)
- SQL generation and self-correction (SQL Agent)
- Business insight generation (Insights Agent)
- Clarification question generation (Clarification Agent)
- Skill selection via semantic similarity (Skills Manager)
- Log analysis and recommendation generation (Analytics Agent)
- Free-form conversational audit chat (Analytics Agent)

All calls use the `response_format: json_object` feature to guarantee structured, parseable outputs. GPT-4.1's multilingual capability enables the language detection feature without any additional translation service.

### Azure AI Content Safety — Prompt Shields and Text Analysis

**Azure AI Content Safety** is the primary injection detection mechanism. DataLitics uses two of its APIs:

- **Prompt Shields API** — Real-time detection of prompt injection attacks, instruction overrides, and jailbreak attempts in user-submitted questions
- **Text Analysis API** — Content classification across hate, self-harm, sexual, and violence categories with configurable severity thresholds

This service is called on every user query, before any SQL is generated. It represents the first line of defense in the multi-layer security model.

### Azure AI Search — Schema and Skills Indexing

**Azure AI Search** stores and retrieves two critical data types:

- **Schema Index** — The tenant's database schema is indexed in Azure AI Search. The Intention Agent queries this index to build the schema description used in every prompt. This enables the schema to be updated without restarting the application.
- **Skills Index** — The skills knowledge base is indexed for semantic search. The Skills Manager queries this index to find the most relevant skills for each query, using vector similarity.

Two separate Azure AI Search indexes are maintained — one per data type — with tenant-level filtering for schema data.

### Microsoft Data API Builder (DAB)

**Data API Builder** is deployed as the data access layer between the AI pipeline and the customer's SQL Server database. It provides:

- **Role-based REST endpoints** — Each table is accessible via `/api/{entity}` with automatic filtering based on the authenticated user's role
- **Column-level exclusion** — Sensitive columns are excluded per role at the database response level, not just in application logic
- **Azure Static Web Apps authentication integration** — DAB reads the `X-MS-API-ROLE` header set by the backend to determine which permissions to apply
- **Connection string management** — DAB handles the actual MSSQL connection, keeping credentials out of application code

DAB is auto-configured by DataLitics during onboarding — the `dab-config.json` file is generated dynamically based on the introspected schema and detected sensitive columns.

### Azure Serverless — Skills Function App

The Skills management system runs on an **Azure Functions** serverless deployment. The Function App exposes HTTP endpoints for skill CRUD operations and semantic skill selection. This separation of concerns means the skills system can be updated, scaled, and monitored independently of the main backend. The backend communicates with the Function App via authenticated HTTP calls using a function key.

### Firebase (Google Cloud — Auth Layer)

**Firebase Authentication** manages user identity across the platform. The backend uses the **Firebase Admin SDK** to:

- Verify ID tokens on every authenticated request
- Set and read custom claims (`tenant_id`, `role`, `allowed_tables`, `restricted_columns`) — these are the runtime authorization mechanism
- Manage user lifecycle (creation, approval, rejection)

**Google Firestore** is used as the primary persistence layer for:

- Audit logs (query history, security events)
- Invite codes
- Pending user registrations
- Tenant metadata

### Render (Deployment)

The FastAPI backend is containerized and deployed on **Render** using a `render.yaml` Blueprint configuration. The deployment is fully declarative — environment variables, Docker build context, health check endpoints, and service configuration are all captured in version control.

### Vercel (Frontend Deployment)

The Next.js frontend is deployed on **Vercel** with automatic deployments on every push to the main branch. Vercel's edge network serves the frontend globally with zero-configuration CDN.

### Summary of Azure Services by Function

| Azure Service | Function | Critical Dependency |
|---|---|---|
| Azure OpenAI GPT-4.1 | All AI reasoning across all 6 agents | Yes |
| Azure AI Content Safety — Prompt Shields | Injection and jailbreak detection | Yes |
| Azure AI Content Safety — Text Analysis | Harmful content classification | Yes |
| Azure AI Search (Schema Index) | Real-time schema routing for SQL generation | Yes |
| Azure AI Search (Skills Index) | Semantic skill selection per query | Yes |
| Microsoft Data API Builder | Role-enforced SQL execution with column restrictions | Yes |
| Azure Functions | Serverless skills management API | Yes |
| Firebase Admin SDK | Token verification and custom claims (authorization) | Yes |
| Google Firestore | Audit log persistence and user state | Yes |

---

## Responsible AI

**25% of the evaluation criteria is responsible AI.**

DataLitics treats responsible AI as a system property, not a checklist item.

### Transparency — Explainability at Every Step

Users are never presented with a result without an explanation. Every response includes:

- The generated SQL query (visible in a collapsible "Technical Query" section)
- A plain-language explanation of what the query retrieves and why
- The data itself, with row count and CSV export
- A business insight summary with specific findings
- The chart type recommendation and the Cole Nussbaumer justification for why that chart was chosen
- A source citation (book, chapter, page) for the visualization methodology
- A follow-up question suggestion to deepen the analysis

The system never produces a result that the user cannot trace back to its origin. There are no black-box answers.

### Fairness — Role-Based Access Without Bias

DataLitics does not make decisions about what data a user can see — those decisions are made by the human administrator who configures the role permissions and table whitelist. The system enforces those decisions consistently at every layer. The AI has no discretion over access control — it cannot grant or deny data access beyond what the permission model specifies. This eliminates the risk of the model making biased access decisions.

### Privacy — Automatic Sensitive Data Detection and Exclusion

During onboarding, the schema introspection engine automatically identifies columns that likely contain personal or sensitive information based on column name pattern matching:

- Identity: SSN, passport, DNI, national ID
- Financial: bank account, IBAN, routing number, credit card, CVV
- Contact: email, phone, address
- Compensation: salary, wage, payroll, bonus, commission
- Credentials: password, API key, token, secret

These columns are excluded from the Analyst role in the generated DAB configuration without requiring manual specification. Administrators can review and override the auto-detected exclusions before deployment.

### Safety — Multi-Layer Attack Prevention

The Prompt Shields integration prevents the AI from being manipulated into bypassing its own safety guardrails. This is responsible AI by design: the system anticipates adversarial inputs and responds to them with blocks and audit events, not with compliance.

The Context Filter ensures that even if a prompt injection attack partially succeeds at the SQL generation stage, the resulting query cannot access data outside the tenant's authorized scope. The final DAB enforcement layer means that even a successfully injected query that bypasses the Context Filter cannot leak restricted columns.

### Accountability — Immutable Audit Trail

Every query — successful, blocked, or failed — is logged with the user's identity, the exact question, the generated SQL, the outcome, and any security events triggered. This log is immutable from the user's perspective and accessible to administrators for review, export, and analysis. The system cannot operate without generating a complete record. This is not optional telemetry — it is a core part of the pipeline.

### Honesty — Graceful Failure and Clear Escalation

When the system cannot generate a valid query after three attempts, it tells the user exactly what went wrong and asks them to rephrase. When a question is outside the data domain, it says so directly. When a security check blocks a query, it explains that a security check blocked it — without revealing implementation details that could help an attacker refine their approach.

The system never fabricates data, never generates plausible-looking but incorrect SQL silently, and never presents a failed result as a success.

---

## System Architecture

### Context Diagram

```
+----------------------------------------------------------------------------------------------+
|                                     External Users                                           |
|                                                                                              |
|   Business Analyst         Company Admin         Platform Administrator                      |
|   (Natural Language         (Manages users,       (Manages all tenants,                      |
|    data questions)           approves access,      configures platform)                      |
|                              connects database)                                              |
+----------------------------------------------------------------------------------------------+
                                          |
                                          | HTTPS
                                          |
+----------------------------------------------------------------------------------------------+
|                              DataLitics Platform                                             |
|                                                                                              |
|   +------------------+       +---------------------------+       +----------------------+   |
|   |  Next.js 15      |       |   FastAPI Backend          |       |  Microsoft Data API  |   |
|   |  Frontend        | <---> |   Multi-Agent Pipeline     | <---> |  Builder (DAB)       |   |
|   |  (Vercel)        |       |   (Render)                 |       |  (Per-tenant SQL)    |   |
|   +------------------+       +---------------------------+       +----------------------+   |
|                                          |                                   |               |
+----------------------------------------------------------------------------------------------+
                                          |
                          ________________|_________________
                         |           |           |          |
                   Azure OpenAI   Azure AI    Azure AI   Firestore
                   GPT-4.1        Content     Search     (Google)
                                  Safety
```

### Component Diagram — Azure Services Integration

```
+=========================================================================+
|                         DataLitics Backend                               |
|                         (FastAPI + LangGraph)                            |
|                                                                          |
|  User HTTP Request                                                       |
|         |                                                                |
|         v                                                                |
|  +-------------------+                                                   |
|  | Firebase Admin SDK |-----> [Google Firebase Auth]                    |
|  | Token Verification |       Verifies JWT, extracts                     |
|  | + Custom Claims    |       tenant_id, role, permissions               |
|  +-------------------+                                                   |
|         |                                                                |
|         v                                                                |
|  +-----------------------------------------------------------------------+
|  |                    AGENT 0 — Clarification Agent                       |
|  |              (Extended Mode only — optional pre-step)                  |
|  |                                                                        |
|  |  Question -----> [Azure OpenAI GPT-4.1] -----> Clarifying Questions   |
|  |                   Generates up to 3 yes/no or                         |
|  |                   multiple-choice questions                            |
|  +-----------------------------------------------------------------------+
|         |
|         v
|  +-----------------------------------------------------------------------+
|  |                    AGENT 1 — Intention Agent                           |
|  |                                                                        |
|  |  Question -----> [Azure AI Search — Schema Index]                     |
|  |                   Retrieves tenant schema description                  |
|  |                                                                        |
|  |            -----> [Azure Functions — Skills API]                      |
|  |                   Selects 3 most relevant intention skills             |
|  |                                                                        |
|  |            -----> [Azure OpenAI GPT-4.1]                              |
|  |                   Extracts: tables, metrics, filters,                  |
|  |                   time period, SQL technique, language                 |
|  |                                                                        |
|  |  Output: Structured JSON Intent + detected_language                   |
|  +-----------------------------------------------------------------------+
|         |
|         v
|  +-----------------------------------------------------------------------+
|  |                    AGENT 2 — SQL Agent (LangGraph)                     |
|  |                                                                        |
|  |  +---[Generate]-------------------------------------------------------+|
|  |  |                                                                     ||
|  |  |  Intent -----> [Azure Functions — Skills API]                      ||
|  |  |                 Selects 3 most relevant SQL skills                  ||
|  |  |                                                                     ||
|  |  |          -----> [Azure OpenAI GPT-4.1]                             ||
|  |  |                 Generates SELECT query (T-SQL)                      ||
|  |  |                                                                     ||
|  |  +---[Validate]-------------------------------------------------------+|
|  |  |  sqlparse syntax check + forbidden operation detection              ||
|  |  |  Failure -> retry Generate (max 3 attempts, exponential backoff)   ||
|  |  +---[Prompt Shields]-------------------------------------------------+|
|  |  |  SQL -----> [Azure AI Content Safety — Prompt Shields API]         ||
|  |  |             Detects injection attacks in generated SQL              ||
|  |  |  SQL -----> [Azure AI Content Safety — Text Analysis API]          ||
|  |  |             Detects harmful content (hate, violence, etc.)          ||
|  |  |  Blocked -> route to Blocked node (no retry)                       ||
|  |  +---[Context Filter]-------------------------------------------------+|
|  |  |  Validates tables and columns against tenant permission model       ||
|  |  |  Failure -> retry Generate with violation context                  ||
|  |  +---[Risk Analysis]--------------------------------------------------+|
|  |  |  Classifies query: LOW / MEDIUM / HIGH                             ||
|  |  |  Considers: sensitive columns, volume, cross-domain joins          ||
|  |  +---[Ready / Blocked / Escalate]-------------------------------------+|
|  |                                                                         |
|  |  Output: Validated SQL + explanation + risk_level                      |
|  +-----------------------------------------------------------------------+
|         |
|         v
|  +-----------------------------------------------------------------------+
|  |                    AGENT 3 — Execution Agent                           |
|  |                                                                        |
|  |  SQL -----> [Microsoft Data API Builder]                              |
|  |             REST call with X-MS-API-ROLE header                        |
|  |             DAB enforces column-level permissions per role             |
|  |             DAB executes against tenant SQL Server / Azure SQL         |
|  |                                                                        |
|  |  Circuit Breaker wraps every DAB call                                 |
|  |  (fail-max: 5, reset-timeout: 60s)                                    |
|  |                                                                        |
|  |  Output: Raw data rows + row count + execution time                   |
|  +-----------------------------------------------------------------------+
|         |
|         v
|  +-----------------------------------------------------------------------+
|  |                    AGENT 4 — Insights Agent                            |
|  |                                                                        |
|  |  Data -----> [Azure Functions — Skills API]                           |
|  |              Selects 3 most relevant visualization skills              |
|  |                                                                        |
|  |       -----> [Azure OpenAI GPT-4.1]                                  |
|  |              Generates: summary, findings, recommendations,           |
|  |              chart config, chart justification, follow-up question     |
|  |              All text in user's detected language                      |
|  |                                                                        |
|  |  Output: Full insight document + chart configuration                  |
|  +-----------------------------------------------------------------------+
|         |
|         v
|  +-------------------+
|  | Audit Store        |-----> [Google Firestore]
|  | (Background write) |       Stores: question, SQL, status,
|  +-------------------+       risk_level, security_events,
|                              user identity, timestamps
|
|  Analytics Agent (on demand):
|  Firestore logs -----> [Azure OpenAI GPT-4.1]
|                         Health report + skill recommendations
|
+=========================================================================+

                    Customer Database (per tenant)
                    SQL Server / Azure SQL Database
                            ^
                            |
                    [Microsoft Data API Builder]
                    Role-based REST API
                    Column-level restrictions enforced
                    Connection string from environment
```

### Data Flow Summary

```
User Question (any language)
         |
         v
 [Firebase Token Verification] — Firebase Admin SDK
         |
         v
 [Clarification Agent] — Azure OpenAI (Extended Mode only)
         |
         v
 [Intention Agent] — Azure OpenAI + Azure AI Search + Azure Functions
         |
         v
 [SQL Agent — LangGraph]
    |-- Generate -- Azure OpenAI + Azure Functions
    |-- Validate -- sqlparse
    |-- Shield --- Azure AI Content Safety (Prompt Shields + Text Analysis)
    |-- Filter --- Context Filter (tenant permissions)
    |-- Risk ----- Risk Analyzer
         |
         v
 [Execution Agent] — Microsoft Data API Builder + Circuit Breaker
         |
         v
 [Insights Agent] — Azure OpenAI + Azure Functions
         |
         v
 [Audit Store] — Google Firestore (background)
         |
         v
 Response to User:
   - Plain-language explanation
   - Generated SQL (visible)
   - Data table (up to 1000 rows displayed)
   - Interactive chart
   - Business insights and recommendations
   - Follow-up question suggestion
```

---

## Measuring Success

### What a Successful Deployment Looks Like

A business user logs into DataLitics, types "Show me which product categories generated the most revenue last quarter, broken down by region" — in whatever language they speak — and receives within seconds:

- The exact SQL that was generated and executed
- A table with the results
- A bar chart recommended by the Insights Agent with a justification citing Cole Nussbaumer's chapter on comparison visualization
- A summary: "Region A contributed 43% of total revenue in Q3, with Electronics as the leading category at 28% of regional sales — a 12% increase over Q2"
- Two actionable recommendations
- A follow-up question: "Would you like to see the same breakdown for Q2 to compare trends?"

And all of this happened without the user knowing what tables exist, what the column names are, or what SQL looks like.

### Quantitative Success Indicators

| Indicator | Target | How Measured |
|---|---|---|
| End-to-end query success rate | > 90% | Audit log status distribution |
| SQL generation first-attempt success | > 80% | Retry count per query in audit |
| Security block false-positive rate | < 5% | Blocked queries / total queries |
| Average pipeline latency (P50) | < 6 seconds | Execution time per stage in audit |
| P95 latency | < 15 seconds | Computed by Analytics Agent |
| System health score | > 75 / 100 | Analytics Agent report |
| Onboarding to first query | < 10 minutes | Time from DB connection to active session |

### The Evaluation Criteria — How DataLitics Scores

**Performance (25%)** — Async FastAPI backend, circuit breakers, row capping, skill caching, background audit writes, exponential backoff, LangGraph stateful pipeline, and per-stage latency telemetry combine to deliver a system that is fast by architecture, not by optimization after the fact.

**Innovation (25%)** — LangGraph-based SQL pipeline with self-correction, dynamic skill injection via semantic similarity, Extended Mode dialogue-before-execution, usage-driven skill recommendations, dual-layer language detection, and DAB as an independent enforcement layer represent genuine architectural innovations beyond the standard NL-to-SQL approach.

**Azure Services Breadth (25%)** — Azure OpenAI GPT-4.1 powers all six agents. Azure AI Content Safety provides real-time injection and harmful content detection. Azure AI Search indexes both the schema and the skills knowledge base for semantic retrieval. Microsoft Data API Builder provides role-enforced database access with column-level restrictions. Azure Functions hosts the serverless skills management system. Every Azure service is a functional dependency, not decoration.

**Responsible AI (25%)** — Full explainability at every output step, automatic sensitive column detection and exclusion, multi-layer injection prevention, immutable audit trail for every query, role-based access controlled by human administrators not the AI, honest failure messaging, and no silent data fabrication.

---

## Technical Stack Reference

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Recharts |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Agent Orchestration | LangGraph, LangChain |
| LLM | Azure OpenAI GPT-4.1 |
| Security | Azure AI Content Safety, sqlparse, local heuristics |
| Schema & Skills Retrieval | Azure AI Search |
| Data Access | Microsoft Data API Builder, pymssql |
| Authentication | Firebase Auth, Firebase Admin SDK |
| Persistence | Google Firestore |
| Serverless | Azure Functions |
| Backend Deployment | Render (Docker) |
| Frontend Deployment | Vercel |
| Version Control | GitHub |

---

## Repository Structure

```
datalitics/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── agent_intention.py     # Intent extraction
│   │   │   ├── agent_sql.py           # LangGraph SQL pipeline
│   │   │   ├── agent_execution.py     # DAB execution + circuit breaker
│   │   │   ├── agent_insights.py      # Business insights generation
│   │   │   ├── agent_clarification.py # Extended mode pre-step
│   │   │   └── agent_analytics.py     # Usage analysis + recommendations
│   │   ├── core/
│   │   │   ├── auth.py                # Firebase token verification
│   │   │   ├── audit_store.py         # Firestore-backed audit logging
│   │   │   ├── dab_generator.py       # DAB config auto-generation
│   │   │   ├── schema_loader.py       # Schema loading + role filtering
│   │   │   ├── schema_inspector.py    # Live DB schema introspection
│   │   │   ├── skills.py              # Azure Functions skills client
│   │   │   └── circuit_breaker.py     # pybreaker configuration
│   │   ├── security/
│   │   │   ├── prompt_shields.py      # Azure AI Content Safety integration
│   │   │   ├── context_filter.py      # Tenant + role permission validation
│   │   │   └── risk_analyzer.py       # Query risk classification
│   │   ├── routers/
│   │   │   ├── query.py               # /query — main pipeline
│   │   │   ├── onboarding.py          # /onboarding — DB connection
│   │   │   ├── audit.py               # /audit — logs and metrics
│   │   │   ├── analytics.py           # /analytics — usage analysis
│   │   │   ├── skills.py              # /skills — skill CRUD
│   │   │   ├── admin_mgmt.py          # /admin — user management
│   │   │   └── platform_admin.py      # /platform — cross-tenant admin
│   │   ├── models/
│   │   │   ├── request.py             # Input validation models
│   │   │   └── response.py            # Output serialization models
│   │   ├── config.py                  # Pydantic settings
│   │   └── main.py                    # FastAPI app + router registration
│   ├── app/skills/                    # Skills knowledge base (JSON)
│   │   ├── agent_sql/                 # SQL technique skills
│   │   ├── agent_insights/            # Visualization skills
│   │   ├── agent_intention/           # Intent classification skills
│   │   └── agent_execution/           # Execution strategy skills
│   └── dab/                           # DAB configuration per tenant
│       └── {tenant_id}/
│           └── dab-config.json
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   ├── components/                # Reusable React components
│   │   ├── context/                   # AuthContext (global auth state)
│   │   └── lib/                       # API client, Firebase, utilities
│   └── public/                        # Static assets
├── render.yaml                        # Render deployment blueprint
└── README.md
```

---

*DataLitics — Built for the enterprise. Powered by Azure. Designed for everyone.*
