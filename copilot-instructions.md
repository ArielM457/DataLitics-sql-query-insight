---
name: DataAgent Development Guidelines
description: Instrucciones globales para Claude Code en el proyecto DataAgent
---

# DataAgent Development Guidelines

Este archivo configura el comportamiento de Claude Code para mantener consistencia en todo el proyecto DataAgent.

## 📋 Instrucciones Globales

### Siempre Sigue Estos Skills

El proyecto tiene 5 skills configurados en la carpeta `skills/`:

1. **code-style.md** — Código limpio, auto-documentado, sin comentarios inline
2. **concise-explanations.md** — Explicaciones claras por partes con ejemplos
3. **debugging-approach.md** — Diagnóstico sistemático de errores
4. **confirm-large-changes.md** — Confirmación en cambios arquitectónicos
5. **change-explanations.md** — Explicaciones adaptadas (Modo A/B/C)

Consulta `skills/README.md` para detalles completos.

### Estándares de Código

#### Python (Backend)

```python
# ✅ Nombres descriptivos
user_authentication_token: str
database_connection_pool: ConnectionPool

async def extract_user_intent_from_question(question: str) -> dict:
    """Sin comentarios inline - el código es auto-explicativo."""

# ✅ Type hints siempre
def validate_sql_against_schema(sql: str, schema: dict) -> dict:

# ✅ Método = una responsabilidad
class PromptShields:
    async def analyze(text: str, tenant_id: str) -> dict:
        "Solo analiza, no ejecuta ni transforma"

# ❌ Evitar
db = ConnectionPool()  # Demasiado genérico
def process(x):  # No sabemos qué procesa
c = "SELECT *"  # c no dice nada
```

#### TypeScript/React (Frontend)

```typescript
// ✅ Nombres claros
const userAuthenticationToken: string = getToken();
const chatMessageHistory: ChatMessage[] = [];
const isDataLoadingInProgress: boolean = false;

// ✅ Funciones con propósito claro
function formatChatMessageForDisplay(message: ChatMessage): string
function useUserAuthenticationStatus(): AuthStatus
function handleQuerySubmissionClick(): void

// ✅ Components bien tipados
interface ChatComponentProps {
  onMessageSend: (message: string) => Promise<void>;
  messageHistory: ChatMessage[];
}

// ❌ Evitar
const token = getToken();  // Muy corto
const data: any = response;  // any es evitar, usa tipos correctos
function handle()  // Qué maneja?
```

### Estructura del Proyecto

```
Proyecto-SQL-Insights/
├── backend/           # FastAPI, Agentes, Seguridad
├── frontend/          # Next.js, React, UI
├── dab/              # Data API Builder configs
├── infra/            # Kubernetes, Azure configs
├── docs/             # Arquitectura, guías
└── skills/           # 👈 Estos guidelines
```

### Workflow de Cambios

#### Cambios Pequeños (< 10 líneas, 1 archivo)
- No requieren confirmación
- Explico en Modo A (resumen 2-3 líneas)

#### Cambios Moderados (10-100 líneas, 2-3 archivos)
- Confirmo si afecta flujo existente
- Explico en Modo B (estándar 8-12 líneas)

#### Cambios Grandes (> 100 líneas, > 3 archivos, arquitectura)
- **SIEMPRE confirmo antes** con detalles
- Explico en Modo C (exhaustivo, 20+ líneas)

### Debugging Protocol

Cuando reportes un error, espera:

1. **Preguntas iniciales** para contexto:
   - ¿En qué módulo? (agent_intention, routers/query, frontend, etc.)
   - ¿Mensaje exacto del error?
   - ¿Pasos para reproducir?
   - ¿Cuándo empezó?
   - ¿Logs o stack traces?

2. **Diagnóstico sistemático**:
   - Validar dependencias
   - Revisar configuración (.env, imports)
   - Rastrear el flujo exacto
   - Identificar causa raíz

3. **Solución paso a paso**:
   - Propuesta específica
   - Cómo validar que funciona
   - Documentación del aprendizaje

### Confirmación de Cambios Grandes

Antes de refactoring masivo, cambios de arquitectura o updates de dependencias mayores:

```
⚠️  CAMBIO GRANDE: [Título]

**Qué voy a hacer**: [Específico]
**Por qué**: [Razones]
**Impacto**: [Módulos, breaking changes]
**Tiempo**: [Estimado]

¿Procedo? (Sí / No / Opción alternativa X)
```

### Comunicando Cambios

Tu preferencia por defecto es **Modo B** (Explicación Estándar):

```
Qué cambió:
- [Item 1]
- [Item 2]

Por qué:
- [Razón 1]
- [Razón 2]

Ejemplo:
[Antes]
→
[Después]
```

Pero puedes cambiar en cualquier momento:
- **Modo A**: "Resumen rápido"
- **Modo C**: "Quiero todos los detalles"

## 🚫 Lo Que NUNCA Haré

- [ ] ❌ Comentarios dentro del código (skill #1)
- [ ] ❌ Nombres genéricos (token, data, x, etc.)
- [ ] ❌ Métodos con múltiples responsabilidades
- [ ] ❌ Código duplicado (violar DRY)
- [ ] ❌ Cambios grandes sin confirmación (skill #4)
- [ ] ❌ Explicaciones largas sin estructura (skill #2)
- [ ] ❌ Debugging superficial sin diagnóstico (skill #3)
- [ ] ❌ Cambios sin explicación clara (skill #5)
- [ ] ❌ Credenciales o secrets en el código

## ✅ Lo Que SIEMPRE Hago

- [ ] ✅ Nombres descriptivos que expliquen propósito
- [ ] ✅ Type hints (Python 3.12, TypeScript)
- [ ] ✅ Docstrings/JSDoc en funciones públicas
- [ ] ✅ Métodos único objetivo, máximo 40 líneas
- [ ] ✅ Código limpio, sin comentarios inline
- [ ] ✅ Pedir confirmación en cambios arquitectónicos
- [ ] ✅ Explicaciones estructuradas por partes
- [ ] ✅ Debugging sistemático y paso a paso
- [ ] ✅ Validación antes de dar solución final

## 🎯 Si Necesitas Cambiar Algo

Cualquiera de estos standards puede adaptarse:

```
"Necesito más/menos detalles en explicaciones"
→ Cambio modo de explicación

"El paso X del debugging es excesivo"
→ Streamlineamos el protocolo

"Necesito comentarios en este código específico"
→ Añadimos comentarios donde sea necesario

"Este proyecto usa [convención diferente]"
→ Adaptamos los guidelines
```

**Los skills son herramientas para ti, no límites rígidos.**

## 📚 Stack Técnico (Para Referencia)

- **Backend**: Python 3.12, FastAPI, Azure OpenAI, LangGraph, Semantic Kernel
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data**: Data API Builder, Azure Search, Firebase Auth
- **Deployment**: Docker, Azure Container Apps

## 🔗 Referencias

- `skills/code-style.md` — Cómo escribir código
- `skills/concise-explanations.md` — Cómo explicar
- `skills/debugging-approach.md` — Cómo debuggear
- `skills/confirm-large-changes.md` — Cuándo pedir confirmación
- `skills/change-explanations.md` — Cómo reportar cambios
- `skills/README.md` — Overview de todos los skills

---

**Estos guidelines aseguran que trabajemos de forma consistente, clara y eficiente.**

¿Preguntas o cambios en los guidelines?
