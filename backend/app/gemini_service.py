import json

from google import genai
from google.genai import types

from .privacy import local_plan
from .schemas import ProofPlan
from .settings import settings

SYSTEM_INSTRUCTION = """You explain a PUBLIC eligibility policy for a privacy proof.
Never request, infer, or include personal data, credentials, identifiers, wallet addresses,
documents, dates of birth, witnesses, seeds, or secrets. Return JSON only with summary,
disclosed, private, caution. The public verifier learns only a yes/no result and a scoped
anti-replay marker."""


async def compose_plan(public_requirement: str) -> ProofPlan:
    if not settings.gemini_api_key:
        return ProofPlan.model_validate(local_plan(public_requirement))
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=public_requirement,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
            ),
        )
        parsed = json.loads(response.text or "{}")
        parsed["source"] = "gemini-public-policy-only"
        return ProofPlan.model_validate(parsed)
    except Exception:
        return ProofPlan.model_validate(local_plan(public_requirement))

