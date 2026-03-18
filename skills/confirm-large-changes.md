---
name: confirm-large-changes
description: Pedir confirmación explícita antes de realizar cambios significativos en la aplicación
applyTo: ["**/*"]
---

# Skill: Confirmación para Cambios Grandes

Cuando planee hacer cambios que afecten la arquitectura, flujos o estructura del proyecto, **siempre pido confirmación explícita** antes de proceder.

## Qué se Considera "Cambio Grande"

### 🔴 SIEMPRE Confirmación Requerida

1. **Cambios de Arquitectura**
   - Refactorizar estructura de carpetas
   - Cambiar patrón de diseño (ej: de MVC a CQRS)
   - Introducir nuevas dependencias pesadas
   - Cambiar cómo los agentes interactúan

2. **Cambios de Flujo**
   - Modificar orden de ejecución de agentes
   - Cambiar endpoints principales (/query, /onboarding, /audit)
   - Cambiar forma de autenticación/autorización
   - Modificar seguridad (prompt shields, context filter)

3. **Cambios de Base de Datos/Datos**
   - Migración de datos
   - Cambio de esquema
   - Nuevas tablas/índices críticos
   - Cambio en formato de almacenamiento

4. **Cambios Globales**
   - Actualización de versión mayor de dependencias (3.11→3.12)
   - Cambiar frontend framework
   - Cambiar lenguaje de backend
   - Remplazar servicio externo (Azure OpenAI → OpenAI)

5. **Cambios de Seguridad**
   - Modificar políticas de acceso
   - Cambiar role-based access control
   - Modificar validación de permisos
   - Cambiar estrategia de encriptación

6. **Cambios Que Afectan Equipos**
   - Cambios que rompen APIs existentes
   - Renombramientos masivos
   - Cambios en convenciones de código
   - Cambios en variables de entorno requeridas

---

## Qué NO Requiere Confirmación

✅ Cambios pequeños y localizados:
- Bugfix en una función específica
- Refactorizar una sola clase
- Añadir test unitario
- Cambios de estilo/formato menores
- Actualización de documentación

✅ Siguiendo plan existente:
- Implementar feature ya especificado en Issue
- Llenar estructura ya creada
- Cambios en TODO items identificados

---

## Cuándo Pido Confirmación

### Formato de Confirmación

```
⚠️ **CAMBIO GRANDE DETECTADO**

**Qué voy a hacer:**
- Cambio 1: [Descripción]
- Cambio 2: [Descripción]

**Por qué:**
- Razón 1
- Razón 2

**Impacto:**
- Módulos afectados: [Cuáles]
- APIs que cambian: [Cuáles]
- Breaking changes: [Si/No]
- Tiempo estimado: [Cuánto]

**Alternativas consideradas:**
- Opción A: [Ventajas/Desventajas]
- Opción B: [Ventajas/Desventajas]

**¿Procedo con la opción recomendada?** Responde:
□ Sí, adelante
□ No, usar alternativa X
□ Espera, quiero cambios
```

---

## Información que Debo Incluir

Siempre en la confirmación:

1. **Qué exactamente cambia** (ser específico)
2. **Cuál es el ámbito** (1 archivo vs 10 archivos)
3. **Dependencias/impacto en otros módulos**
4. **Si es breaking change** (requiere actualización en otro código)
5. **Tiempo estimado** (rápido vs moderado vs largo)
6. **Opción recomendada** (y por qué)

---

## Ejemplos Reales

### Ejemplo 1: Cambio de Arquitectura
```
⚠️ CAMBIO GRANDE: Refactorizar CircuitBreaker

**Qué voy a hacer:**
- Mover CircuitBreaker de core/circuit_breaker.py a infrastructure/
- Crear wrapper para manejar diferentes tipos de errores
- Actualizar imports en agent_execution.py

**Por qué:**
- Mejor organización (infrastructure vs core)
- Reutilizable en otros servicios

**Impacto:**
- Archivos afectados: 2 (circuit_breaker.py y agent_execution.py)
- APIs: 0 rompen
- Breaking changes: No
- Tiempo: 5 minutos

**¿Procedo?**
```

### Ejemplo 2: Cambio de Dependencia
```
⚠️ CAMBIO GRANDE: Actualizar FastAPI 0.115 → 1.0

**Qué voy a hacer:**
- Actualizar requirements.txt
- Revisar breaking changes en documentación
- Probar que endpoints sigan funcionando

**Por qué:**
- Versión 1.0 tiene mejores performances
- Seguridad mejorada

**Impacto:**
- Archivos afectados: requirements.txt
- APIs: Todas podrían verse afectadas
- Breaking changes: Revisaré la documentación
- Tiempo: 20 minutos

**Alternativa:**
- Mantener 0.115.0 (más estable, menos features)

**¿Procedo?**
```

### Ejemplo 3: Cambio de Flujo
```
⚠️ CAMBIO GRANDE: Cambiar orden de validaciones

**Qué voy a hacer:**
- Mover PromptShields ANTES de IntentionAgent
- Cambiar orden en routers/query.py del flujo actual

**Por qué:**
- Detiene ataques antes (más eficiente)
- Ahorra procesamiento

**Impacto:**
- Módulos: routers/query.py, security/prompt_shields.py
- APIs: GET/POST /query cambia internamente (no externamente)
- Breaking changes: No en API externa
- Tiempo: 10 minutos

**¿Procedo?**
```

---

## Mis Decisiones

Cuando presentes un cambio grande:

1. **Pregunto primero** - No hago nada radical sin tu confirmación
2. **Soy específico** - Digo exactamente qué va a cambiar
3. **Doy opciones** - No es solo sí o no, sino cuál opción prefieres
4. **Paso a paso** - Si confirmas, ejecuto cuidadosamente
5. **Valido después** - Verifico que lo que proposé funcione

---

## Tipos de Respuesta que Espero

```
✅ "Sí, adelante"
   → Procedo inmediatamente

✅ "Usa la alternativa B"
   → Cambio el plan y procedo

✅ "Espera, quiero cambiar X"
   → Reformulo y vuelvo a preguntar

❌ Ignorar la confirmación
   → No debería hacerlo, pero si lo haces, lo revierto

❌ "Haz lo que creas mejor"
   → Pido ser más específico para tu tranquilidad
```

---

## Protecciones Integradas

Para cambios grandes, siempre:

1. **Hago backup mental** del estado anterior
2. **Agrego comentarios de cambio** si hace falta
3. **Corro tests** después para validar
4. **Actualizo documentación** afectada
5. **Confirmo que nada se rompió**

---

## Comunicación Clara

Antes de cambios grandes, esperarás:

```
1️⃣ **PROPUESTA**: qué voy a hacer exactamente
2️⃣ **JUSTIFICACIÓN**: por qué es mejor así
3️⃣ **IMPACTO**: qué se ve afectado
4️⃣ **TIEMPO**: cuánto tardará
5️⃣ **CONFIRMACIÓN**: ¿Voy adelante?
```

Nunca salto directo a implementation sin estos 5 pasos en cambios grandes.
