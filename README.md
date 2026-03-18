# DataAgent 🤖

Multi-agent AI system that converts natural language questions to SQL queries, executes them securely against tenant databases, and generates analytical insights with data visualizations.

**Hackaton Microsoft Azure — DataAgent v3 (Issue #01)**

---

## Stack Tecnológico

| Layer       | Technology                                        |
|-------------|---------------------------------------------------|
| **Backend** | Python · FastAPI · Azure Container Apps           |
| **Frontend**| React · Next.js 15 · Tailwind CSS                |
| **AI/ML**   | Azure OpenAI GPT-4o · Azure AI Search            |
| **Agents**  | Semantic Kernel · LangGraph                       |
| **Data**    | Data API Builder (DAB) · SQL Server               |
| **Auth**    | Firebase Auth                                     |
| **Security**| Azure AI Content Safety · Prompt Shields          |
| **CI/CD**   | GitLab CI · Docker                                |

---

## Repository Structure

```
dataagent/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── agents/       # 4 AI agents (intention, SQL, execution, insights)
│   │   ├── core/         # Auth, RAG client, circuit breaker
│   │   ├── security/     # Prompt shields, context filter, risk analyzer
│   │   ├── models/       # Pydantic request/response schemas
│   │   └── routers/      # API endpoints (query, onboarding, audit)
│   ├── tests/            # pytest test suite
│   ├── Dockerfile        # Container image definition
│   └── requirements.txt  # Python dependencies
├── frontend/             # Next.js 15 frontend
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components (Chat, Dashboard, Audit, Onboarding)
│   │   └── lib/          # Firebase & API client utilities
│   └── package.json      # Node.js dependencies
├── dab/                  # Data API Builder configurations
│   ├── empresa_a/        # Contoso (sales) tenant config
│   └── empresa_b/        # HR tenant config
├── infra/                # Infrastructure as Code
│   └── container-apps.yml
├── docs/                 # Architecture documentation
│   └── architecture.md
├── .gitlab-ci.yml        # CI/CD pipeline
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Python** 3.12+
- **Node.js** 20+
- **.NET** 8+ (for Data API Builder)
- **Docker** (for container builds)
- Azure subscription with:
  - Azure OpenAI service
  - Azure AI Search
  - Azure AI Content Safety
- Firebase project with Authentication enabled

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd dataagent
```

### 2. Backend setup

```bash
# Copy environment template
cp backend/.env.example backend/.env
# Edit backend/.env with your actual values

# Create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Verify with:
```bash
curl http://localhost:8000/health
# {"status":"ok","service":"dataagent-backend"}
```

### 3. Frontend setup

```bash
# Copy environment template
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Firebase and API values

cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Data API Builder (DAB)

```bash
# Install DAB CLI
dotnet tool install -g Microsoft.DataApiBuilder

# Start DAB for a tenant (example: empresa_a)
cd dab/empresa_a
dab start
```

DAB will be available at `http://localhost:5000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                          | Description                              | Required |
|-----------------------------------|------------------------------------------|----------|
| `AZURE_OPENAI_ENDPOINT`          | Azure OpenAI service endpoint            | ✅       |
| `AZURE_OPENAI_API_KEY`           | Azure OpenAI API key                     | ✅       |
| `AZURE_OPENAI_DEPLOYMENT_NAME`   | GPT model deployment name                | ✅       |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding model deployment            | ✅       |
| `AZURE_SEARCH_ENDPOINT`          | Azure AI Search endpoint                 | ✅       |
| `AZURE_SEARCH_KEY`               | Azure AI Search API key                  | ✅       |
| `AZURE_SEARCH_INDEX_BOOKS`       | Search index for reference books         | ✅       |
| `AZURE_SEARCH_INDEX_SCHEMA`      | Search index for database schemas        | ✅       |
| `DAB_BASE_URL`                   | Data API Builder base URL                | ✅       |
| `FIREBASE_PROJECT_ID`            | Firebase project identifier              | ✅       |
| `FIREBASE_CREDENTIALS_PATH`      | Path to Firebase service account JSON    | ✅       |
| `FRONTEND_URL`                   | Frontend URL for CORS                    | ✅       |
| `ENVIRONMENT`                    | Runtime environment (default: development)| ❌       |

### Frontend (`frontend/.env`)

| Variable                          | Description                              | Required |
|-----------------------------------|------------------------------------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY`   | Firebase web API key                     | ✅       |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`| Firebase auth domain                    | ✅       |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`| Firebase project ID                      | ✅       |
| `NEXT_PUBLIC_FIREBASE_APP_ID`    | Firebase app ID                          | ✅       |
| `NEXT_PUBLIC_API_URL`            | Backend API URL                          | ✅       |

---

## Module & Issue Reference

For the complete module breakdown and implementation plan, refer to:
- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Issue Plan:** DataAgent v3 — Hackaton Microsoft Azure issue board

| Module              | Issue   | Status          |
|---------------------|---------|-----------------|
| Repository Init     | #01     | ✅ Complete     |
| RAG Client          | #09     | 🔲 Pending      |
| Firebase Auth       | #10     | 🔲 Pending      |
| Intention Agent     | #11     | 🔲 Pending      |
| SQL Generation      | #12     | 🔲 Pending      |
| Prompt Shields      | #13     | 🔲 Pending      |
| Context Filter      | #14     | 🔲 Pending      |
| Execution Agent     | #15     | 🔲 Pending      |
| Insights Agent      | #16     | 🔲 Pending      |
| Risk Analyzer       | #17     | 🔲 Pending      |
| Audit Logs          | #18     | 🔲 Pending      |
| Security Dashboard  | #19     | 🔲 Pending      |
| Chat Interface      | #20     | 🔲 Pending      |
| Onboarding          | #23     | 🔲 Pending      |

---

## License

Private — Hackaton Microsoft Azure
