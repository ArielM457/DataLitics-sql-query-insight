---
name: documentation-context
description: 'Proporciona contexto completo del proyecto extrayendo información del archivo Documentación.pdf. Úsalo cuando el usuario mencione documentación, requiera entender la arquitectura general, o necesite información sobre los datos y API disponibles en la aplicación.'
argument-hint: 'Sin argumentos requeridos'
user-invocable: true
---

# Documentation Context Skill

## Descripción General

Esta skill carga el contenido completo del archivo `Documentación.pdf` para proporcionar contexto detallado sobre el proyecto SQL Insights. Se activa automáticamente cuando menciones palabras clave relacionadas con la documentación.

## Cuándo Usar

- Preguntas sobre la arquitectura del proyecto
- Requisitos funcionales o técnicos
- Información sobre componentes de la aplicación
- Explicaciones sobre flujos de datos
- Detalles de configuración o deployments
- Cualquier referencia a documentación del proyecto

## Procedimiento

1. Se ejecuta el [script de extracción de PDF](./scripts/extract_documentation.py)
2. El script lee `Documentación.pdf` y extrae todo el texto
3. El contenido se proporciona como contexto para responder tus preguntas
4. Todas las respuestas se basarán en la información del documento

## Uso

Simplemente menciona algo como:
- "¿Qué dice la documentación sobre...?"
- "Revisa la documentación para..."
- "Según la documentación..."
- O cualquier pregunta sobre la arquitectura del proyecto

El agente automáticamente cargará la documentación para responder.
