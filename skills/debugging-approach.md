---
name: debugging-approach
description: Metodología estructurada para diagnosticar y resolver errores sistemáticamente
applyTo: ["**/*"]
---

# Skill: Enfoque Sistemático para Debugging

Cuando encuentres un error o bug, sigue este proceso para diagnosticar y resolver de manera eficiente.

## Paso 1: Recopilar Información Detallada

Cuando el usuario reporte un error, **siempre pregunta primero**:

```
1. ¿En qué módulo ocurre el error?
   (Ejemplo: En el agent_intention.py, en el router /query, en el frontend)

2. ¿Cuál es el mensaje de error exacto o descripción?
   (Copia-pega completo, no resumen)

3. ¿Qué acción desencadenó el error?
   (Pasos específicos para reproducir)

4. ¿Cuándo empezó a ocurrir?
   (¿Siempre? ¿Después de un cambio? ¿Con datos específicos?)

5. ¿Hay logs, stack traces o capturas?
   (Paste cualquier información relevante)

6. ¿Qué ambiente?
   (Desarrollo, testing, producción)
```

## Paso 2: Clasificar el Error

Una vez tengas la información, clasifica:

| Categoría | Ejemplo | Síntomas |
|-----------|---------|----------|
| **Importación** | ModuleNotFoundError | `No module named 'X'` |
| **Tipo de dato** | TypeError | `Cannot read property of undefined` |
| **Configuración** | Missing env var | `KeyError: 'AZURE_OPENAI_KEY'` |
| **Lógica** | Query inválida | Resultado incorrecto |
| **Red/API** | Conexión DAB | `Connection timeout` |
| **Autorización** | Token inválido | `401 Unauthorized` |
| **SyntaxError** | Typo en código | `SyntaxError: invalid syntax` |

## Paso 3: Diagnóstico Estructurado

### A. Validar Dependencias
```python
# Pregunta: ¿Están instaladas las dependencias?
pip list | grep <nombre-package>

# ¿Está el entorno virtual activado?
python --version
```

### B. Revisar Configuración
```python
# ¿Están las variables de entorno cargadas?
import os
print(os.getenv('AZURE_OPENAI_ENDPOINT'))

# ¿Son accesibles los secretos/credenciales?
```

### C. Revisar Logs
```
1. Frontend:
   - Consola del navegador (F12 → Console)
   - Network tab para ver exactamente qué se envía/recibe

2. Backend:
   - Terminal donde corre uvicorn
   - Archivo de logs si existe
   
3. Externo:
   - Logs de Azure
   - Logs de Firebase
   - Logs de DAB
```

### D. Rastrear el Flujo
Identifica en qué punto exacto falla:

**Si es error de API:**
```
1. ¿La request se envía correctamente?
   → Revisar Network tab (payload)

2. ¿Llega al backend?
   → Revisar logs del backend

3. ¿Qué router maneja la request?
   → Revisar que método se llama

4. ¿Qué agente/función se ejecuta?
   → Rastrear hasta el punto exacto
   
5. ¿Qué retorna?
   → Ver respuesta de error
```

## Paso 4: Identificar Causa Raíz

Busca una de estas causas comunes:

```
❌ Versionado
   - ¿Versión correcta de dependencia?
   - ¿Versión de Python compatible?

❌ Configuración
   - ¿Variable de entorno faltante?
   - ¿Ruta absoluta vs relativa incorrecta?

❌ Permisos
   - ¿Token válido?
   - ¿Usuario tiene acceso?
   - ¿Rol tiene permisor?

❌ Datos
   - ¿Formato correcto?
   - ¿Campo obligatorio presente?
   - ¿Tipo de dato correcto?

❌ Lógica
   - ¿Condición incorrecta?
   - ¿Orden de ejecución?
   - ¿Async/await correcto?

❌ Red
   - ¿Servicio externo disponible?
   - ¿Timeout insuficiente?
   - ¿CORS configurado?

❌ Caché
   - ¿Datos obsoletos?
   - ¿Cache del navegador?
   - ¿Build incompleto?
```

## Paso 5: Reproducir el Error

**Crítico**: Debes poder reproducir el error para validar la solución.

```
1. Pasos reproducibles exactos
2. Dataset/entrada que causa el error
3. Entorno donde ocurre
4. Comportamiento esperado vs actual
```

## Paso 6: Proponer Solución

Una vez diagnosticado, propongo solución con:

```
**Causa raíz**: [Qué pasó y por qué]

**Solución**:
- Paso 1: [Cambio específico]
- Paso 2: [Cambio específico]
- Paso 3: [Cómo validar]

**Validación**:
- Test que confirme la solución
- Logs que demuestren el fix
```

## Paso 7: Validar y Documentar

```
✓ ¿El error está resuelto?
✓ ¿Se puede reproducir exitosamente el paso que fallaba?
✓ ¿Hay errores secundarios o nuevos?
✓ ¿Documentar en qué se falló para evitar repetir?
```

---

## Preguntas que Siempre Hago

Cuando presentes un bug, espera que pregunte:

1. "¿Puedes reproducir el error consistentemente?"
2. "¿Qué commit/cambio lo causó?"
3. "¿Qué logs ves exactamente?"
4. "¿Funciona en otro entorno?"
5. "¿Cuál es el comportamiento esperado?"

---

## Errores Comunes y Cómo Evitarlos

| Error | Síntoma | Prevención |
|-------|---------|-----------|
| `ModuleNotFoundError` | `from X import Y` no funciona | Verificar `__init__.py` tiene imports |
| `KeyError: 'AZURE...'` | Config.py no carga | Crear `.env` desde `.env.example` |
| `401 Unauthorized` | Firebase token inválido | Verificar token no expirado, formato correcto |
| `CircuitBreakerOpen` | DAB no responde | Verificar DAB está levantado |
| `CORS Error` | Request bloqueada | Verificar CORS middleware en FastAPI |
| `Port already in use` | No puedo levantar servidor | `lsof -i :8000` y matar proceso |

---

## Flujo Visual

```
Usar reporta error
    ↓
[Recopilo información]
    ↓
[Clasifico tipo de error]
    ↓
[Reviso logs y validaciones]
    ↓
[Rastreo el flujo exacto]
    ↓
[Identifico causa raíz]
    ↓
[Reproduzco el error]
    ↓
[Propongo solución]
    ↓
[Valido y documento]
```
