from hashlib import sha256
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

PRIVATE_FIELDS = {"birth_year", "student_id", "credential", "seed", "secret", "witness", "document"}


class PolicyRequest(BaseModel):
    public_requirement: str = Field(min_length=8, max_length=1000)

    @field_validator("public_requirement")
    @classmethod
    def reject_sensitive_labels(cls, value: str) -> str:
        normalized = value.lower().replace(" ", "_")
        if any(field in normalized for field in PRIVATE_FIELDS):
            raise ValueError("Send public policy text only; private credential fields are not accepted.")
        return value

    @property
    def requirement_hash(self) -> str:
        return sha256(self.public_requirement.encode()).hexdigest()


class ProofPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str
    disclosed: list[str]
    private: list[str]
    caution: str
    source: str


class ReceiptCreate(BaseModel):
    transaction_id: str = Field(min_length=8, max_length=180, pattern=r"^[A-Za-z0-9_.:-]+$")
    outcome: bool
    disclosure_scope: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9-]+$")
    requirement_hash: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("transaction_id", "disclosure_scope", "requirement_hash")
    @classmethod
    def public_fields_only(cls, value: str) -> str:
        lower = value.lower()
        if any(field in lower for field in PRIVATE_FIELDS):
            raise ValueError("Receipt payload includes a prohibited private field.")
        return value


class ReceiptRead(ReceiptCreate):
    id: int
    created_at: datetime
