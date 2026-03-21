"""Prompt Shields — Detects and blocks prompt injection attacks.

Uses the Azure AI Content Safety — Prompt Shields endpoint to
analyze incoming text for potential prompt injection attacks,
jailbreak attempts, and other adversarial inputs.

Two Azure APIs are used:
1. Prompt Shields (shieldPrompt) — detects prompt injection in user input
2. Text Analysis (analyzeText) — detects harmful content categories

Includes a local heuristic fallback when the Azure AI Content Safety
service is not configured, covering common attack patterns.
"""

import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger("dataagent.security.prompt_shields")

# Patterns that indicate prompt injection or SQL attack attempts
_INJECTION_PATTERNS = [
    # SQL destructive operations
    re.compile(r"\b(DELETE|DROP|TRUNCATE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE)\b", re.IGNORECASE),
    # Prompt injection attempts
    re.compile(r"(ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?))", re.IGNORECASE),
    re.compile(r"(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you\s+are))", re.IGNORECASE),
    re.compile(r"(system\s*:\s*|<\s*system\s*>|###\s*system)", re.IGNORECASE),
    re.compile(r"(forget\s+(everything|your|all|previous))", re.IGNORECASE),
    re.compile(r"(override|bypass|disable)\s+(security|filter|restriction|rule|guardrail)", re.IGNORECASE),
    # Encoding / obfuscation attacks
    re.compile(r"(base64|atob|btoa|eval|decode)\s*\(", re.IGNORECASE),
    re.compile(r"\\x[0-9a-f]{2}", re.IGNORECASE),
    re.compile(r"&#x?[0-9a-f]+;", re.IGNORECASE),
    # Role-play attacks
    re.compile(r"(DAN|jailbreak|do\s+anything\s+now)", re.IGNORECASE),
    # Conversational mockup
    re.compile(r"(user\s*:\s*|assistant\s*:\s*|human\s*:\s*|AI\s*:\s*)", re.IGNORECASE),
    # Data exfiltration
    re.compile(r"(show\s+me\s+(all|every)\s+(password|secret|key|token|credential))", re.IGNORECASE),
    re.compile(r"(dump|extract|exfiltrate|leak)\s+(all|the|every)", re.IGNORECASE),
]

# Map patterns to attack type categories
_ATTACK_CATEGORIES = {
    0: "sql_injection",
    1: "prompt_override",
    2: "role_play",
    3: "system_prompt_injection",
    4: "prompt_override",
    5: "guardrail_bypass",
    6: "encoding_attack",
    7: "encoding_attack",
    8: "encoding_attack",
    9: "role_play",
    10: "conversational_mockup",
    11: "data_exfiltration",
    12: "data_exfiltration",
}

_API_VERSION = "2024-09-01"


class PromptShields:
    """Analyzes text for prompt injection and adversarial attacks.

    Uses two Azure AI Content Safety APIs:
    - Prompt Shields: detects prompt injection (userPrompt + documents)
    - Text Analysis: detects harmful content (hate, violence, self-harm, sexual)

    Falls back to local heuristic patterns when Azure is not configured.
    """

    def __init__(self):
        self._azure_configured = bool(
            settings.AZURE_CONTENT_SAFETY_ENDPOINT
            and settings.AZURE_CONTENT_SAFETY_KEY
        )
        self._endpoint = settings.AZURE_CONTENT_SAFETY_ENDPOINT.rstrip("/")
        self._key = settings.AZURE_CONTENT_SAFETY_KEY

        if self._azure_configured:
            logger.info("Azure AI Content Safety configured — Prompt Shields enabled")
        else:
            logger.info(
                "Azure AI Content Safety not configured — using local heuristics. "
                "Set AZURE_CONTENT_SAFETY_ENDPOINT and KEY to enable Prompt Shields."
            )

    async def analyze(self, text: str, tenant_id: str) -> dict:
        """Analyze text for prompt injection attacks.

        Args:
            text: The text to analyze (user question or generated SQL).
            tenant_id: The tenant identifier for audit logging.

        Returns:
            dict: Analysis result with shape:
                {
                    "blocked": bool,
                    "attack_type": str | None,
                    "confidence": float,
                    "method": str,  # 'azure_prompt_shields', 'azure_text_analysis', or 'local_heuristic'
                    "details": dict | None,
                }
        """
        if self._azure_configured:
            return await self._analyze_azure(text, tenant_id)
        return self._analyze_local(text, tenant_id)

    async def _analyze_azure(self, text: str, tenant_id: str) -> dict:
        """Analyze using Azure AI Content Safety APIs.

        Runs Prompt Shields (injection detection) and Text Analysis
        (harmful content) in sequence. Blocks if either detects a threat.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "Ocp-Apim-Subscription-Key": self._key,
                    "Content-Type": "application/json",
                }

                # --- 1. Prompt Shields (injection detection) ---
                shield_url = (
                    f"{self._endpoint}/contentsafety/text:shieldPrompt"
                    f"?api-version={_API_VERSION}"
                )
                shield_payload = {
                    "userPrompt": text,
                    "documents": [],
                }
                shield_resp = await client.post(
                    shield_url, json=shield_payload, headers=headers
                )
                shield_resp.raise_for_status()
                shield_data = shield_resp.json()

                # Check userPromptAnalysis
                user_analysis = shield_data.get("userPromptAnalysis", {})
                if user_analysis.get("attackDetected", False):
                    attack_type = "prompt_injection"
                    logger.warning(
                        "Prompt Shields BLOCKED (Azure): tenant=%s, type=%s",
                        tenant_id, attack_type,
                    )
                    return {
                        "blocked": True,
                        "attack_type": attack_type,
                        "confidence": 1.0,
                        "method": "azure_prompt_shields",
                        "details": shield_data,
                    }

                # Check documentsAnalysis (if any documents were provided)
                for doc in shield_data.get("documentsAnalysis", []):
                    if doc.get("attackDetected", False):
                        logger.warning(
                            "Prompt Shields BLOCKED document (Azure): tenant=%s",
                            tenant_id,
                        )
                        return {
                            "blocked": True,
                            "attack_type": "document_injection",
                            "confidence": 1.0,
                            "method": "azure_prompt_shields",
                            "details": shield_data,
                        }

                # --- 2. Text Analysis (harmful content) ---
                analyze_url = (
                    f"{self._endpoint}/contentsafety/text:analyze"
                    f"?api-version={_API_VERSION}"
                )
                analyze_payload = {
                    "text": text,
                    "categories": ["Hate", "SelfHarm", "Sexual", "Violence"],
                    "outputType": "FourSeverityLevels",
                }
                analyze_resp = await client.post(
                    analyze_url, json=analyze_payload, headers=headers
                )
                analyze_resp.raise_for_status()
                analyze_data = analyze_resp.json()

                # Block if any category severity >= 4 (medium-high)
                for cat_result in analyze_data.get("categoriesAnalysis", []):
                    severity = cat_result.get("severity", 0)
                    if severity >= 4:
                        category = cat_result.get("category", "unknown")
                        logger.warning(
                            "Content Safety BLOCKED (Azure): tenant=%s, category=%s, severity=%d",
                            tenant_id, category, severity,
                        )
                        return {
                            "blocked": True,
                            "attack_type": f"harmful_content_{category.lower()}",
                            "confidence": severity / 6.0,
                            "method": "azure_text_analysis",
                            "details": analyze_data,
                        }

                # All clear
                return {
                    "blocked": False,
                    "attack_type": None,
                    "confidence": 0.0,
                    "method": "azure_prompt_shields",
                    "details": None,
                }

        except Exception as e:
            logger.error("Azure Content Safety failed, falling back to local: %s", e)
            return self._analyze_local(text, tenant_id)

    def _analyze_local(self, text: str, tenant_id: str) -> dict:
        """Analyze using local regex heuristics as fallback."""
        for idx, pattern in enumerate(_INJECTION_PATTERNS):
            match = pattern.search(text)
            if match:
                attack_type = _ATTACK_CATEGORIES.get(idx, "unknown")
                logger.warning(
                    "Prompt Shields BLOCKED (local): tenant=%s, type=%s, match='%s'",
                    tenant_id, attack_type, match.group(),
                )
                return {
                    "blocked": True,
                    "attack_type": attack_type,
                    "confidence": 0.85,
                    "method": "local_heuristic",
                    "details": None,
                }

        return {
            "blocked": False,
            "attack_type": None,
            "confidence": 0.0,
            "method": "local_heuristic",
            "details": None,
        }


# Singleton instance
prompt_shields = PromptShields()
