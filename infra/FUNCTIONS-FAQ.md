# Azure Functions — Preguntas Frecuentes

## ¿Debe estar corriendo el Functions siempre?

**Respuesta: SÍ. Siempre.**

El Azure Function App necesita estar activo y disponible en línea para que:
- El backend pueda hacer requests a `/api/skills`
- El SkillsManager cargue los 20 skills en memoria
- Los agentes puedan seleccionar skills relevantes

### ¿Por qué?

```
┌─── Backend (Python FastAPI) ────┐
│  - Solicitud del usuario        │
│  - Llama a /api/skills/select   │───────────┐
│    vía HTTP request             │           │
└─────────────────────────────────┘           │
                                              │
                                    ┌─────────▼──────────────────┐
                                    │  Azure Function App        │
                                    │  (dataagent-skills)        │
                                    │                            │
                                    │  En MEMORIA:               │
                                    │  - 20 skills JSON loaded   │
                                    │  - SkillsManager activo    │
                                    │  - GPT-4o selector listo   │
                                    │                            │
                                    │  Endpoints:                │
                                    │  GET  /api/skills          │
                                    │  POST /api/skills/select   │
                                    │  POST /api/skills/reload   │
                                    └────────────────────────────┘

Sin el Function App:
❌ Backend no puede obtener skills
❌ Los agentes no funcionan
❌ Las 20 skills están "perdidas"
```

### Ciclo de vida del Function App

```
1. DEPLOYMENT (una sola vez)
   ./infra/deploy-skills.sh
   ↓
   → Sube código Python a Azure
   → Instala dependencias
   → Inicia el Function App

2. STARTUP (automático)
   Function App arranca
   ↓
   → SkillsManager.__init__() se ejecuta
   → Lee /functions/skills/skills/agent_*/*.json
   → Carga 20 skills en la caché en memoria
   → Endpoints HTTP están listos

3. RUNNING (siempre activo)
   Function App escucha requests
   ↓
   → GET /api/skills → retorna 20 skills
   → POST /api/skills/select → rerank con GPT-4
   → PUT/DELETE para actualizar skills

4. SHUTDOWN (manual, si quieres ahorrar $$)
   az functionapp stop -n dataagent-skills -g dataagent-rg
   ↓
   ❌ Endpoints no responden
   ❌ Backend falla silenciosamente
   ✓ Ahorras dinero
```

---

## Estado Actual: Ya está desplegado

✅ **La URL ya funciona:**
```
https://dataagent-skills.azurewebsites.net
```

**¿Qué significa esto?**
- El Function App está **arriba** (online)
- El código está **desplegado**
- El SkillsManager está **activo en memoria**

**¿Qué FALTA ahora?**
- Las 20 skills JSON **NO ESTÁN CARGADAS AÚN**
- Necesitas correr `seed-skills.sh` para llenar `_skills_cache`

---

## Pipeline de Setup Completo

```
├─ ./infra/setup.sh
│  └─ Crea Container Apps + ACR
│
├─ ./infra/setup-services.sh
│  ├─ Crea Azure OpenAI
│  ├─ Crea Azure Search
│  ├─ Crea SQL Server
│  ├─ Crea Storage Account
│  └─ Crea Function App VACÍO ← Aquí es cuando se crea
│
├─ ./infra/deploy-skills.sh
│  └─ Sube código Python → Function App "despierta"
│
├─ ./infra/configure-cors.sh
│  └─ Permite requests desde Backend/Frontend
│
└─ ./infra/seed-skills.sh
   └─ Llena SkillsManager._skills_cache con 20 skills
```

---

## Configuración de CORS — Respuesta Detallada

### ¿Qué debería estar en CORS?

**Los 3 dominios principales:**

```bash
# 1. Backend URL (Container App)
BACKEND_URL=$(az containerapp show \
  --name dataagent-backend \
  --resource-group dataagent-rg \
  --query properties.configuration.ingress.fqdn -o tsv)

# Resultado: dataagent-backend.bravegrass-12345.eastus.containerapps.io

# 2. Frontend URL (Vercel / Next.js)
FRONTEND_URL="https://your-frontend.vercel.app"

# 3. Localhost (para testing local)
LOCALHOST="http://localhost:3000"

# CORS Config en Function App:
DATA_ALLOWED_ORIGINS="${BACKEND_URL} ${FRONTEND_URL} ${LOCALHOST}"
```

### Sin CORS: El error

```javascript
// Frontend JavaScript
fetch('https://dataagent-skills.azurewebsites.net/api/skills')
  .then(r => r.json())
  .catch(e => console.error(e))

// ❌ Error en navegador:
// Access to XMLHttpRequest at 'https://dataagent-skills.azurewebsites.net/api/skills'
// from origin 'https://frontend.vercel.app' has been blocked by CORS policy:
// No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Con CORS: Funciona

```javascript
// ✅ Function App responde con headers:
// Access-Control-Allow-Origin: https://frontend.vercel.app
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
// Access-Control-Allow-Headers: Content-Type, Authorization

// Resultado: ✓ fetch() funciona
```

### Configuración en Azure Functions

**Python (en function_app.py):**
```python
from azure.functions import AuthLevel

@app.route(route="skills", methods=["GET"], auth_level=AuthLevel.FUNCTION)
def list_skills(req):
    # Azure Functions maneja CORS automáticamente si está configurado
    return func.HttpResponse(...)
```

**CLI (lo que hace configure-cors.sh):**
```bash
az functionapp cors add \
  --name dataagent-skills \
  --resource-group dataagent-rg \
  --allowed-origins https://backend.com https://frontend.com http://localhost:3000
```

**Verificar CORS actual:**
```bash
az functionapp cors show \
  --name dataagent-skills \
  --resource-group dataagent-rg
```

---

## Recomendación de Dominios para CORS

| Domain | When | Example |
|--------|------|---------|
| Backend Container App | Always | https://dataagent-backend.bravegrass-*.eastus.containerapps.io |
| Frontend (Vercel) | Production | https://your-app.vercel.app |
| Frontend (Custom domain) | Production | https://your-domain.com |
| localhost:3000 | Development | http://localhost:3000 |
| localhost:8000 | Testing backend | http://localhost:8000 |
| localhost:5173 | Vite frontend | http://localhost:5173 |

### Instalación Segura

1. **Development (localhost)**
   ```bash
   az functionapp cors add \
     --name dataagent-skills \
     --resource-group dataagent-rg \
     --allowed-origins http://localhost:3000 http://localhost:8000
   ```

2. **Production (Vercel)**
   ```bash
   az functionapp cors add \
     --name dataagent-skills \
     --resource-group dataagent-rg \
     --allowed-origins https://your-frontend.vercel.app
   ```

3. **Agregar dominio personalizado**
   ```bash
   az functionapp cors add \
     --name dataagent-skills \
     --resource-group dataagent-rg \
     --allowed-origins https://yourdomain.com
   ```

**⚠️ NUNCA hagas:**
```bash
# ❌ Permitir todos (inseguro)
--allowed-origins "*"
```

---

## Testing Local vs Production

### Local Development

```bash
# Backend: Python FastAPI en localhost:8000
python -m uvicorn app.main:app --reload

# Frontend: Next.js en localhost:3000
npm run dev

# Function App: ya está en Azure (usar URL remota)
https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY
```

**CORS necesita:**
```bash
az functionapp cors add \
  --name dataagent-skills \
  --resource-group dataagent-rg \
  --allowed-origins http://localhost:3000 http://localhost:8000
```

### Production Deployment

```bash
# Backend: Container App en Azure
https://dataagent-backend.bravegrass-*.eastus.containerapps.io

# Frontend: Vercel
https://your-frontend.vercel.app

# Function App: ya está en Azure
https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY
```

**CORS necesita:**
```bash
az functionapp cors add \
  --name dataagent-skills \
  --resource-group dataagent-rg \
  --allowed-origins https://your-frontend.vercel.app https://dataagent-backend.bravegrass-*.eastus.containerapps.io
```

---

## Flujo Completo de una Request

```
Usuario escribe en Frontend:
"Dame sales agregadas por mes"
│
├─ Frontend (React/Next.js)
│  └─ POST /api/agents/intention
│     payload: { "query": "Dame sales..." }
│
├─ Backend (Python FastAPI en Container App)
│  ├─ POST https://dataagent-skills.azurewebsites.net/api/skills/select
│  │  payload: { "agent": "agent_intention", "query": "..." }
│  │
│  └─ ⬅️ Response:
│     {
│       "selected": [
│         {
│           "id": "intention_001",
│           "title": "Clasificacion de intencion analitica",
│           "content": "7 patrones: agregacion, comparacion, tendencia..."
│         },
│         { "id": "intention_005", ... },
│         { "id": "intention_003", ... }
│       ]
│     }
│
├─ Backend usa skills para generar la query SQL
│  └─ Determina: Agregacion temporal (GROUP BY mes)
│
├─ Backend → SQL Server (via pyodbc)
│  └─ SELECT mes, SUM(cantidad) FROM sales GROUP BY mes
│
└─ Response al usuario:
   {
     "query": "SELECT ...",
     "results": [...],
     "visualization": "line_chart"
   }
```

---

## Checklist de Verificación

```bash
# 1. ¿Function App está online?
curl https://dataagent-skills.azurewebsites.net/api/health 2>/dev/null && echo "✓" || echo "✗"

# 2. ¿Tengo FUNCTION_KEY?
az functionapp keys list --name dataagent-skills --resource-group dataagent-rg --query masterKey -o tsv

# 3. ¿CORS está configurado?
az functionapp cors show --name dataagent-skills --resource-group dataagent-rg

# 4. ¿Tengo las 20 skills?
FUNCTION_KEY="..."
curl "https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY" | jq '.total'

# 5. ¿Puedo seleccionar skills relevantes?
curl -X POST "https://dataagent-skills.azurewebsites.net/api/skills/select?code=$FUNCTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":"agent_sql","query":"sales","top":3}' | jq '.selected | length'
```

✅ Si todos dan ✓, está todo listo.

