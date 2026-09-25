import re

SENSITIVE_PATTERNS = [
    r"\b\d{8,}\b",
    r"\b(seed phrase|mnemonic|wallet address|student id|date of birth|passport|government id)\b",
]


def redact_public_input(text: str) -> str:
    cleaned = text
    for pattern in SENSITIVE_PATTERNS:
        cleaned = re.sub(pattern, "[REDACTED]", cleaned, flags=re.IGNORECASE)
    return cleaned


def local_plan(requirement: str) -> dict[str, object]:
    return {
        "summary": f"VERA will prove the published rule: {requirement}",
        "disclosed": ["A pass/fail eligibility outcome", "A scope-bound anti-replay marker"],
        "private": ["Student identifier", "Date of birth", "Credential commitment", "Secret nonce"],
        "caution": "Do not paste a credential, document, wallet address, or secret into this panel.",
        "source": "deterministic-local-fallback",
    }
