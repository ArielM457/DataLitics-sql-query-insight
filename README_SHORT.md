# DataLitics — Enterprise Analytical Intelligence Platform

**Ask a business question in plain language. Get validated SQL, executed data, and actionable insights — no code required.**

---

## Live Demo

| | URL |
|---|---|
| Frontend | [https://datalitics.vercel.app](https://datalitics.vercel.app) |
| Backend API | [https://dataagent-backend.onrender.com](https://dataagent-backend.onrender.com) |
| API Docs | [https://dataagent-backend.onrender.com/docs](https://dataagent-backend.onrender.com/docs) |

Register at the frontend and use the demo invite code provided at the presentation.

---

## The Problem

Business analysts and executives have questions that live in the data — but the data lives behind SQL, database schemas, and IT queues. The result: decisions get delayed, data teams become gatekeepers, and non-technical users operate on assumptions.

DataLitics solves this by letting any user ask questions in natural language and receive validated, role-enforced query results with business-ready explanations, in their own language.

---

## What It Does

DataLitics connects to a Microsoft SQL Server database and exposes a conversational interface. The user types a question. The system handles everything else.

### The Four-Agent Pipeline

**Agent 1 — Intention Agent**
Extracts structured analytical intent from the natural language question: target tables, metrics, filters, time period, and suggested SQL technique. Validates all referenced tables against the actual schema to prevent hallucinations.

**Agent 2 — SQL Agent**
Generates a SQL query using GPT-4.1 through a LangGraph directed graph with five validation nodes: syntax check, forbidden operation detection, prompt injection scan, role permission validation, and risk classification. Auto-corrects on failure with exponential backoff (up to 3 attempts).

**Agent 3 — Execution Agent**
Sends the validated SQL to Microsoft Data API Builder, which enforces column-level restrictions by role. Protected by a Circuit Breaker to prevent cascading failures.

**Agent 4 — Insights Agent**
Produces a business-ready summary, key findings, actionable recommendations, chart type recommendation, and a follow-up question — all in the language of the original question, following the *Storytelling with Data* methodology.

### Operating Modes

**Fast Mode** — Question goes directly into the pipeline. Results in 3–8 seconds.

**Extended Mode** — A Clarification Agent first asks up to 3 targeted yes/no or multiple-choice questions to reduce ambiguity. The user answers with a single click before the main pipeline runs.

---

## Key Features

- **Multi-language** — Detects input language and responds entirely in that language (Spanish, English, Portuguese, French, German, Italian, and more)
- **Role-Based Access Control** — Analyst, Manager, Admin, and Platform Admin roles with column-level restrictions enforced at the data layer
- **Multi-Tenant** — Each organization has isolated database connections, schemas, audit logs, and permissions
- **Audit Trail** — Every query logged with full fidelity: question, SQL, execution time, rows, risk level, security events, user identity
- **Invitation Workflow** — Admins generate invite codes; new users are placed in a pending queue until approved
- **Usage Analytics** — AI-generated system health reports with skill gap detection and recommendations
- **Conversational Log Analysis** — Admins can ask free-form questions about audit log data
- **Dynamic Skills System** — Curated SQL and visualization knowledge base; top 3 most relevant skills injected per prompt at runtime
- **Automatic Chart Recommendations** — Bar, line, area, pie, scatter, heatmap, or table — AI-selected, user-overridable

---

## Security

Every query passes through five independent security layers:

1. **Firebase Authentication** — JWT verified on every request; `tenant_id` claim required
2. **Azure AI Content Safety** — Prompt Shields API detects injection, jailbreak, and role-play exploits; Text Analysis API scans for harmful content
3. **Syntax Validation** — `sqlparse` enforces SELECT-only; blocks DELETE, DROP, UPDATE, INSERT, TRUNCATE, ALTER, EXEC, and 7 more
4. **Context Filter** — Static SQL analysis validates all referenced tables and columns against the user's role permissions
5. **DAB Enforcement** — Column-level restrictions applied at the REST API layer, independent of what was requested

---

## Azure Services Used

| Service | Purpose |
|---|---|
| Azure OpenAI GPT-4.1 | Powers all four agents |
| Azure AI Content Safety | Prompt Shields + Text Analysis |
| Azure AI Search | Schema indexing and skills retrieval |
| Microsoft Data API Builder | Role-enforced REST access to SQL Server |
| Azure Functions | Skills management API |
| Azure SQL Database | Tenant data warehouse |

---

## Tech Stack

**Backend** — Python, FastAPI, LangGraph, Azure OpenAI SDK, pybreaker, sqlparse, Firebase Admin SDK, pymssql

**Frontend** — Next.js 14, TypeScript, Tailwind CSS, Chart.js, Firebase Auth

**Infrastructure** — Render (backend), Vercel (frontend), Firestore (audit logs, invites), Firebase Authentication

---

## Connecting Your Database

DataLitics connects to Microsoft SQL Server. During onboarding, provide:

| Field | Example |
|---|---|
| Company Name | `DataLitics` |
| Server Host | `dataliticsdb.database.windows.net` |
| Database Name | `sql-data` |
| Username | `dataagent_user@dataliticsdb` |
| Password | `Arm03092001-7724188123-CameandoYi` |
| Port | `1433` |

At connection time, DataLitics automatically introspects the schema, detects sensitive columns, generates a DAB configuration with role-based restrictions, and indexes the schema into Azure AI Search. No manual configuration required.

---

## Sample Questions

- "What were the top 10 best-selling products this month?"
- "Show me total revenue by region for the last quarter"
- "Which products are at risk of stock-out based on current inventory?"
- "What is the gross margin by product line?"
- "Which customers have placed more than 5 orders in the last 30 days?"
- "Show me the correlation between marketing spend and revenue growth"
- "¿Cuáles son los productos con mayor rotación este trimestre?"
- "Quais clientes têm o maior valor de vida útil?"
