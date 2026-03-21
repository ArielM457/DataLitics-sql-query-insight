/**
 * MOCK — queryAgent
 *
 * Simula la respuesta del pipeline multi-agente para una pregunta en lenguaje natural.
 *
 * ─── CUANDO EL BACKEND ESTÉ LISTO ───────────────────────────────────────────
 *  1. Eliminar esta función completa.
 *  2. En api.ts, descomentar la llamada real a POST /query.
 *  3. La forma del objeto retornado debe seguir el tipo QueryResponse
 *     definido en backend/app/models/response.py:
 *       { sql, explanation, data, insights, security, trace }
 * ────────────────────────────────────────────────────────────────────────────
 */

export async function mockQueryAgent(question: string) {
  // Simular latencia de red + pipeline de agentes
  await new Promise((r) => setTimeout(r, 1800));

  return {
    sql: `SELECT
  p.ProductName,
  SUM(od.Quantity) AS TotalUnitsSold,
  SUM(od.UnitPrice * od.Quantity) AS TotalRevenue
FROM Products p
  JOIN OrderDetails od ON p.ProductID = od.ProductID
  JOIN Orders o ON od.OrderID = o.OrderID
WHERE o.OrderDate >= DATEADD(month, -3, GETDATE())
GROUP BY p.ProductName
ORDER BY TotalRevenue DESC;`,

    explanation: `He analizado tu pregunta "${question}" y generé una consulta que obtiene los productos más vendidos en los últimos 3 meses, ordenados por ingresos totales. Los datos muestran que las bebidas y lácteos lideran las ventas del trimestre.`,

    data: [
      { ProductName: "Côte de Blaye", TotalUnitsSold: 142, TotalRevenue: 26924.8 },
      { ProductName: "Thüringer Rostbratwurst", TotalUnitsSold: 98, TotalRevenue: 23812.9 },
      { ProductName: "Mishi Kobe Niku", TotalUnitsSold: 75, TotalRevenue: 17250.0 },
      { ProductName: "Sir Rodney's Marmalade", TotalUnitsSold: 210, TotalRevenue: 16380.0 },
      { ProductName: "Carnarvon Tigers", TotalUnitsSold: 88, TotalRevenue: 13552.0 },
      { ProductName: "Raclette Courdavault", TotalUnitsSold: 155, TotalRevenue: 8370.0 },
      { ProductName: "Manjimup Dried Apples", TotalUnitsSold: 193, TotalRevenue: 8078.1 },
      { ProductName: "Alice Mutton", TotalUnitsSold: 207, TotalRevenue: 8034.54 },
    ],

    insights: {
      summary: "Las bebidas premium representan el 42% del revenue total del trimestre.",
      top_category: "Beverages",
      trend: "Crecimiento del 18% respecto al trimestre anterior.",
      recommendation: "Considerar aumentar el stock de Côte de Blaye antes del próximo trimestre.",
    },

    security: { passed: true, risk_level: "low", flags: [] },
    trace: { agents_used: 4, total_ms: 1240 },
  };
}
