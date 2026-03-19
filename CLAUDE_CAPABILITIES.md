# Capacidades de Claude Code en este Proyecto

Este archivo describe qué puede hacer Claude Code dentro del directorio `DataLitics-sql-query-insight`.

---

## Herramientas de Archivo y Código

| Capacidad | Descripción |
|-----------|-------------|
| **Leer archivos** | Lee cualquier archivo del proyecto: `.py`, `.ts`, `.tsx`, `.json`, `.yml`, `.md`, `.env.example`, etc. |
| **Editar archivos** | Modifica código existente con precisión quirúrgica (reemplazos exactos) |
| **Crear archivos** | Crea nuevos archivos cuando es estrictamente necesario |
| **Buscar por nombre** | Encuentra archivos usando patrones glob (`**/*.py`, `src/**/*.tsx`) |
| **Buscar en contenido** | Busca texto o regex dentro del código fuente usando ripgrep |

---

## Herramientas de Terminal

| Capacidad | Descripción |
|-----------|-------------|
| **Ejecutar comandos bash** | Corre comandos de shell: `pip install`, `npm run`, `docker build`, `git`, `uvicorn`, etc. |
| **Tareas en background** | Ejecuta comandos largos en segundo plano y notifica al terminar |
| **Git** | `git status`, `git diff`, `git log`, commits, branches, PRs via `gh` |

---

## Capacidades de Investigacion

| Capacidad | Descripción |
|-----------|-------------|
| **Busqueda web** | Busca documentacion actualizada, paquetes, errores, etc. |
| **Fetch de URLs** | Descarga y lee paginas web o documentacion externa |
| **Subagentes exploradores** | Lanza agentes especializados para explorar el codebase profundamente sin consumir el contexto principal |

---

## Capacidades Especificas para DataAgent

Dado el stack del proyecto, Claude puede ayudar con:

### Backend (Python / FastAPI)
- Implementar y depurar los 4 agentes IA: `intention_agent`, `sql_agent`, `execution_agent`, `insights_agent`
- Configurar integraciones con **Azure OpenAI**, **Azure AI Search**, **Azure AI Content Safety**
- Desarrollar middleware de seguridad: Prompt Shields, Context Filter, Risk Analyzer
- Escribir tests con **pytest**
- Gestionar dependencias en `requirements.txt`

### Frontend (Next.js 15 / React / TypeScript)
- Construir componentes: Chat, Dashboard, Audit, Onboarding
- Integrar **Firebase Auth** en el cliente
- Conectar con la API del backend
- Configurar **Tailwind CSS** y estilos

### Data API Builder (DAB)
- Configurar archivos JSON para tenants (`empresa_a`, `empresa_b`)
- Mapear entidades de SQL Server a endpoints REST/GraphQL

### Infraestructura
- Editar `Dockerfile` y `.yml` de **Azure Container Apps**
- Configurar pipelines de **GitHub Actions** / **GitLab CI**
- Gestionar variables de entorno (`.env`, secrets)

---

## Skills Configurados en este Proyecto

Claude sigue los 5 skills definidos en `skills/`:

| Skill | Comportamiento |
|-------|----------------|
| `code-style.md` | Codigo limpio, nombres descriptivos, sin comentarios inline |
| `concise-explanations.md` | Explicaciones estructuradas en Modo A / B / C |
| `debugging-approach.md` | Diagnostico sistematico: contexto → causa raiz → solucion |
| `confirm-large-changes.md` | Pide confirmacion antes de cambios arquitectonicos |
| `change-explanations.md` | Reporta cambios con: que cambio, por que, ejemplo |

---

## Memoria Persistente

Claude mantiene un sistema de memoria en:
```
C:\Users\ariel\.claude\projects\...\memory\
```

Guarda entre sesiones:
- Perfil del usuario y preferencias
- Feedback y correcciones de comportamiento
- Contexto del proyecto (decisiones, deadlines, motivaciones)
- Referencias a sistemas externos

---

## Herramientas MCP (Model Context Protocol)

Claude tiene acceso a **Canva** via MCP, lo que permite:
- Crear, editar y exportar designs
- Buscar y gestionar carpetas de assets
- Generar diseños a partir de prompts
- Comentar y colaborar en diseños

---

## Herramientas de Planificacion y Tareas

| Herramienta | Uso |
|-------------|-----|
| **Plan Mode** | Disenar arquitectura y estrategia antes de implementar |
| **Task Manager** | Dividir tareas complejas en pasos, rastrear progreso |
| **Cron Jobs** | Programar comandos recurrentes durante la sesion |
| **Worktrees** | Trabajar en ramas git aisladas sin afectar el directorio principal |

---

## Lo que Claude NO puede hacer aqui

- Acceder a servicios Azure directamente (necesita credenciales en `.env`)
- Ejecutar SQL contra bases de datos reales sin conexion configurada
- Pushear codigo a remoto sin confirmacion explicita del usuario
- Tomar acciones destructivas (borrar ramas, reset --hard) sin aprobacion

---

*Generado para el proyecto DataAgent — Hackaton Microsoft Azure*
