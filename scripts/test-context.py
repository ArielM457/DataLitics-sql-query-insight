"""Test de contexto para GPT-4.1 — Verifica que el modelo responde correctamente.

Ejecuta pruebas de los 3 agentes que usan Azure OpenAI (1, 2, 4) para
validar que GPT-4.1 entiende bien el contexto y genera respuestas coherentes.

Uso:
    cd backend
    python ../scripts/test-context.py

Requisitos:
    - Azure OpenAI configurado en .env con deployment GPT-4.1
    - pip install -r requirements.txt
"""

import asyncio
import json
import sys
import time

# Add backend to path
sys.path.insert(0, ".")

from app.agents.agent_intention import IntentionAgent
from app.agents.agent_sql import SQLAgent
from app.agents.agent_insights import InsightsAgent
from app.config import settings


RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
NC = "\033[0m"


def ok(msg):
    print(f"{GREEN}[PASS]{NC} {msg}")


def fail(msg):
    print(f"{RED}[FAIL]{NC} {msg}")


def info(msg):
    print(f"{BLUE}[INFO]{NC} {msg}")


def warn(msg):
    print(f"{YELLOW}[WARN]{NC} {msg}")


async def test_intention_agent():
    """Prueba que el Agente 1 entienda el contexto de las preguntas."""
    print(f"\n{'='*60}")
    print(f"{BLUE}AGENTE 1 — Intencion (Analisis de contexto){NC}")
    print(f"{'='*60}\n")

    agent = IntentionAgent()
    passed = 0
    total = 0

    tests = [
        {
            "question": "Cuales son las 10 ventas mas recientes?",
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_tables": ["Sales"],
            "expect_out_of_domain": False,
            "expect_clarification": False,
            "description": "Pregunta simple de ventas",
        },
        {
            "question": "Compare sales by product category for the last quarter",
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_tables": ["Sales", "Products"],
            "expect_out_of_domain": False,
            "expect_clarification": False,
            "description": "Pregunta con JOIN implicito (ingles)",
        },
        {
            "question": "Cuantos empleados hay por departamento?",
            "tenant": "empresa_b",
            "role": "analyst",
            "expect_tables": ["Employees", "Departments"],
            "expect_out_of_domain": False,
            "expect_clarification": False,
            "description": "Pregunta de RRHH en tenant correcto",
        },
        {
            "question": "Cuantos empleados hay por departamento?",
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_tables": [],
            "expect_out_of_domain": True,
            "expect_clarification": True,
            "description": "Pregunta de RRHH en tenant de ventas (fuera de dominio)",
        },
        {
            "question": "Cual es el clima hoy?",
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_tables": [],
            "expect_out_of_domain": True,
            "expect_clarification": False,
            "description": "Pregunta totalmente fuera de dominio",
        },
    ]

    for test in tests:
        total += 1
        desc = test["description"]
        try:
            start = time.time()
            result = await agent.analyze(
                test["question"], test["tenant"], test["role"]
            )
            elapsed = (time.time() - start) * 1000

            # Check tables
            result_tables = [t.lower() for t in result.get("tablas", [])]
            expect_tables = [t.lower() for t in test["expect_tables"]]

            tables_ok = all(t in result_tables for t in expect_tables)

            # Check out of domain
            ood = result.get("fuera_de_dominio", False)
            clar = result.get("clarificacion_requerida", False)

            if test["expect_out_of_domain"]:
                context_ok = ood or clar  # Either flag is acceptable
            else:
                context_ok = not ood
                tables_ok = tables_ok and len(result_tables) > 0

            if tables_ok and context_ok:
                ok(f"{desc} ({elapsed:.0f}ms)")
                ok(f"  tablas={result.get('tablas')}, tecnica={result.get('tecnica_sugerida', 'N/A')}")
                passed += 1
            else:
                fail(f"{desc} ({elapsed:.0f}ms)")
                if not tables_ok:
                    fail(f"  Tablas: esperado={test['expect_tables']}, obtenido={result.get('tablas')}")
                if not context_ok:
                    fail(f"  fuera_de_dominio={ood}, clarificacion={clar}")

        except Exception as e:
            fail(f"{desc}: ERROR — {e}")

    return passed, total


async def test_sql_agent():
    """Prueba que el Agente 2 genere SQL correcto con contexto."""
    print(f"\n{'='*60}")
    print(f"{BLUE}AGENTE 2 — SQL (Generacion con contexto){NC}")
    print(f"{'='*60}\n")

    agent = SQLAgent()
    passed = 0
    total = 0

    tests = [
        {
            "intention": {
                "tablas": ["Sales"],
                "metricas": ["count", "total"],
                "filtros": [],
                "periodo": "ultimo mes",
                "tecnica_sugerida": "aggregation",
            },
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_blocked": False,
            "expect_sql_contains": ["SELECT", "Sales"],
            "description": "Query de ventas basica",
        },
        {
            "intention": {
                "tablas": ["Sales", "Products"],
                "metricas": ["sum", "count"],
                "filtros": ["category"],
                "periodo": "",
                "tecnica_sugerida": "GROUP BY",
            },
            "tenant": "empresa_a",
            "role": "analyst",
            "expect_blocked": False,
            "expect_sql_contains": ["SELECT", "JOIN", "GROUP BY"],
            "description": "Query con JOIN y GROUP BY",
        },
        {
            "intention": {
                "tablas": ["Employees", "Salaries"],
                "metricas": ["avg salary"],
                "filtros": [],
                "periodo": "",
                "tecnica_sugerida": "aggregation",
            },
            "tenant": "empresa_b",
            "role": "analyst",
            "expect_blocked": True,
            "expect_sql_contains": [],
            "description": "Query de salarios como analyst (debe bloquear columna sensible)",
        },
    ]

    for test in tests:
        total += 1
        desc = test["description"]
        try:
            start = time.time()
            result = await agent.generate(
                intention=test["intention"],
                tenant_id=test["tenant"],
                user_role=test["role"],
            )
            elapsed = (time.time() - start) * 1000

            sql = result.get("sql", "")
            blocked = result.get("blocked", False)

            if test["expect_blocked"]:
                if blocked:
                    ok(f"{desc} ({elapsed:.0f}ms) — bloqueado correctamente")
                    ok(f"  Razon: {result.get('block_reason', 'N/A')[:80]}")
                    passed += 1
                else:
                    fail(f"{desc} ({elapsed:.0f}ms) — debio ser bloqueado pero no lo fue")
                    fail(f"  SQL generado: {sql[:100]}")
            else:
                sql_upper = sql.upper()
                contains_ok = all(kw.upper() in sql_upper for kw in test["expect_sql_contains"])

                if not blocked and contains_ok and sql:
                    ok(f"{desc} ({elapsed:.0f}ms)")
                    ok(f"  SQL: {sql[:100]}...")
                    ok(f"  Riesgo: {result.get('risk_level', 'N/A')}")
                    passed += 1
                else:
                    fail(f"{desc} ({elapsed:.0f}ms)")
                    if blocked:
                        fail(f"  Bloqueado inesperadamente: {result.get('block_reason')}")
                    if not contains_ok:
                        fail(f"  SQL no contiene keywords esperados: {test['expect_sql_contains']}")
                    fail(f"  SQL: {sql[:150]}")

        except Exception as e:
            fail(f"{desc}: ERROR — {e}")

    return passed, total


async def test_insights_agent():
    """Prueba que el Agente 4 genere insights coherentes con contexto."""
    print(f"\n{'='*60}")
    print(f"{BLUE}AGENTE 4 — Insights (Generacion con contexto){NC}")
    print(f"{'='*60}\n")

    agent = InsightsAgent()
    passed = 0
    total = 0

    tests = [
        {
            "question": "Cuales son las ventas por producto?",
            "sql": "SELECT p.name, SUM(s.amount) as total FROM Sales s JOIN Products p ON s.product_id = p.id GROUP BY p.name ORDER BY total DESC",
            "data": [
                {"name": "Laptop", "total": 150000},
                {"name": "Mouse", "total": 45000},
                {"name": "Teclado", "total": 32000},
                {"name": "Monitor", "total": 98000},
                {"name": "Audifonos", "total": 21000},
            ],
            "tenant": "empresa_a",
            "expect_fields": ["summary", "findings", "recommendations", "chart_type"],
            "description": "Insights de ventas por producto",
        },
        {
            "question": "Cuantos empleados hay por departamento?",
            "sql": "SELECT d.name, COUNT(e.id) as total FROM Employees e JOIN Departments d ON e.dept_id = d.id GROUP BY d.name",
            "data": [
                {"name": "Ingenieria", "total": 45},
                {"name": "Ventas", "total": 30},
                {"name": "Marketing", "total": 15},
                {"name": "RRHH", "total": 8},
                {"name": "Finanzas", "total": 12},
            ],
            "tenant": "empresa_b",
            "expect_fields": ["summary", "findings", "recommendations", "chart_type"],
            "description": "Insights de distribucion de empleados",
        },
    ]

    for test in tests:
        total += 1
        desc = test["description"]
        try:
            start = time.time()
            result = await agent.generate(
                question=test["question"],
                sql=test["sql"],
                data=test["data"],
                tenant_id=test["tenant"],
            )
            elapsed = (time.time() - start) * 1000

            # Check that all expected fields exist and are non-empty
            missing = []
            empty = []
            for field in test["expect_fields"]:
                if field not in result:
                    missing.append(field)
                elif not result[field]:
                    empty.append(field)

            has_findings = isinstance(result.get("findings"), list) and len(result.get("findings", [])) > 0
            has_recommendations = isinstance(result.get("recommendations"), list) and len(result.get("recommendations", [])) >= 2

            if not missing and not empty and has_findings and has_recommendations:
                ok(f"{desc} ({elapsed:.0f}ms)")
                ok(f"  Summary: {result['summary'][:80]}...")
                ok(f"  Findings: {len(result['findings'])} hallazgos")
                ok(f"  Recommendations: {len(result['recommendations'])} recomendaciones")
                ok(f"  Chart: {result.get('chart_type', 'N/A')}")
                if result.get("source"):
                    ok(f"  Fuente: {result['source'].get('libro', 'N/A')}, Cap. {result['source'].get('capitulo', '?')}")
                passed += 1
            else:
                fail(f"{desc} ({elapsed:.0f}ms)")
                if missing:
                    fail(f"  Campos faltantes: {missing}")
                if empty:
                    fail(f"  Campos vacios: {empty}")
                if not has_findings:
                    fail(f"  Sin hallazgos suficientes")
                if not has_recommendations:
                    fail(f"  Menos de 2 recomendaciones")

        except Exception as e:
            fail(f"{desc}: ERROR — {e}")

    return passed, total


async def main():
    print(f"\n{'#'*60}")
    print(f"  DataLitics — Test de Contexto GPT-4.1")
    print(f"  Modelo: {settings.AZURE_OPENAI_DEPLOYMENT_NAME}")
    print(f"  Endpoint: {settings.AZURE_OPENAI_ENDPOINT[:50]}...")
    print(f"{'#'*60}")

    if not settings.AZURE_OPENAI_ENDPOINT or not settings.AZURE_OPENAI_API_KEY:
        fail("Azure OpenAI no configurado. Configura .env primero.")
        fail("Ejecuta: bash scripts/setup-azure-ai.sh")
        sys.exit(1)

    total_passed = 0
    total_tests = 0

    # Test Agent 1
    p, t = await test_intention_agent()
    total_passed += p
    total_tests += t

    # Test Agent 2
    p, t = await test_sql_agent()
    total_passed += p
    total_tests += t

    # Test Agent 4
    p, t = await test_insights_agent()
    total_passed += p
    total_tests += t

    # Summary
    print(f"\n{'='*60}")
    if total_passed == total_tests:
        print(f"{GREEN}RESULTADO: {total_passed}/{total_tests} pruebas pasaron{NC}")
        print(f"{GREEN}GPT-4.1 responde correctamente con contexto{NC}")
    else:
        failed = total_tests - total_passed
        print(f"{YELLOW}RESULTADO: {total_passed}/{total_tests} pruebas pasaron ({failed} fallaron){NC}")
        if failed > 2:
            warn("Multiples fallos de contexto. Considera probar con GPT-4o:")
            warn("  Cambia AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o en .env")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
