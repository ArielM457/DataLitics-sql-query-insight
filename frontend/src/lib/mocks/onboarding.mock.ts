/**
 * MOCK — connectOnboarding
 *
 * Simula la respuesta del endpoint POST /onboarding/connect.
 *
 * ─── CUANDO EL BACKEND ESTÉ LISTO ───────────────────────────────────────────
 *  1. Eliminar esta función completa.
 *  2. En api.ts, descomentar la llamada real a POST /onboarding/connect.
 *  3. El payload enviado es: { company_name, connection_string, tenant_id }
 *  4. El endpoint requiere Authorization: Bearer <firebase_token> con rol admin.
 *     El interceptor de Axios en api.ts ya lo adjunta automáticamente.
 *  5. Campos esperados en la respuesta (OnboardingResponse):
 *       { status, tenant_id, company_name, tables_found,
 *         schema_summary, dab_config, next_steps }
 * ────────────────────────────────────────────────────────────────────────────
 */

interface OnboardingPayload {
  company_name: string;
  connection_string: string;
  tenant_id: string;
}

// ─── mockTestConnection ───────────────────────────────────────────────────────
export async function mockTestConnection(connectionString: string) {
  await new Promise((r) => setTimeout(r, 1200));

  const required = ["Server=", "Database=", "User ID=", "Password="];
  const missing = required.filter((k) => !connectionString.includes(k));

  if (missing.length > 0) {
    throw new Error(
      `Faltan campos requeridos en la cadena de conexión: ${missing.join(", ")}`
    );
  }

  // Simular latencia de red hacia Azure SQL
  const latencyMs = Math.floor(Math.random() * 40) + 18;
  return { ok: true, latency_ms: latencyMs };
}
// ─────────────────────────────────────────────────────────────────────────────

export async function mockConnectOnboarding(payload: OnboardingPayload) {
  // Simular tiempo de introspección de base de datos
  await new Promise((r) => setTimeout(r, 2200));

  return {
    status: "ok",
    tenant_id: payload.tenant_id,
    company_name: payload.company_name,
    tables_found: 8,
    schema_summary: {
      Products: {
        total_columns: 10,
        sensitive_columns_excluded_for_analyst: [],
      },
      Orders: {
        total_columns: 14,
        sensitive_columns_excluded_for_analyst: ["InternalNotes"],
      },
      Customers: {
        total_columns: 11,
        sensitive_columns_excluded_for_analyst: ["CreditCardToken", "TaxID"],
      },
      Employees: {
        total_columns: 18,
        sensitive_columns_excluded_for_analyst: ["Salary", "BankAccount", "SSN"],
      },
      Categories: { total_columns: 4, sensitive_columns_excluded_for_analyst: [] },
      Suppliers: { total_columns: 12, sensitive_columns_excluded_for_analyst: [] },
      OrderDetails: { total_columns: 5, sensitive_columns_excluded_for_analyst: [] },
      Shippers: { total_columns: 4, sensitive_columns_excluded_for_analyst: [] },
    },
    dab_config: {
      schema: "dbo",
      entities: ["Products", "Orders", "Customers", "Categories", "OrderDetails"],
    },
    next_steps: [
      `Add DAB_CONNECTION_STRING_${payload.tenant_id.toUpperCase()} to the DAB Container App environment variables`,
      `Deploy DAB container using the generated dab-config above`,
      `Add DAB_BASE_URL_${payload.tenant_id.toUpperCase()} to the backend Container App`,
    ],
  };
}
