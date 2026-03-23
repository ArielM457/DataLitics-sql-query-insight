# 🚀 Infrastructure Scripts — DataAgent

Scripts de infraestructura para desplegar y configurar servicios de Azure.

---

## 📋 Índice

1. [setup.sh](#setupsh) — Crea Container Apps y ACR
2. [setup-services.sh](#setup-servicessh) — Crea Azure OpenAI, SQL, Search, etc.
3. [setup-skills.sh](#setup-skillssh) — **NUEVO: Orquesta deploy, CORS y seed de skills**
4. [deploy-skills.sh](#deploy-skillssh) — Despliega el código del Function App
5. [seed-skills.sh](#seed-skillssh) — Carga las 20 skills via API REST
6. [configure-cors.sh](#configure-corssh) — Configura CORS para Backend/Frontend

---

## 📌 Flujo Recomendado

### Opción A: Automatizado (Recomendado)

```bash
# 1. Crea infraestructura básica (Container Apps, ACR)
./infra/setup.sh

# 2. Crea servicios de IA (OpenAI, Search, SQL, Function App)
./infra/setup-services.sh

# 3. Despliega + configura + seedea skills EN UN SOLO COMANDO
./infra/setup-skills.sh
```

### Opción B: Paso a paso (Para debugging)

```bash
# Deploy el código del Function App
./infra/deploy-skills.sh

# Configura CORS
./infra/configure-cors.sh

# Carga las 20 skills
./infra/seed-skills.sh
```

### Opción C: Solo recargar skills (Después de cambios)

```bash
# Si solo modificaste los JSON files de skills
./infra/seed-skills.sh
```

---

## 🔍 Detalles de Cada Script

### setup.sh

**Qué hace:**
- Crea Azure Container Registry (ACR)
- Crea Azure Container Apps Environment
- Crea 4 Container Apps (backend, frontend, dab-empresa-a, dab-empresa-b)
- Configura autenticación y networking

**Cuándo correr:**
- Solo una vez al principio
- Cuando necesites reinicializar la infraestructura base

**Ejemplo:**
```bash
./infra/setup.sh
```

---

### setup-services.sh

**Qué hace:**
- Azure OpenAI (gpt-4o + text-embedding-3-large)
- Azure AI Search
- Azure AI Content Safety
- Azure SQL Server + 2 bases de datos (empresa_a, empresa_b)
- Azure Storage Account + Function App (para skills)
- Application Insights
- Inyecta env vars en todos los Container Apps

**Cuándo correr:**
- Después de setup.sh
- Solo una vez (crea recursos costosos)
- Edita las variables en la sección "EDITAR ESTOS VALORES" antes de correr

**Ejemplo:**
```bash
./infra/setup-services.sh
```

**Tiempo:** ~15-20 minutos

---

### setup-skills.sh ⭐ NUEVO

**Qué hace:**
- Orquesta 3 pasos: deploy → CORS → seed
- Pausa entre pasos para confirmación

**Cuándo correr:**
- Después de setup-services.sh
- Para desplegar + configurar skills automáticamente

**Ejemplo:**
```bash
chmod +x infra/setup-skills.sh
./infra/setup-skills.sh
```

**Opciones:**
```bash
# Saltarse el deploy (si ya lo hiciste)
./infra/setup-skills.sh --skip-deploy

# Solo actualizar skills sin re-desplegar
./infra/setup-skills.sh --skip-deploy --skip-cors
```

**Tiempo:** ~5-10 minutos (primero) or ~2 minutos (reloads)

---

### deploy-skills.sh

**Qué hace:**
- Instala Azure Functions Core Tools (via npm)
- Ejecuta `func azure functionapp publish dataagent-skills --build remote`
- El Function App carga los 20 JSON files desde disk automáticamente

**Cuándo correr:**
- Después de setup-services.sh
- Cuando cambias código Python en `functions/skills/`
- Cuando agregas nuevos skills/modificas JSON files

**Ejemplo:**
```bash
chmod +x infra/deploy-skills.sh
./infra/deploy-skills.sh
```

**Prerequisites:**
- Node.js/npm instalado (v14+)
- Azure CLI logueado

**Output ejemplo:**
```
✓ Código desplegado exitosamente

Function App:
  Nombre:  dataagent-skills
  URL:     https://dataagent-skills.azurewebsites.net

FUNCTION_KEY=abcd1234...xyz
```

---

### seed-skills.sh

**Qué hace:**
- Lee todos los 20 JSON files de `functions/skills/skills/`
- Hace POST requests a `/api/skills` del Function App
- Carga las skills en memoria del SkillsManager
- Reporta: skills cargadas ✓, errores ✗

**Cuándo correr:**
- Después de deploy-skills.sh
- Cuando modificas los JSON files de skills
- Para recargar skills sin re-desplegar el código

**Ejemplo:**
```bash
# Opción 1: Obtiene FUNCTION_KEY automáticamente de Azure
chmod +x infra/seed-skills.sh
./infra/seed-skills.sh

# Opción 2: Proporciona la clave manualmente
FUNCTION_KEY="abcd1234..." ./infra/seed-skills.sh
```

**Skills cargadas:**

| Agent | Count | Skills |
|-------|-------|--------|
| agent_intention | 5 | intent_classification, implicit_joins, domain_validation, time_analysis_detection, cohort_analysis_detection |
| agent_sql | 8 | aggregation_techniques, join_patterns, window_functions, time_series_queries, subqueries_ctes, anomaly_detection, cohort_retention, data_profiling |
| agent_execution | 2 | query_optimization, data_size_management |
| agent_insights | 5 | choosing_visuals, remove_clutter, focus_attention, storytelling_narrative, context_importance |

**Verification después:**
```bash
FUNCTION_KEY="..."
curl https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY | jq '.total'
# Output: 20
```

---

### configure-cors.sh

**Qué hace:**
- Configura CORS en el Function App
- Permite requests desde:
  - `https://<backend-url>`
  - `<frontend-url>` (Vercel/etc)
  - `http://localhost:3000` (testing local)
  - `http://localhost:8000` (testing backend local)

**Cuándo correr:**
- Después de deploy-skills.sh
- Antes que el frontend/backend intenten hacer requests

**Ejemplo:**
```bash
chmod +x infra/configure-cors.sh
./infra/configure-cors.sh
```

**sin CORS, verás este error en el browser:**
```
Access to XMLHttpRequest at 'https://dataagent-skills.azurewebsites.net/api/skills'
from origin 'https://frontend.com' has been blocked by CORS policy
```

**Edita `configure-cors.sh` para agregar más dominios:**
- Línea ~25: Agrega tu dominio a `ALLOWED_ORIGINS`

---

## 🔑 Obtener FUNCTION_KEY

**Opción 1: Automático (en scripts)**
```bash
# Los scripts lo obtienen automáticamente
./infra/seed-skills.sh
```

**Opción 2: Manual (CLI)**
```bash
az functionapp keys list \
  --name dataagent-skills \
  --resource-group dataagent-rg \
  --query masterKey -o tsv
```

**Opción 3: Manual (Portal Azure)**
- Ir a Function App → "App keys" → copiar "Master key"

---

## 🧪 Testing de Skills

### Test 1: Listar todas las skills

```bash
FUNCTION_KEY="..."
curl "https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY" | jq '.'
```

**Response esperado:**
```json
{
  "skills": [...20 skills...],
  "total": 20,
  "agents": ["agent_intention", "agent_sql", "agent_execution", "agent_insights"]
}
```

### Test 2: Filtrar por agente

```bash
curl "https://dataagent-skills.azurewebsites.net/api/skills?agent=agent_sql&code=$FUNCTION_KEY" | jq '.total'
# Output: 8
```

### Test 3: Obtener una skill específica

```bash
curl "https://dataagent-skills.azurewebsites.net/api/skills/sql_001?code=$FUNCTION_KEY" | jq '.'
```

### Test 4: Seleccionar skills relevantes (GPT-4)

```bash
curl -X POST "https://dataagent-skills.azurewebsites.net/api/skills/select?code=$FUNCTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "agent_sql",
    "query": "agregacion de sales por categoría con cantidades",
    "top": 3
  }' | jq '.selected[] | {id, title}'
```

**Response esperado:**
```json
{
  "id": "sql_001",
  "title": "Tecnicas de agregacion y GROUP BY"
},
{
  "id": "sql_007",
  "title": "... another relevant skill"
}
```

---

## ⚙️ Configuración Avanzada

### Variables de Entorno

Edita el inicio de cada script:

```bash
# setup-services.sh
SUBSCRIPTION_ID="..."           # Tu Azure subscription
RESOURCE_GROUP="dataagent-rg"   # Nombre del resource group
LOCATION="eastus"               # Región Azure
FUNCTIONS_NAME="dataagent-skills"

# deploy-skills.sh
FUNCTIONS_DIR="./functions/skills"
```

### Azure Function App — Environment Variables

El Function App necesita estas vars (inyectadas automáticamente por setup-services.sh):

```bash
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1
```

Ver todas:
```bash
az functionapp config appsettings list \
  --name dataagent-skills \
  --resource-group dataagent-rg
```

---

## 🛠️ Troubleshooting

### Error: "npm not found"
```bash
# Instala Node.js desde https://nodejs.org/
# O si usas Homebrew (macOS):
brew install node

# O si usas apt (Linux):
sudo apt install nodejs npm
```

### Error: "Function App not found"
```bash
# Verifica que setup-services.sh ya corrió
./infra/setup-services.sh

# Y verifica que el nombre es correcto:
az functionapp list -g dataagent-rg --query '[].name'
```

### Error: "CORS blocked request"
```bash
# Corre configure-cors.sh
./infra/configure-cors.sh

# O agrega tu dominio manualmente:
az functionapp cors add \
  --name dataagent-skills \
  --resource-group dataagent-rg \
  --allowed-origins https://tu-dominio.com
```

### Skills vacías después de deploy
```bash
# Verifica que los JSON files existen:
ls functions/skills/skills/agent_*/*.json | wc -l
# Debería output: 20

# Si not, ejecuta seed manualmente:
./infra/seed-skills.sh
```

### ¿Cómo sé si todo funciona?
```bash
# Ejecuta estos 3 comandos:

# 1. ¿El Function App está online?
curl https://dataagent-skills.azurewebsites.net/

# 2. ¿Tengo las 20 skills?
FUNCTION_KEY="..."
curl "https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY" | jq '.total'

# 3. ¿CORS está configurado?
curl -H "Origin: https://tu-frontend.com" \
  "https://dataagent-skills.azurewebsites.net/api/skills?code=$FUNCTION_KEY" \
  -v 2>&1 | grep "Access-Control"
```

---

## 📊 Costos Estimados

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| Azure OpenAI | 40 TPM | ~$50-100 |
| Azure Search | Basic | ~$72 |
| SQL Server Basic | 5 DTU | ~$10 |
| Function App | Consumption | $0.17/million req |
| Storage Account | Standard | ~$2 |
| Application Insights | Free tier | $0 |
| **Total** | | **~$150/month** |

---

## 📖 Referencias

- [Azure Functions Python Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Azure OpenAI API Reference](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference)
- [Azure AI Search REST API](https://learn.microsoft.com/en-us/azure/search/search-api-overview)
- [SkillsManager Source Code](../functions/skills/skills_manager.py)

---

## 📞 Preguntas Frecuentes

**P: ¿Por qué son 4 scripts separados?**
R: Porque:
- `setup.sh` es raro, solo al inicio
- `setup-services.sh` es costoso, pero necesario
- `setup-skills.sh` es rápido y reutilizable
- Cada uno puede ejecutarse independientemente

**P: ¿Se pueden cambiar los skills después de deploy?**
R: Sí, de dos formas:
1. Edita el JSON file + corre `./infra/seed-skills.sh`
2. Usa la API `/api/skills` POST/PUT/DELETE

**P: ¿Cuánto cuesta mantener el Function App?**
R: Muy poco si usas el pricing de Consumption Plan.
- 1M requests/mes = ~$0.17
- 1GB RAM = free
- Almacenamiento de skills = negligible

**P: ¿Qué pasa si Functions falla?**
R: El backend debería tener fallback:
- Si `/api/skills/select` falla → usar skills por defecto
- Pasar los 5 últimos skills usados → mejora UX

---

## ✨ Próximas Mejoras

- [ ] Adicionar skills via `setupskills.sh --interactive` wizard
- [ ] Health check endpoint: `/api/health`
- [ ] Métricas: contar cuántas veces se usa cada skill
- [ ] Sync con GitHub: actualizar skills automáticamente en cada push

