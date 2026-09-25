import os
from time import time_ns
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_vera_v2.db"
from fastapi.testclient import TestClient
from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.json()["status"] == "ok"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-request-id"]


def test_metrics_do_not_expose_private_records():
    with TestClient(app) as client:
        assert client.get("/v1/metrics").json()["private_records_stored"] == 0


def test_gemini_endpoint_uses_safe_fallback():
    with TestClient(app) as client:
        body = client.post("/v1/proof-plan", json={"public_requirement": "Must be actively enrolled for access."}).json()
        assert body["source"] == "deterministic-local-fallback"
        assert "Student identifier" in body["private"]


def test_sensitive_policy_input_is_rejected():
    with TestClient(app) as client:
        response = client.post("/v1/proof-plan", json={"public_requirement": "student id 12345678"})
        assert response.status_code == 422


def test_vercel_api_prefix_matches_public_api():
    with TestClient(app) as client:
        assert client.get("/api/health").json()["service"] == "vera-api"


def test_public_receipt_is_validated():
    with TestClient(app) as client:
        response = client.post("/v1/receipts", json={"transaction_id": f"real-transaction-{time_ns()}", "outcome": True, "disclosure_scope": "night-lab", "requirement_hash": "a" * 64})
        assert response.status_code == 201
        assert response.json()["created_at"]


def test_private_field_in_receipt_is_rejected():
    with TestClient(app) as client:
        response = client.post("/v1/receipts", json={"transaction_id": "secret-transaction", "outcome": True, "disclosure_scope": "night-lab", "requirement_hash": "a" * 64})
        assert response.status_code == 422
