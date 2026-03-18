---
name: code-style
description: Guía para escribir código limpio siguiendo buenas prácticas sin comentarios inline
applyTo: ["**/*.py", "**/*.ts", "**/*.tsx", "**/*.js"]
---

# Skill: Código Limpio y Auto-Documentado

Cuando escribas código para este proyecto, sigue estas prácticas:

## Principios Fundamentales

1. **Sin comentarios inline**: El código debe ser tan claro que no necesite comentarios dentro del cuerpo
2. **Nombres descriptivos**: Las variables, funciones y métodos deben explicar su propósito por sí solos
3. **Responsabilidad única**: Cada función/método debe tener UNA única razón para cambiar
4. **DRY (Don't Repeat Yourself)**: Evita duplicación de lógica

## Reglas Específicas

### Para Python

- Nombres de variables: `snake_case` descriptivo
  ```python
  # ✅ Bien
  database_connection_pool = ConnectionPool()
  user_authentication_token = obtain_token()
  
  # ❌ Evitar
  db = ConnectionPool()
  token = obtain_token()
  ```

- Nombres de funciones: `snake_case` que describa qué hace
  ```python
  # ✅ Bien
  async def extract_user_intent_from_question(question: str) -> dict:
  
  # ❌ Evitar
  async def process(q: str) -> dict:
  ```

- Nombres de clases: `PascalCase`
  ```python
  # ✅ Bien
  class DatabaseConnectionManager:
  class PromptSecurityValidator:
  
  # ❌ Evitar
  class DBConn:
  class PSV:
  ```

### Para TypeScript/React

- Nombres de variables: `camelCase` descriptivo
  ```typescript
  // ✅ Bien
  const userAuthenticationToken = getToken();
  const chatMessageHistory = [];
  const isDataLoadingInProgress = false;
  
  // ❌ Evitar
  const token = getToken();
  const msgs = [];
  const loading = false;
  ```

- Nombres de funciones/hooks: acciones claras
  ```typescript
  // ✅ Bien
  function formatChatMessageForDisplay(message: ChatMessage): string
  function useUserAuthenticationStatus()
  function handleQuerySubmissionClick()
  
  // ❌ Evitar
  function format(m)
  function useAuth()
  function onClick()
  ```

## Documentación a través del Código

En lugar de comentarios, usa:

### Docstrings (Python)
```python
async def generate_sql_query_from_intention(
    intention: IntentionAnalysis,
    tenant_schema: TenantDatabaseSchema
) -> SQLGenerationResult:
    """Convert analyzed user intention into executable SQL query.
    
    Args:
        intention: Result from intention analysis containing tables, metrics, filters
        tenant_schema: Schema definition with column types and relationships
        
    Returns:
        SQLGenerationResult with generated SQL, risk assessment, and execution plan
    """
```

### JSDoc (TypeScript)
```typescript
/**
 * Validates incoming user questions against security policies
 * 
 * @param question - Raw user input text
 * @param tenantId - Tenant identifier for role-based filtering
 * @returns Object with validation status and any security concerns
 */
function validateUserQuestionAgainstSecurityPolicies(
    question: string,
    tenantId: string
): SecurityValidationResult
```

## Estructura de Funciones

### Longitud
- Una función debe caber en una pantalla (máximo 40 líneas)
- Si es más larga, divídela en funciones más pequeñas

### Parámetros
- Máximo 3 parámetros normales
- Si necesitas más, usa un objeto/clase de configuración

```python
# ✅ Bien
async def execute_query(
    query_execution_request: QueryExecutionRequest
) -> QueryExecutionResult:

# ❌ Evitar
async def execute_query(
    sql: str, 
    tenant_id: str, 
    user_role: str, 
    timeout: int, 
    retry_count: int,
    log_level: str
) -> dict:
```

## Variables

- Nombres que indiquen tipo y propósito:
  ```python
  # ✅ Bien
  is_query_blocked: bool = False
  maximum_timeout_seconds: int = 30
  user_restricted_column_list: list[str] = []
  
  # ❌ Evitar
  blocked = False
  timeout = 30
  columns = []
  ```

## Manejo de Errores

Sé explícito con excepciones:
```python
# ✅ Bien
if not authentication_token:
    raise InvalidAuthenticationTokenException(
        "Firebase authentication token is missing or invalid"
    )

# ❌ Evitar
if not token:
    raise Exception("Bad token")
```

## Cuándo está "Listo" el Código

Tu código está listo cuando:
- Alguien nuevo lo puede leer sin comentarios y entiende qué hace
- Cada variable y función tienen nombres que explican su propósito
- Cada método hace una sola cosa bien
- No hay código repetido
- Los tipos están claros (type hints en Python, tipos en TS)
