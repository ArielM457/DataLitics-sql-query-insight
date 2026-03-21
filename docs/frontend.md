# DataLitics — Frontend Documentation

## Índice

1. [Visión general](#1-visión-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura de archivos](#3-estructura-de-archivos)
4. [Flujos de usuario por rol](#4-flujos-de-usuario-por-rol)
5. [Páginas y rutas](#5-páginas-y-rutas)
6. [Sistema de autenticación](#6-sistema-de-autenticación)
7. [Sistema de roles](#7-sistema-de-roles)
8. [Sistema de mocks](#8-sistema-de-mocks)
9. [Capa de API](#9-capa-de-api)
10. [Conexiones al backend (cuando esté implementado)](#10-conexiones-al-backend-cuando-esté-implementado)
11. [Variables de entorno](#11-variables-de-entorno)

---

## 1. Visión general

DataLitics es el frontend de un sistema multi-agente NL-to-SQL. Permite a usuarios empresariales hacer preguntas en lenguaje natural sobre sus datos, ver el SQL generado, los resultados y los insights del pipeline de IA — sin escribir una línea de SQL.

El frontend está construido con **Next.js 15 (App Router)** y se conecta a un backend **FastAPI** mediante un cliente Axios que adjunta automáticamente el token Firebase en cada request.

**Estado actual del proyecto:** Los servicios de backend están en desarrollo. El frontend funciona completamente con **mocks** que simulan todas las respuestas de la API. Cuando el backend esté listo, cada mock tiene instrucciones exactas de qué cambiar.

---

## 2. Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15.1.0 | Framework React (App Router) |
| React | 19.0.0 | UI |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 3.4.1 | Estilos |
| Firebase JS SDK | 11.1.0 | Autenticación (Email/Password) |
| Axios | 1.7.9 | HTTP client + interceptor de auth |
| chart.js + react-chartjs-2 | 4.4.7 / 5.2.0 | Gráficos (instalado, pendiente de usar) |

---

## 3. Estructura de archivos

```
frontend/src/
├── app/                        # Next.js App Router — páginas
│   ├── page.tsx                # / — Landing page (pública)
│   ├── auth/page.tsx           # /auth — Login / Registro
│   ├── home/page.tsx           # /home — Chat + Dashboard (autenticado)
│   ├── join/page.tsx           # /join — Vincular BD de empresa (admin nuevo)
│   ├── pending/page.tsx        # /pending — Esperando aprobación del admin
│   ├── admin/page.tsx          # /admin — Gestión de equipo (solo admin)
│   ├── audit/page.tsx          # /audit — Audit logs (solo admin)
│   ├── onboarding/page.tsx     # /onboarding — Reconectar BD (solo admin)
│   ├── layout.tsx              # Layout raíz — AuthProvider + NavBar
│   └── globals.css             # Estilos globales Tailwind
│
├── components/
│   ├── Auth/
│   │   ├── LoginForm.tsx       # Formulario de login con Firebase
│   │   └── RegisterForm.tsx    # Formulario de registro con selección de rol
│   ├── AuthGuard/index.tsx     # Protección de rutas por sesión y rol
│   ├── Chat/index.tsx          # Chat principal — SQL, tabla, insights
│   ├── Dashboard/index.tsx     # Métricas de seguridad en tiempo real
│   ├── Audit/index.tsx         # Tabla de audit logs + Export CSV
│   ├── Onboarding/index.tsx    # Formulario de reconexión de BD
│   ├── HomeContent/index.tsx   # Home diferenciado por rol (admin vs analyst)
│   ├── NavBar/index.tsx        # Barra de navegación con links por rol
│   └── UserMenu/index.tsx      # Avatar + nombre + dropdown de logout
│
├── context/
│   └── AuthContext.tsx         # Estado global: user, role, tenantId, status
│
└── lib/
    ├── firebase.ts             # Inicialización Firebase Auth
    ├── api.ts                  # Axios + interceptor + funciones de API
    └── mocks/
        ├── query.mock.ts       # Mock de POST /query
        ├── audit.mock.ts       # Mock de GET /audit/logs
        ├── security.mock.ts    # Mock de GET /audit/security
        ├── onboarding.mock.ts  # Mock de POST /onboarding/connect
        └── users.mock.ts       # Mock de gestión de usuarios e invite codes
```

---

## 4. Flujos de usuario por rol

### 4.1 Flujo — Administrador (empresa nueva)

```
1. / (Landing)
   └── Clic en "Únete a DataLitics"

2. /auth (tab: Registrarse)
   └── Selecciona "Quiero unir mi empresa"
   └── Completa: nombre, email, contraseña

3. /join (Vincular base de datos)
   └── Completa: nombre empresa, tenant ID
   └── Completa: server, database, usuario, contraseña, puerto
   └── El sistema genera la connection string automáticamente
   └── Llama a POST /onboarding/connect
   └── En éxito → se le asigna rol "admin", status "active"

4. /home
   ├── Chat (izquierda) — puede hacer preguntas NL
   └── Dashboard de seguridad (derecha) — métricas en tiempo real

   Navegación disponible:
   ├── Chat (/home)
   ├── Audit Logs (/audit)
   ├── Equipo (/admin)
   └── Base de datos (/onboarding)

5. /admin (Gestión de equipo)
   ├── Genera códigos de invitación (duración configurable: 15min–24h)
   └── Aprueba o rechaza solicitudes de empleados
```

### 4.2 Flujo — Empleado (con código de invitación)

```
1. / (Landing)
   └── Clic en "Únete a DataLitics"

2. /auth (tab: Registrarse)
   └── Selecciona "Pertenezco a una empresa"
   └── Completa: nombre, email, contraseña, código de empresa (6 chars)
   └── El código se valida contra el mock (expiry + single-use)

3. /pending (Esperando aprobación)
   └── La página hace polling cada 10s
   └── Cuando el admin aprueba → redirige automáticamente a /home

4. /home
   └── Solo Chat — ancho completo, sin dashboard
   └── Navegación: solo "Chat"
```

### 4.3 Flujo — Login (usuario existente)

```
1. /auth (tab: Iniciar sesión)
   └── Email + contraseña → Firebase signInWithEmailAndPassword

2. AuthContext lee el perfil de localStorage (mock)
   ├── status "pending" → /pending
   └── status "active"  → /home (con contenido según rol)
```

---

## 5. Páginas y rutas

### `/` — Landing page
- **Acceso:** Público
- **Si hay sesión activa:** Redirige a `/home` (o `/pending` si está pendiente)
- **Contenido:**
  - Hero con degradado azul, título, descripción y CTA "Únete a DataLitics"
  - Sección de 6 beneficios (lenguaje natural, seguridad, multi-agente, multi-tenant, insights, roles)
  - Sección "Cómo funciona" con 3 pasos
  - CTA final + footer

### `/auth` — Autenticación
- **Acceso:** Público
- **Si hay sesión activa:** Redirige a `/home` o `/pending`
- **Tabs:**
  - **Iniciar sesión:** Email + contraseña → `signInWithEmailAndPassword`
  - **Registrarse:** Selección de tipo de cuenta → flujo diferenciado

### `/join` — Vincular base de datos
- **Acceso:** Usuario recién registrado como admin
- **Propósito:** Conectar la primera base de datos de la empresa
- **Campos:**
  - Nombre de la empresa
  - Tenant ID (solo letras, números, guiones bajos)
  - Servidor Azure SQL (`servidor.database.windows.net`)
  - Base de datos
  - Puerto (default: 1433)
  - Usuario SQL
  - Contraseña
  - Toggle: cifrar conexión
- **Genera automáticamente** la connection string en formato pyodbc/Azure SQL
- **Preview en tiempo real** de la connection string generada
- **Estados:** `form` → `connecting` (con progress bar) → `success` / `error`

### `/pending` — Esperando aprobación
- **Acceso:** Usuarios con `status = "pending"`
- **Comportamiento:** Polling automático cada 10s al mock de usuarios
- **Al aprobarse:** Redirige automáticamente a `/home`
- **Acción disponible:** Cerrar sesión

### `/home` — Panel principal
- **Acceso:** Autenticado + `status = "active"`
- **Admin:** Chat (izq) + Dashboard de seguridad (der)
- **Analyst:** Solo Chat, ancho completo
- El greeting personalizado usa `user.displayName`

### `/audit` — Audit Logs
- **Acceso:** Solo `role = "admin"`
- **Contenido:** Tabla con Date, User, Question, Status, Risk, Block Type
- **Funcionalidades:** Carga automática al montar, Export CSV (habilitado cuando hay datos)
- **Protección:** `<AuthGuard requiredRole="admin">`

### `/admin` — Gestión de equipo
- **Acceso:** Solo `role = "admin"`
- **Tab "Códigos de invitación":**
  - Selector de duración (15min / 30min / 1h / 4h / 24h)
  - Botón generar → muestra código grande con tiempo restante y botón copiar
  - Tabla de todos los códigos con estado: Activo / Expirado / Usado
- **Tab "Solicitudes pendientes":**
  - Badge con conteo de pendientes en la pestaña
  - Tabla con nombre, email, empresa, estado
  - Botones Aprobar / Rechazar por fila
  - Al aprobar → actualiza `status = "active"` en el mock del usuario

### `/onboarding` — Reconectar base de datos
- **Acceso:** Solo `role = "admin"`
- **Propósito:** Actualizar o reconectar la BD de la empresa
- **Mismo formulario que `/join`** pero como mantenimiento

---

## 6. Sistema de autenticación

### Firebase Auth (Email/Password)
La autenticación usa **Firebase Authentication** con el proveedor Email/Password.

```typescript
// Login
signInWithEmailAndPassword(auth, email, password)

// Registro
createUserWithEmailAndPassword(auth, email, password)
updateProfile(user, { displayName: name })

// Logout
signOut(auth)

// Estado de sesión
onAuthStateChanged(auth, (user) => { ... })
```

### AuthContext (`src/context/AuthContext.tsx`)
Contexto React que centraliza el estado de auth y está disponible en toda la app via `AuthProvider` en `layout.tsx`.

**Estado que expone:**
```typescript
{
  user: User | null          // objeto Firebase User
  role: "admin" | "analyst" | null
  tenantId: string | null    // ID del tenant de la empresa
  status: "active" | "pending" | "rejected" | null
  loading: boolean           // true mientras Firebase inicializa
  setMockProfile(uid, role, tenantId, status): void  // escribe en localStorage
  refreshProfile(): void     // re-lee el perfil del usuario actual
}
```

**Uso en componentes:**
```typescript
import { useAuth } from "@/context/AuthContext";

const { user, role, tenantId, status, loading } = useAuth();
```

### AuthGuard (`src/components/AuthGuard/index.tsx`)
Wrapper que protege rutas. Acepta un `requiredRole` opcional.

```typescript
// Solo requiere sesión activa
<AuthGuard>
  <ComponenteProtegido />
</AuthGuard>

// Requiere rol admin
<AuthGuard requiredRole="admin">
  <ComponenteSoloAdmin />
</AuthGuard>
```

**Comportamiento de redirección:**
| Condición | Redirige a |
|---|---|
| No hay sesión | `/` |
| `status = "pending"` | `/pending` |
| `role = "analyst"` intentando ruta admin | `/home` |

---

## 7. Sistema de roles

### Roles definidos
Los roles son asignados por el administrador y guardados en el perfil del usuario.

| Rol | Rutas accesibles | Descripción |
|---|---|---|
| `admin` | `/home`, `/audit`, `/admin`, `/onboarding` | Creador/admin de una empresa. Ve métricas de seguridad, gestiona equipo, configura BD |
| `analyst` | `/home` (solo chat) | Empleado aprobado. Solo puede hacer consultas NL |

### NavBar por rol
- **Admin:** Chat · Audit Logs · Equipo · Base de datos
- **Analyst:** Chat (única opción)

### Home por rol
- **Admin:** `<Chat />` + `<Dashboard />` en grid de 2 columnas
- **Analyst:** `<Chat />` en ancho completo (max-w-3xl)

---

## 8. Sistema de mocks

Todos los mocks están en `src/lib/mocks/`. Están diseñados para funcionar independientemente del backend y tienen instrucciones de migración al inicio de cada archivo.

### `query.mock.ts`
Simula la respuesta del pipeline multi-agente (POST /query):
- SQL generado con JOIN y GROUP BY realistas
- Explicación en español referenciando la pregunta
- Tabla de 8 productos con `ProductName`, `TotalUnitsSold`, `TotalRevenue`
- Insights con `summary`, `top_category`, `trend`, `recommendation`
- Latencia simulada: 1800ms (simula el pipeline de 4 agentes)

### `audit.mock.ts`
10 registros de audit logs con casos mixtos:
- Consultas exitosas (risk: low)
- Bloqueos por prompt injection, jailbreak, restricted_access, out_of_context
- Usuarios y empresas distintas

### `security.mock.ts`
Métricas del dashboard de seguridad:
```json
{ "blocked_threats": 3, "out_of_context_queries": 1, "restricted_access_attempts": 2 }
```

### `onboarding.mock.ts`
Respuesta completa del endpoint de onboarding:
- 8 tablas (Products, Orders, Customers, Employees, etc.)
- Columnas sensibles detectadas (Salary, BankAccount, SSN, CreditCardToken)
- `next_steps` generados con el `tenant_id` del usuario
- Latencia simulada: 2200ms (simula introspección de BD)

### `users.mock.ts`
Toda la gestión de usuarios almacenada en `localStorage`:

**Invite codes** — `dataagent_invite_codes`:
```typescript
generateInviteCode(tenantId, companyName, expiresInMs) → InviteCode
validateInviteCode(code) → { valid: true, data } | { valid: false, reason }
markCodeUsed(code) → void
getInviteCodes(tenantId) → InviteCode[]
```

**Pending users** — `dataagent_pending_users`:
```typescript
addPendingUser(user) → void
getPendingUsers(tenantId) → PendingUser[]
updateUserStatus(uid, "approved" | "rejected") → void
getUserStatus(uid) → PendingUser | null
```

**Perfil de usuario** — `dataagent_profile_{uid}`:
```typescript
{ role: "admin" | "analyst", tenantId: string, status: "active" | "pending" | "rejected" }
```

---

## 9. Capa de API

### `src/lib/api.ts`
Instancia Axios configurada con:
- `baseURL`: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- Interceptor de request que adjunta el token Firebase automáticamente:

```typescript
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Funciones exportadas

| Función | Mock activo | Endpoint real |
|---|---|---|
| `queryAgent(question)` | `mockQueryAgent` | `POST /query` |
| `getAuditLogs()` | `mockGetAuditLogs` | `GET /audit/logs` |
| `getSecurityMetrics()` | `mockGetSecurityMetrics` | `GET /audit/security` |
| `connectOnboarding(payload)` | `mockConnectOnboarding` | `POST /onboarding/connect` |

**Para activar el backend real** en cada función, comentar la línea del mock y descomentar la llamada Axios:
```typescript
export async function queryAgent(question: string) {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockQueryAgent(question);

  // ✅ REAL — descomentar cuando el backend esté disponible
  // const response = await api.post("/query", { question });
  // return response.data;
}
```

---

## 10. Conexiones al backend (cuando esté implementado)

Esta sección describe exactamente qué debe cambiarse en el frontend para conectar cada pieza al backend real.

---

### 10.1 Firebase custom claims → reemplazar localStorage

**Archivo:** `src/context/AuthContext.tsx`, función `loadProfile`

**Cambio:** El rol, tenant_id y estado del usuario actualmente se leen de `localStorage`. Cuando el backend implemente la asignación de custom claims (Issue #04), reemplazar:

```typescript
// ANTES (mock — eliminar)
const profile = readProfile(u.uid);
setRole(profile.role);
setTenantId(profile.tenantId);
setStatus(profile.status);

// DESPUÉS (production)
const tokenResult = await u.getIdTokenResult(true); // true = force refresh
setRole((tokenResult.claims.role as UserRole) ?? "analyst");
setTenantId((tokenResult.claims.tenant_id as string) ?? null);
setStatus("active"); // el backend controla el acceso via claims
```

**Custom claims que debe establecer el backend:**
```python
# backend/app/core/auth.py o endpoint de aprobación
firebase_admin.auth.set_custom_user_claims(uid, {
    "tenant_id":          "empresa_a",
    "role":               "analyst",   # analyst | manager | admin
    "allowed_tables":     [],          # [] = todas las del tenant
    "restricted_columns": []           # [] = ninguna restricción adicional
})
```

**Cuándo llamar a `set_custom_user_claims`:**
- Al registrar un admin y completar el onboarding → `role = "admin"`
- Al aprobar un empleado → `role = "analyst"`
- Al rechazar → no asignar claims o marcar como inactivo

---

### 10.2 Gestión de usuarios → reemplazar localStorage por Firestore

**Archivo:** `src/lib/mocks/users.mock.ts`

**Cambio:** Reemplazar todas las funciones de `localStorage` por operaciones de Firestore:

```typescript
// Estructura de colecciones en Firestore:

// Collection: "invite_codes"
{
  code: string,
  tenantId: string,
  companyName: string,
  createdBy: string,     // uid del admin
  expiresAt: Timestamp,
  used: boolean
}

// Collection: "pending_users"
{
  uid: string,
  email: string,
  name: string,
  tenantId: string,
  companyName: string,
  requestedAt: Timestamp,
  status: "pending" | "approved" | "rejected"
}
```

**Función de aprobación** (llamar desde `/admin`):
```typescript
// 1. Actualizar Firestore
await updateDoc(doc(db, "pending_users", uid), { status: "approved" });

// 2. Llamar al backend para asignar custom claims
await api.post("/admin/approve-user", { uid, tenantId, role: "analyst" });
// El backend ejecuta: firebase_admin.auth.set_custom_user_claims(uid, {...})
```

---

### 10.3 `POST /query` → activar pipeline multi-agente

**Archivo:** `src/lib/api.ts`, función `queryAgent`

**Backend endpoint:** `POST /query` (Issue #20)

**Request:**
```typescript
// El backend actualmente solo usa "question" pero el modelo define también "tenant_id"
// El tenant_id lo toma el backend del Firebase token (custom claim)
{ question: string }
```

**Response esperada (QueryResponse):**
```typescript
{
  sql: string,           // Query generada por Agent 2
  explanation: string,   // Explicación en lenguaje natural de Agent 4
  data: object[],        // Resultados de Agent 3 (array de filas)
  insights: {            // Output de Agent 4
    summary?: string,
    top_category?: string,
    trend?: string,
    recommendation?: string,
    // ... campos variables según la query
  },
  security: {            // Metadata del security layer
    passed: boolean,
    risk_level: "low" | "medium" | "high",
    flags: string[]
  },
  trace: {               // Pipeline execution metadata
    agents_used: number,
    total_ms: number
  }
}
```

**El componente Chat ya renderiza todos estos campos.** Solo descomentar la llamada real.

---

### 10.4 `GET /audit/logs` → activar audit real

**Archivo:** `src/lib/api.ts`, función `getAuditLogs`

**Backend endpoint:** `GET /audit/logs` (Issue #18 — pendiente de implementar)

**Response esperada (lista de objetos):**
```typescript
[
  {
    date: string,          // ISO timestamp
    user: string,          // email del usuario
    question: string,      // pregunta original
    status: "success" | "blocked",
    risk_level: "low" | "medium" | "high" | "critical",
    block_type: string | null  // "prompt_injection" | "jailbreak" | "restricted_access" | "out_of_context" | null
  }
]
```

**Nota:** El componente Audit habilita automáticamente el botón "Export CSV" cuando el array tiene datos. El CSV se genera en el browser (sin llamada adicional al backend).

Si el backend implementa `GET /audit/export` para CSV del lado del servidor, agregar:
```typescript
export async function exportAuditCSV() {
  const response = await api.get("/audit/export", { responseType: "blob" });
  // Descargar el blob como archivo
}
```

---

### 10.5 `GET /audit/security` → métricas reales

**Archivo:** `src/lib/api.ts`, función `getSecurityMetrics`

**Backend endpoint:** `GET /audit/security` (Issue #19 — pendiente de implementar)

**Response esperada:**
```typescript
{
  blocked_threats: number,           // total de prompt injections + jailbreaks bloqueados
  out_of_context_queries: number,    // queries fuera del contexto del tenant
  restricted_access_attempts: number // intentos de acceder a columnas/tablas restringidas
}
```

---

### 10.6 `POST /onboarding/connect` → ya implementado en backend

**Archivo:** `src/lib/api.ts`, función `connectOnboarding`

**Este es el único endpoint completamente implementado en el backend.**

Para activarlo, **solo descomentar la llamada real** en `api.ts` y **comentar el mock**.

**Requisito:** El usuario debe tener `role = "admin"` en sus custom claims de Firebase. El backend verifica esto en `verify_firebase_token()`.

**Flujo completo:**
```
Frontend /join
  → connectOnboarding({ company_name, connection_string, tenant_id })
  → POST /onboarding/connect con Authorization: Bearer <token>
  → Backend verifica token → verifica role = "admin"
  → SchemaInspector.test_connection() → introspect()
  → DabConfigGenerator.generate()
  → Response: { status, tables_found, schema_summary, dab_config, next_steps }
  → Frontend muestra pantalla de éxito con instrucciones de despliegue
```

**Nota importante:** El campo `connection_string` debe estar en formato pyodbc compatible con Azure SQL:
```
Server=tcp:{server},1433;Database={db};User ID={user};Password={pass};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;
```
El componente `/join` genera este formato automáticamente a partir de los campos separados.

---

### 10.7 Endpoint de aprobación de usuarios (pendiente de crear en backend)

Para el sistema de aprobación de empleados, el backend necesitará un nuevo endpoint:

**Propuesta:**
```
POST /admin/approve-user
Authorization: Bearer <admin_token>
Body: { uid: string, role: "analyst" | "manager" }

Acción del backend:
  1. Verificar que el token es de un admin
  2. Verificar que el uid está en la lista de pendientes del tenant
  3. Ejecutar: firebase_admin.auth.set_custom_user_claims(uid, { tenant_id, role, ... })
  4. Actualizar Firestore: pending_users/{uid}.status = "approved"
  5. Return: { status: "ok" }
```

---

### 10.8 Endpoint de generación de invite codes (pendiente de crear en backend)

Actualmente los códigos se generan en el browser. En producción deberían generarse en el backend para mayor seguridad:

**Propuesta:**
```
POST /admin/invite-codes
Authorization: Bearer <admin_token>
Body: { expires_in_ms: number }

Return: { code: string, expires_at: string, tenant_id: string }

GET /admin/invite-codes
Authorization: Bearer <admin_token>
Return: [{ code, expires_at, used, created_at }]
```

---

## 11. Variables de entorno

Crear el archivo `frontend/.env.local` (nunca commitear):

```bash
# Firebase Web SDK (claves públicas — seguras para el browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abc123

# Backend FastAPI
NEXT_PUBLIC_API_URL=http://localhost:8000
# En producción:
# NEXT_PUBLIC_API_URL=https://dataagent-backend.azurecontainerapps.io
```

**Nota:** Las variables `NEXT_PUBLIC_*` son visibles en el browser. No poner secrets aquí.
El token de autenticación (Firebase ID token) es efímero y se adjunta automáticamente por el interceptor de Axios — no necesita variable de entorno.

---

## Resumen de migraciones pendientes

| Componente | Estado actual | Qué cambiar para producción |
|---|---|---|
| Rol y tenant del usuario | localStorage | Firebase custom claims (Issue #04) |
| Invite codes | localStorage | Endpoint backend + Firestore |
| Aprobación de usuarios | localStorage | Endpoint backend + `set_custom_user_claims` |
| Chat (POST /query) | Mock 1.8s | Descomentar llamada real (Issue #20) |
| Audit logs (GET /audit/logs) | Mock 0.6s | Descomentar llamada real (Issue #18) |
| Security metrics (GET /audit/security) | Mock 0.4s | Descomentar llamada real (Issue #19) |
| Onboarding (POST /onboarding/connect) | Mock 2.2s | **Ya listo** — solo descomentar (Issue #23) |
