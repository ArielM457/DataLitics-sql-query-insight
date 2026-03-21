/**
 * MOCK — getSecurityMetrics
 *
 * Simula las métricas de seguridad del dashboard.
 *
 * ─── CUANDO EL BACKEND ESTÉ LISTO ───────────────────────────────────────────
 *  1. Eliminar esta función completa.
 *  2. En api.ts, descomentar la llamada real a GET /audit/security.
 *  3. Campos esperados por el componente Dashboard:
 *       { blocked_threats, out_of_context_queries, restricted_access_attempts }
 *     Todos son números enteros (conteos del período actual).
 * ────────────────────────────────────────────────────────────────────────────
 */

export async function mockGetSecurityMetrics() {
  await new Promise((r) => setTimeout(r, 400));

  return {
    blocked_threats: 3,
    out_of_context_queries: 1,
    restricted_access_attempts: 2,
  };
}
