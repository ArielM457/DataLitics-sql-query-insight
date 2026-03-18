---
name: DataAgent Development Skills
description: Conjunto integral de skills para guiar el desarrollo de DataAgent
applyTo: ["**/*"]
---

# 🎯 DataAgent Development Skills

Este documento describe los 5 skills principales que guían el desarrollo de DataAgent. Cada skill define cómo trabajamos en aspectos específicos del proyecto.

## 📚 Skills Disponibles

### 1. **Code Style** (`code-style.md`)
**Cuándo se aplica**: Siempre que escribas código

Guía para escribir código limpio y auto-documentado:
- ✅ Sin comentarios inline — el código explica lo que hace
- ✅ Nombres descriptivos — variables, funciones y clases auto-explicativas
- ✅ Responsabilidad única — cada función hace UNA cosa bien
- ✅ DRY — nada de código duplicado

**Ejemplo**: `user_authentication_token` en lugar de `token`

---

### 2. **Concise Explanations** (`concise-explanations.md`)
**Cuándo se aplica**: Cuando explico conceptos, decisiones o cambios

Explicaciones estructuradas y no extensas:
- Resumen en 1-2 líneas
- Máximo 3 partes por explicación
- Siempre incluir un ejemplo
- Link a por qué importa

**Formato**:
```
[Resumen] → [3 puntos máximo] → [Código] → [Beneficio]
```

---

### 3. **Debugging Approach** (`debugging-approach.md`)
**Cuándo se aplica**: Cuando reportas un bug o hay un error

Metodología sistemática para diagnosticar problemas:

1. **Recopilar información** (preguntar primero)
2. **Clasificar el error** (tipo de fallo)
3. **Diagnóstico estructurado** (validar, revisar logs, rastrear)
4. **Identificar causa raíz** (lista de causas comunes)
5. **Reproducir el error** (paso a paso)
6. **Proponer solución** (con validación)
7. **Validar y documentar**

**Pregunta que siempre haré**: ¿Puedes reproducir el error? ¿Qué logs ves?

---

### 4. **Confirm Large Changes** (`confirm-large-changes.md`)
**Cuándo se aplica**: Antes de cambios arquitectónicos, de flujo o globales

Pido confirmación explícita para cambios grandes:

🔴 SIEMPRE confirmación requerida:
- Cambios de arquitectura
- Cambios de flujo de agentes
- Cambios de seguridad
- Cambios que rompen APIs
- Actualización de dependencias mayores

✅ NO requiere confirmación:
- Bugfixes localizados
- Refactoring de una sola clase
- Siguiendo plan existente
- Cambios de estilo menores

**Formato de confirmación**:
```
⚠️ CAMBIO GRANDE: [Título]

**Qué voy a hacer**: [Específico]
**Por qué**: [Razones]
**Impacto**: [Módulos afectados, breaking changes]
**Tiempo**: [Estimado]
**¿Procedo?**: [Opciones]
```

---

### 5. **Change Explanations** (`change-explanations.md`)
**Cuándo se aplica**: Cuando reporto qué cambié y por qué

Tres modos de explicación según tu preferencia:

| Modo | Duración | Uso |
|------|----------|-----|
| **A - Resumen** | 2-3 líneas | Cambios pequeños, flujo rápido |
| **B - Estándar** | 8-12 líneas + código | Cambios normales, punto equilibrio |
| **C - Completo** | 20+ líneas + detalles | Cambios grandes, arquitectura crítica |

**Pregunta inicial**: ¿Cómo prefieres que explique cambios? A, B o C.

Default: **Modo B** (estándar)

---

## 🎯 Flujo Típico de Desarrollo

```
1. Tú: "Necesito [feature/fix]"
   ↓
2. Yo: Evalúo si es cambio grande
   ├─ Si es grande → Pido confirmación (Skill #4)
   └─ Si es pequeño → Procedo

3. Yo: Escribo código
   └─ Sigo Skill #1 (código limpio, autodocumentado)

4. Yo: Explico qué cambié
   └─ Sigo tu preferencia de Skill #5 (A/B/C)

5. Si hay bug:
   └─ Sigo Skill #3 (debugging sistemático)
   
6. Cuando explico conceptos:
   └─ Sigo Skill #2 (conciso, estructurado)
```

---

## 🚀 Cómo Usar Estos Skills

### Al Inicio de la Sesión
Puedes indicar tus preferencias:

```
Prefiero:
- Explicaciones en modo C (quiero entender todo)
- Confirmación en cambios >5 archivos (no tan conservador)
- Sin detalles arquitectónicos, solo código
```

O puedo usar defaults:
- Code Style: Siempre aplicado
- Concise Explanations: Siempre aplicado
- Debugging: Siempre cuando hay error
- Confirm: Solo cambios realmente grandes
- Change Explanations: Modo B (estándar)

### Durante la Sesión
Puedes cambiar en cualquier momento:

```
"Para este cambio dame más detalles" → Cambio a Modo C
"Este bugfix tiene prisa, resumen rápido" → Cambio a Modo A
"Creo que este cambio podría romper algo" → Activo confirmación
```

### Específico por Archivo
```
Frontend: Modo A rápido
Backend agents: Modo C detallado
Tests: No necesitas explicación
```

---

## ✅ Quality Gate

Antes de dar código o explicación, verifico:

- [ ] **Code**: ¿Sigue code-style? ¿Sin comentarios? ¿Nombres claros?
- [ ] **Explanation**: ¿Es clara y concisa? ¿Tiene ejemplo? ¿Está estructurada?
- [ ] **Change**: ¿Es grande? ¿Necesita confirmación? ¿Expliqué bien?
- [ ] **Error**: ¿Pedí suficiente contexto? ¿Diagnostiqué bien?

---

## 📖 Referencias Cruzadas

| Si necesitas | Usa |
|--------------|-----|
| Escribir función limpia | Skill #1: Code Style |
| Entender un concepto | Skill #2: Concise Explanations |
| Reportar un bug | Skill #3: Debugging Approach |
| Cambio importante | Skill #4: Confirm Large Changes |
| Saber qué cambié | Skill #5: Change Explanations |
| Mejorar algún skill | Lee el archivo `.md` específico |

---

## 💡 Filosofía

Estos skills se basan en:

1. **Código autodocumentado** — El código es la mejor documentación
2. **Comunicación clara y concisa** — Respeto tu tiempo
3. **Debugging sistemático** — Los problemas tienen soluciones metódicas
4. **Cambios consensuados** — Grandes decisiones juntos
5. **Flexibilidad** — Adapto a tu preferencia

---

## 🔧 Si Algo No Funciona

Si algún skill no se ajusta a cómo trabajas:

```
"No me gusta que pidas confirmación tan a menudo"
→ Cambio el threshold de Skill #4

"Necesito más contexto en las explicaciones"
→ Cambio default a Modo C en Skill #5

"El debugging toma mucho tiempo"
→ Podemos streamlinar las preguntas
```

**Los skills son herramientas para ti, no límites.**

---

## 📋 Checklist de Configuración

Recomendado establecer al inicio:

- [ ] ¿Cuál es tu preferencia de explicaciones? (A/B/C o mixed)
- [ ] ¿Qué tan conservador con confirmaciones? (todo/grande/crítico)
- [ ] ¿Algún estilo de código adicional que debo seguir?
- [ ] ¿Hay archivos o módulos que requieran atención especial?
- [ ] ¿Cuál es tu ritmo de trabajo? (rápido/reflexivo/mixed)

---

**Última actualización**: Marzo 2025  
**Skills versión**: 1.0  
**Proyecto**: DataAgent v3
