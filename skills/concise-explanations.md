---
name: concise-explanations
description: Guía para hacer explicaciones claras, estructuradas y no extensas con ejemplos
applyTo: ["**/*"]
---

# Skill: Explicaciones Concisas y Estructuradas

Cuando expliques conceptos, cambios de código o decisiones técnicas, sigue esta estructura.

## Formato General

### 1. Resumen de 1-2 líneas
Explicación rápida del tema en pocas palabras.

### 2. Explicación por partes (máximo 3-4 secciones)
Divide la idea en componentes simples.

### 3. Ejemplo práctico
Código o caso de uso que ilustre el concepto.

### 4. Por qué importa (1 línea)
Contexto o beneficio.

---

## Estructura Detallada

### Para Conceptos Técnicos

```
**Resumen**: [1-2 líneas máximo]

**Cómo funciona**:
- Parte 1: [Explicación corta]
- Parte 2: [Explicación corta]
- Parte 3: [Explicación corta]

**Ejemplo**:
[Código o diagrama simple]

**Beneficio**: [Por qué usar esto]
```

**Ejemplo de aplicación:**

**Resumen**: El Circuit Breaker previene que el servidor DAB se sature repitiendo requests infinitamente.

**Cómo funciona**:
- **Estado Closed**: Las requests pasan normalmente
- **Estado Open**: Si hay demasiados errores, bloquea nuevos intentos
- **Estado Half-Open**: Después de un tiempo, intenta recuperarse

**Ejemplo**:
```python
# Sin Circuit Breaker: 1000 requests se cuelgan esperando respuesta
# Con Circuit Breaker: Después de 5 errores, rechaza inmediatamente

dab_breaker = CircuitBreaker(fail_max=5, reset_timeout=60)

try:
    response = dab_breaker.call(execute_query, sql)
except CircuitBreakerError:
    return {"error": "DAB service unavailable, retrying later"}
```

**Beneficio**: Evita cascadas de fallos y mejora la experiencia del usuario.

---

### Para Cambios de Código

```
**Qué cambió**: [1 línea]

**Por qué**:
- Razón 1
- Razón 2

**Ejemplo de antes/después**:
[Código anterior]
→
[Código nuevo]

**Impacto**: [Qué mejora]
```

---

### Para Decisiones de Arquitectura

```
**Decisión**: [Qué se decide]

**Alternativas consideradas**:
- Opción A: [ventaja/desventaja]
- Opción B: [ventaja/desventaja]

**Elegimos**: [Opción X porque...]

**Trade-off**: [Qué ganamos vs qué perdemos]
```

---

## Longitud Recomendada

| Tipo | Líneas |
|------|--------|
| Explicación técnica rápida | 5-10 |
| Concepto moderado | 10-15 |
| Cambio de código | 8-12 |
| Decisión arquitectónica | 12-18 |

## Reglas de Oro

1. **Una idea principal por explicación**
2. **Máximo 3 puntos o sub-ideas**
3. **Siempre incluye un ejemplo**
4. **Evita jerga innecesaria** - usa términos simples
5. **Si tomas más de 20 líneas, divide en temas separados**

## Cuándo Debes Ser Más Breve

- Usuario pregunta rápidamente sobre un concepto
- Explicación de una línea de código
- Confirmando un cambio pequeño
- Respondiendo a preguntas de seguimiento

## Cuándo Puedes Extender (un poco)

- Explicando un flujo completo del agente
- Primer conocimiento de una característica
- Decisión crítica que afecta múltiples módulos
- Cuando el usuario pide "explicación detallada"

---

## Estructura Visual

Usa formato Markdown para separar ideas:

```
**Punto 1**: Explicación
✓ Beneficio

**Punto 2**: Explicación  
✓ Beneficio

→ Conclusión
```

Esto hace más legible y escaneable la información.
