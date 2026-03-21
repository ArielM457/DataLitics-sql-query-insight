# Documentation Context Skill - Guía Detallada

## ¿Qué es?

Esta es una skill personalizada de Claude que carga automáticamente el contenido completo de `Documentación.pdf` cuando necesitas información sobre la arquitectura, requisitos o detalles técnicos del proyecto.

## Instalación

La skill ya está creada en `.github/skills/documentation-context/`. Claude la detectará automáticamente.

## Cómo Funciona

1. **Detección Automática**: Cuando menciones "documentación" o hagas preguntas sobre la arquitectura del proyecto, Claude auto-cargará esta skill.

2. **Extracción de Contenido**: El script Python (`extract_documentation.py`) lee el PDF completo y extrae todo el texto.

3. **Contexto Enriquecido**: Con el contenido del PDF cargado, Claude puede responder preguntas basadas en información oficial del proyecto.

## Ejemplos de Uso

```
Usuario: "¿Qué dice la documentación sobre la arquitectura del sistema?"
→ Se carga automáticamente la skill y Claude responde desde el PDF

Usuario: "Según la documentación, ¿cómo funcionan los agentes?"
→ La skill se activa y proporciona información del PDF

Usuario: "Revisa la documentación para explicarme los flujos de datos"
→ Se carga el contenido del PDF para responder
```

## Estructura de Archivos

```
.github/skills/documentation-context/
├── SKILL.md                          # Metadatos y descripción de la skill
├── scripts/
│   └── extract_documentation.py      # Script que lee el PDF
└── references/
    └── README.md                     # Este archivo
```

## Límites y Consideraciones

- El PDF se extrae en texto plano, por lo que tablas complejas pueden requerir interpretación
- Imágenes y diagramas en el PDF no se extraen (solo texto)
- La primera ejecución instalará `pdfplumber` automáticamente de ser necesario

## Personalización

Si deseas modificar la skill:

1. Edita `SKILL.md` para cambiar la descripción o palabras clave
2. Edita `extract_documentation.py` para cambiar cómo se procesa el PDF
3. Claude detectará los cambios automáticamente

## Requisitos

- Python 3.7+
- pdfplumber (se instala automáticamente si no existe)

---

Creado para el proyecto DataLitics SQL Query Insight
