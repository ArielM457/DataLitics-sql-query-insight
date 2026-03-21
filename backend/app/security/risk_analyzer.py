"""Risk Analyzer — Classifies SQL query risk levels.

Analyzes SQL queries to determine their risk level based on
factors such as sensitive column access, estimated result size,
cross-domain queries, and data exposure potential.

Risk dimensions:
1. Column sensitivity — does the query touch sensitive fields?
2. Volume estimation — could the query return excessive data?
3. Cross-domain joins — does it join tables from different domains?
"""

import logging
import re

logger = logging.getLogger("dataagent.security.risk_analyzer")

# Known sensitive column name patterns
_SENSITIVE_PATTERNS = [
    re.compile(r"(salary|salario|sueldo|wage|compensation|pay_rate)", re.IGNORECASE),
    re.compile(r"(ssn|social_security|cedula|dni|passport)", re.IGNORECASE),
    re.compile(r"(bank_account|account_number|iban|routing)", re.IGNORECASE),
    re.compile(r"(password|passwd|secret|api_key|token)", re.IGNORECASE),
    re.compile(r"(email|phone|telefono|address|direccion)", re.IGNORECASE),
    re.compile(r"(credit_card|card_number|cvv|expiry)", re.IGNORECASE),
]

# Domains for cross-domain detection
_TABLE_DOMAINS = {
    "hr": ["employees", "departments", "salaries", "performance", "payroll"],
    "sales": ["sales", "orders", "transactions", "revenue", "invoices"],
    "customers": ["customers", "clients", "contacts", "accounts"],
    "products": ["products", "inventory", "catalog", "items", "stores"],
    "finance": ["budgets", "expenses", "profits", "costs", "payments"],
}


def _detect_sensitive_columns(sql: str, tenant_schema: dict) -> list[str]:
    """Detect references to sensitive columns in the SQL query."""
    sensitive_found = []
    sql_lower = sql.lower()

    # Check against known sensitive patterns
    for pattern in _SENSITIVE_PATTERNS:
        matches = pattern.findall(sql_lower)
        sensitive_found.extend(matches)

    # Check against tenant's restricted columns
    restricted_by_role = tenant_schema.get("restricted_columns_by_role", {})
    for role, columns in restricted_by_role.items():
        for col in columns:
            if col.lower() in sql_lower:
                if col.lower() not in sensitive_found:
                    sensitive_found.append(col.lower())

    return list(set(sensitive_found))


def _estimate_volume_risk(sql: str) -> tuple[str, int]:
    """Estimate the volume risk of a query.

    Returns:
        tuple: (risk_level, estimated_rows)
    """
    sql_upper = sql.upper()

    # No WHERE clause on a FROM query = potentially large result
    has_where = "WHERE" in sql_upper
    has_limit = "TOP" in sql_upper or "LIMIT" in sql_upper
    has_group = "GROUP BY" in sql_upper

    if not has_where and not has_limit and not has_group:
        return "high", 10000
    elif not has_where and has_limit:
        return "medium", 1000
    elif has_where and not has_limit:
        return "low", 500
    else:
        return "low", 100


def _detect_cross_domain(sql: str) -> tuple[bool, list[str]]:
    """Detect if the query joins tables from different data domains."""
    sql_lower = sql.lower()
    domains_touched = set()

    for domain, tables in _TABLE_DOMAINS.items():
        for table in tables:
            if table in sql_lower:
                domains_touched.add(domain)

    cross = len(domains_touched) > 1
    return cross, sorted(domains_touched)


class RiskAnalyzer:
    """Classifies the risk level of SQL queries.

    Evaluates queries against multiple risk factors to assign a
    risk level (low, medium, high) that determines the level of
    review and audit logging required.
    """

    def classify(self, sql: str, tenant_schema: dict) -> dict:
        """Classify the risk level of an SQL query.

        Args:
            sql: The SQL query to analyze.
            tenant_schema: The tenant's database schema for context.

        Returns:
            dict: Risk classification with shape:
                {
                    "level": "low" | "medium" | "high",
                    "sensitive_columns": list,
                    "estimated_rows": int,
                    "cross_domain": bool,
                    "domains": list,
                    "reason": str,
                }
        """
        sensitive_cols = _detect_sensitive_columns(sql, tenant_schema)
        volume_risk, estimated_rows = _estimate_volume_risk(sql)
        cross_domain, domains = _detect_cross_domain(sql)

        # Calculate overall risk level
        risk_score = 0
        reasons = []

        if sensitive_cols:
            risk_score += 2
            reasons.append(f"accesses sensitive columns: {', '.join(sensitive_cols)}")

        if volume_risk == "high":
            risk_score += 2
            reasons.append("no WHERE/LIMIT clause, potentially large result set")
        elif volume_risk == "medium":
            risk_score += 1

        if cross_domain:
            risk_score += 2
            reasons.append(f"crosses data domains: {', '.join(domains)}")

        if risk_score >= 4:
            level = "high"
        elif risk_score >= 2:
            level = "medium"
        else:
            level = "low"

        reason = "; ".join(reasons) if reasons else "Standard query with no elevated risk factors"

        if level in ("medium", "high"):
            logger.info("Risk analysis: level=%s, reason=%s", level, reason)

        return {
            "level": level,
            "sensitive_columns": sensitive_cols,
            "estimated_rows": estimated_rows,
            "cross_domain": cross_domain,
            "domains": domains,
            "reason": reason,
        }


# Singleton instance
risk_analyzer = RiskAnalyzer()
