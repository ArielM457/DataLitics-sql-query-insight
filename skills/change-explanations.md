---
name: change-explanations
description: Explicaciones de cambios en código adaptadas a la preferencia del usuario (cortas vs detalladas)
applyTo: ["**/*"]
---

# Skill: Explicaciones Dinámicas de Cambios

Cuando hago cambios en el código, adapto mis explicaciones a tu preferencia. Esta skill define cómo comunico qué cambió y por qué.

## Pregunta Inicial

Antes de empezar grandes cambios, pregunto:

```
¿Cómo prefieres que explique los cambios?

A) 📝 Resumen ejecutivo (2-3 líneas máximo)
   "Refactoricé agent_intention.py para mejor legibilidad"

B) 📋 Explicación estándar (5-10 líneas + ejemplos)
   - Qué cambió
   - Por qué
   - Ejemplo antes/después

C) 📚 Documentación completa (15+ líneas + múltiples ejemplos)
   - Todos los detalles
   - Razones arquitectónicas
   - Impacto en otras partes
   - Benchmarks o comparativas

Responde: A, B o C
```

---

## Modo A: Resumen Ejecutivo (Brevísimo)

**Ideal para**: Cuando estás en flujo y solo necesitas saber qué cambió

**Formato**:
```
✅ [Archivo afectado]: [Cambio en 1 línea]
   └─ Razón: [1 razón breve]
```

**Ejemplos**:

```
✅ agent_intention.py: Refactoricé analyze() para mejor legibilidad
   └─ Razón: Nombres de variables más claros

✅ security/prompt_shields.py: Extraje validación a helper
   └─ Razón: DRY - evitar duplicación

✅ routers/query.py: Simplificé flujo de errores
   └─ Razón: Menos anidamiento
```

**Cuándo usarlo**:
- Cambios pequeños y muy focalizados
- Ya conoces el contexto
- Estás en zona de flujo
- Solo necesitas confirmación rápida

---

## Modo B: Explicación Estándar (Equilibrado)

**Ideal para**: Contexto normal, cambios moderados

**Formato**:
```
**Archivo**: [Ruta]

**Qué cambió**:
- Cambio 1: [Descripción]
- Cambio 2: [Descripción]

**Por qué**:
- Razón 1
- Razón 2

**Ejemplo**:
[Antes]
→
[Después]

**Beneficio**: [Qué mejora]
```

**Ejemplo real**:

```
**Archivo**: backend/app/agents/agent_intention.py

**Qué cambió**:
- Extraje lógica de parsing de periodo a método separado
- Mejoré nombres: question_text → raw_user_question
- Añadí documentación a cada campo del resultado

**Por qué**:
- El método analyze era muy largo (60 líneas → 35 líneas)
- Responsabilidad única: parsing en su propio método
- Más testeable

**Ejemplo**:
```

Antes:
```python
def analyze(self, question: str):
    # ... 20 líneas de lógica de parsing
    period_data = extract_period_from_text(question)
    # ... más lógica
```

Después:
```python
def analyze(self, raw_user_question: str):
    period_analysis = self._extract_time_period_from_user_question(raw_user_question)
    # ... más lógica limpia
    
def _extract_time_period_from_user_question(self, question: str) -> TimePeriodAnalysis:
    # todo el parsing de periodo aquí
```

Beneficio: Método principal es más claro, reutilizable, más fácil de testear.
```

**Cuándo usarlo**:
- Cambios modulares (refactoring, bugfix, pequeña feature)
- Es tu primera vez con este código
- Necesitas entender las razones
- Cambios que afectan flujo pero no arquitectura

---

## Modo C: Documentación Completa (Exhaustiva)

**Ideal para**: Cambios grandes, decisions de arquitectura, problemas complejos

**Formato**:
```
**Título del Cambio**

**Contexto**: [Por qué surgió la necesidad]

**Problema anterior**:
- Problema 1: [Descripción y cómo afectaba]
- Problema 2: [Descripción y cómo afectaba]

**Solución implementada**:
[Descripción completa de los cambios]

**Detalles técnicos**:
- Componente 1: [Cambios específicos]
- Componente 2: [Cambios específicos]
- Componente 3: [Cambios específicos]

**Ejemplos de código**:

Antes:
```[código anterior]```

Después:
```[código nuevo]```

**Por qué esta solución**:
- Ventaja 1 vs alternativa A
- Ventaja 2 vs alternativa B
- Trade-offs considerados

**Impacto**:
- Módulos afectados: [Lista]
- APIs que cambian: [Lista]
- Performance: [Comparativa]
- Compatibilidad hacia atrás: [Sí/No]

**Testing**:
- Cómo validar que funciona
- Test cases importantes

**Documentación actualizada**:
- Archivos docs que cambiar
- Comentarios que actualizar

**Referencias**:
- Issues relacionados
- Commits relevantes
```

**Ejemplo real**:

```
**Circuit Breaker para DAB API**

**Contexto**:
El Agente 3 (ExecutionAgent) llamaba DAB sin protección. Si DAB tenía problemas,
el backend se colgaba intentando requests infinitamente.

**Problema anterior**:
- Usuario hacía query → 10 segundos esperando → timeout
- Logs llenos de errores de DAB
- No había recuperación automática
- Un fallo en DAB afectaba a TODOS los usuarios

**Solución implementada**:
Agregué Circuit Breaker usando pybreaker. Después de 5 errores seguidos,
el circuit abre y rechaza requests rápidamente. Después de 60 segundos,
intenta recuperarse.

**Detalles técnicos**:

1. core/circuit_breaker.py:
   - CircuitBreaker con configuración fail_max=5, reset_timeout=60
   - Manejo de CircuitBreakerError

2. agents/agent_execution.py:
   - Importa dab_breaker de circuit_breaker
   - Wrappe call a DAB con dab_breaker.call()
   - Catch CircuitBreakerError y retorna error amistoso

3. routers/query.py:
   - Maneja CircuitBreakerError en el try/except existente

**Ejemplos de código**:

Antes:
```python
# agents/agent_execution.py
async def execute(self, sql: str, tenant_id: str):
    response = requests.post(
        f"{DAB_BASE_URL}/api/query",
        json={"sql": sql, "tenant": tenant_id}
    )
    return response.json()
```

Después:
```python
# agents/agent_execution.py
async def execute(self, sql: str, tenant_id: str):
    try:
        response = dab_breaker.call(
            requests.post,
            f"{DAB_BASE_URL}/api/query",
            json={"sql": sql, "tenant": tenant_id}
        )
        return response.json()
    except CircuitBreakerError:
        return {
            "error": "DAB service temporarily unavailable",
            "data": [],
            "rows": 0
        }
```

**Por qué esta solución**:
- vs "Retry simple": Circuit Breaker tiene inteligencia de recuperación
- vs "Timeout solo": No sobrecarga DAB cuando está caído
- vs "Manual state management": pybreaker maneja toda la lógica

Trade-off: Una nueva dependencia (pybreaker), pero es estándar en la industria.

**Impacto**:
- Módulos: agents/agent_execution.py, core/circuit_breaker.py, routers/query.py
- APIs externas: No cambian
- Performance: Mejora cuando DAB está caído (rechaza rápido vs espera timeout)
- Compatibilidad: Totalmente hacia atrás compatible

**Testing**:
```python
# Validar que circuit abre después de 5 errores
# Validar que se recupera después de 60 segundos
# Validar que error es amistoso para el usuario
```

**Documentación actualizada**:
- docs/architecture.md → sección de Agent 3 y Circuit Breaker
- README.md → warning sobre DAB en requirements previos

**Referencias**:
- Issue #15: Agent Execution
- pybreaker documentation
```

**Cuándo usarlo**:
- Cambios arquitectónicos grandes
- Introducción de nuevos patrones
- Refactoring masivo
- Decisiones que afectan todo el equipo
- Cuando preguntas "¿por qué hiciste eso así?"

---

## Cómo Indicar tu Preferencia

### Opción 1: Al inicio, una sola vez
```
Prefiero explicaciones en modo B (estándar)
```
Eso aplica para toda la sesión.

### Opción 2: Por cambio específico
```
Para este cambio usa modo C (completo), después vuelvo a modo B
```

### Opción 3: Por tipo de archivo
```
Frontend: modo A (rápido)
Backend architecture: modo C (completo)
Bugfixes: modo B (estándar)
```

---

## Mis Indicadores Visuales

Cuando explico cambios, uso estos prefijos para claridad:

```
📝 CAMBIO PEQUEÑO → Use Modo A por defecto
   ✅ Single file, < 10 líneas, bugfix

📋 CAMBIO MODERADO → Use Modo B por defecto
   ✅ 1-3 archivos, <100 líneas, refactoring/feature

📚 CAMBIO GRANDE → Use Modo C siempre
   ✅ >3 archivos, >100 líneas, arquitectura
```

---

## Flexibilidad

Si cambio de modo y necesitas diferente:

```
"Para este cambio, dame más detalles"
→ Lo expando de Modo A a Modo B o C

"Demasiado detalle, solo lo esencial"
→ Lo resumo de Modo C a Modo A

"Quiero ver el código pero no la arquitectura"
→ Modo B sin sección "Por qué esta solución"
```

No hay forma "correcta", tu preferencia es lo importante.

---

## Resumen de Modos

| Aspecto | Modo A | Modo B | Modo C |
|--------|--------|--------|--------|
| Duración | 1-2 líneas | 8-12 líneas | 20+ líneas |
| Código | No | Sí (antes/después) | Sí (detallado) |
| Razonamiento | Implícito | Explícito | Muy detallado |
| Para quién | Conocedores | Equipo general | Nuevos, críticos |
| Cuándo | Cambios pequeños | Cambios normales | Cambios grandes |

---

## Default Behavior

Si **no indicas preferencia**, asumo:

```
Modo B (Explicación Estándar)

= Equilibrio entre claridad y brevedad
= Buen punto de partida para nueva colaboración
```

Siempre puedes cambiar en cualquier momento.
