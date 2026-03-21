# M4 — Agentes de IA: Implementacion

> Modulo 4 del proyecto DataLitics — Hackaton Microsoft Azure

---

## Resumen de cambios

El Modulo 4 implementa el nucleo del sistema: los 4 agentes de IA que convierten preguntas en lenguaje natural en consultas SQL validadas, las ejecutan via DAB y generan insights de negocio.

---

## Archivos creados (nuevos)

| Archivo | Descripcion |
|---|---|
| `backend/app/core/schema_loader.py` | Lee esquemas de BD desde los `dab-config.json` locales |
| `backend/app/core/audit_store.py` | Almacen en memoria para audit logs y eventos de seguridad |
| `functions/skills/function_app.py` | Azure Function App — 7 HTTP triggers para CRUD y seleccion de skills |
| `functions/skills/skills_manager.py` | Motor de Skills serverless: carga JSON, seleccion semantica GPT-4.1, CRUD |
| `functions/skills/host.json` | Configuracion de Azure Functions v2 |
| `functions/skills/requirements.txt` | Dependencias del Function App (azure-functions, openai) |
| `functions/skills/skills/agent_intention/*.json` | 5 skills para el Agente 1 (clasificacion, JOINs, temporal, dominio, cohortes) |
| `functions/skills/skills/agent_sql/*.json` | 8 skills para el Agente 2 (agregacion, JOINs, window, time series, CTEs, anomalias, cohortes, perfilado) |
| `functions/skills/skills/agent_execution/*.json` | 2 skills para el Agente 3 (optimizacion, gestion de datos) |
| `functions/skills/skills/agent_insights/*.json` | 5 skills para el Agente 4 (visualizacion, clutter, atencion, storytelling, contexto) |
| `scripts/setup-azure-ai.sh` | Script para crear Azure OpenAI + Content Safety + Function App + Storage Account |

## Archivos modificados

| Archivo | Que cambio |
|---|---|
| `backend/app/agents/agent_intention.py` | Implementacion completa del Agente 1 (Issue #11) |
| `backend/app/agents/agent_sql.py` | Implementacion completa del Agente 2 con LangGraph (Issues #12, #13, #14) |
| `backend/app/agents/agent_execution.py` | Implementacion completa del Agente 3 con Circuit Breaker (Issue #15) |
| `backend/app/agents/agent_insights.py` | Implementacion completa del Agente 4 (Issue #16) |
| `backend/app/security/prompt_shields.py` | Prompt Shields con REST API directa: `shieldPrompt` + `text:analyze` + fallback local (Issue #13) |
| `backend/app/security/context_filter.py` | Implementacion del filtro de contexto empresarial (Issue #14) |
| `backend/app/security/risk_analyzer.py` | Implementacion del analizador de riesgo de consultas (Issue #17) |
| `backend/app/core/skills.py` | Reescrito como SkillsClient HTTP — proxy al Azure Function App |
| `backend/app/routers/skills.py` | Router actualizado — proxy de CRUD al Function App via SkillsClient |
| `backend/app/core/rag.py` | RAGClient simplificado — busqueda de libros delegada al sistema de Skills |
| `backend/app/core/auth.py` | Auth con modo desarrollo (JSON token) + Firebase produccion |
| `backend/app/routers/query.py` | Orquestacion completa del pipeline de 4 agentes |
| `backend/app/routers/audit.py` | Endpoints conectados al audit store real |
| `backend/app/config.py` | Variables de Content Safety + Skills Function App URL/Key agregadas |
| `backend/.env.example` | Variables de Content Safety en el template, modelo actualizado a GPT-4.1 |

---

## Arquitectura implementada

### Pipeline de ejecucion (query router)

```
POST /query
    |
    v
[1] Auth — verifica token (Firebase o dev mode JSON)
    |
    v
[2] IntentionAgent — analiza pregunta con GPT-4.1 + Skills dinamicos + esquema
    |                  output: JSON con tablas, metricas, filtros, tecnica
    |--- si necesita clarificacion → responde al usuario
    |--- si esta fuera de dominio → bloquea
    |
    v
[3] SQLAgent (LangGraph) — genera y valida SQL en pipeline de nodos:
    |   [Generate] → [Validate] → [PromptShields] → [ContextFilter] → [RiskAnalysis] → [Ready]
    |        ^                          |                   |
    |        |--- auto-correccion ------|                   |
    |        |--- auto-correccion (max 3 intentos) --------|
    |
    |--- si bloqueado por seguridad → registra evento + responde
    |
    v
[4] ExecutionAgent — ejecuta via DAB REST API con Circuit Breaker
    |   - timeout 30s, limite 10.000 filas
    |   - Circuit Breaker: 5 fallos → abre circuito → 60s → reintento
    |
    |--- si error de DAB → puede retornar al Agente 2 para auto-correccion
    |
    v
[5] InsightsAgent — genera insights con GPT-4.1 + Skills de visualizacion (Cole Nussbaumer)
    |   - resumen de negocio
    |   - hallazgos (tendencias, anomalias, correlaciones)
    |   - 2+ recomendaciones accionables
    |   - tipo de chart + config Chart.js
    |   - cita del libro + capitulo + pagina
    |   - pregunta de seguimiento
    |
    v
QueryResponse — SQL + explicacion + datos + insights + seguridad + traza
```

### Grafo LangGraph del Agente 2

```
[generate] ---> [validate] ---> [prompt_shields] ---> [context_filter] ---> [risk_analysis] ---> [ready] ---> END
    ^               |                   |                    |
    |               |                   v                    |
    |--- retry -----|             [blocked] ---> END         |
    |               |                                        |
    |--- retry (max 3) ------------------------------------|
    |
    v (si max intentos superados)
[escalate] ---> END
```

---

## Mejoras respecto al plan original

1. **Schema Loader** (no estaba en el plan): Modulo nuevo que lee los `dab-config.json` directamente, haciendo que M4 funcione sin M3 (AI Search). Genera descripciones de esquema para inyectar en los prompts.

2. **Skills en Azure Functions** (reemplaza M3 RAG): Los skills viven en un Azure Function App serverless independiente (`functions/skills/`). El backend se comunica via HTTP con un `SkillsClient` que mantiene la misma interfaz. GPT-4.1 selecciona los skills mas relevantes por peticion dentro del Function App. CRUD API permite editar y mejorar skills desde el frontend. 20 skills creados basados en los libros de referencia.

3. **Auth con modo desarrollo**: Permite testear todo el pipeline sin Firebase configurado, usando un JSON como token: `{"tenant_id": "empresa_a", "role": "analyst"}`.

4. **Audit Store**: No estaba explicitamente en M4 pero es necesario para que los endpoints de auditoria funcionen. Almacena logs y eventos de seguridad en memoria con export CSV.

5. **Risk Analyzer en el pipeline**: Se integro como nodo adicional despues del context filter en el grafo LangGraph, clasificando cada consulta en low/medium/high.

6. **Modelo GPT-4.1** (mejora sobre plan original): Se actualizo de GPT-4o a GPT-4.1 para mejor rendimiento. El deployment name es configurable en `.env` para poder cambiar entre modelos facilmente.

7. **Script de provisioning** (`scripts/setup-azure-ai.sh`): Crea automaticamente los 4 recursos de Azure necesarios (OpenAI + Content Safety + Storage Account + Function App) y genera el `.env` con las credenciales.

8. **Prompt Shields con REST API directa**: Se reemplazo el uso de la libreria `azure-ai-contentsafety` por llamadas REST directas con `httpx` para usar los endpoints correctos: `shieldPrompt` (deteccion de inyeccion) y `text:analyze` (contenido danino).

---

## Dependencias entre modulos

| M4 necesita de... | Estado | Como se resuelve |
|---|---|---|
| M2 (Firebase Auth) | Opcional | Modo desarrollo con JSON token |
| M3 (Skills Function App) | Necesario | Azure Function App en `functions/skills/` — local con `func start` o desplegado en Azure |
| DAB (Data API Builder) | Necesario para Agente 3 | Se puede testear sin DAB (retorna error controlado) |
| Azure OpenAI GPT-4.1 | Necesario para Agentes 1,2,4 | Requiere endpoint + API key en .env |

---

## Variables de entorno nuevas

```env
# Azure AI Content Safety (Prompt Shields) — opcional, usa heuristicas locales si no esta
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-content-safety.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your-content-safety-key
```

Las demas variables ya existian en `.env.example`. Las criticas para M4:

```env
# Requeridas para los agentes
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1

# Requeridas para Skills (Azure Function App)
SKILLS_FUNCTION_APP_URL=http://localhost:7071
SKILLS_FUNCTION_KEY=

# Requeridas para Agente 3
DAB_BASE_URL=http://localhost:5000
```
