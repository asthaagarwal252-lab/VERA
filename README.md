# VERA — Student Proof Station

[![CI](https://github.com/OWNER/vera/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

VERA lets a student prove a campus-access rule without transmitting the source record. The MVP demonstrates a scope-bound eligibility proof for the Campus Night Lab: the verifier learns only an eligible/not-eligible outcome and a replay-safe marker.

## Why Midnight

Campus services often ask students to upload identity documents for simple eligibility decisions. Midnight is essential here: the Compact circuit evaluates private credential facts and selectively discloses the outcome, rather than moving the credential into a conventional database.

## Architecture

```text
Student browser ─ local witness + generated Compact artifacts ── 1AM wallet
      │ public policy only                                      │
      └────────────── FastAPI / Gemini boundary ── Neon public receipts
                                                              Midnight network
```

The frontend discovers UUID-keyed providers on `window.midnight`, prefers 1AM, requests the chosen Preview or Preprod network, and resets the session when the network changes. It will not display a transaction as real until the generated contract adapter returns a finalized result.

## Privacy model

| An observer can learn | An observer cannot learn |
| --- | --- |
| Eligibility pass/fail, public policy scope, finalized transaction ID, aggregate counts | Student number, DOB, credential, issuer signature, nonce, wallet address, private witness, document |

Gemini receives a redacted public requirement only. The API uses structured Pydantic output, rejects obvious sensitive fields, hashes public requirements for receipts, and falls back deterministically without an API key. Neon stores only public receipt metadata; `DATABASE_URL` is the pooled URL and `DATABASE_DIRECT_URL` is reserved for migrations.

## Local setup

Prerequisites: Node 22+, Python 3.11+, `uv`, Docker (optional), a 1AM-compatible wallet, and a supported Compact compiler for your target network.

```bash
cp .env.example .env
npm ci
npm run dev
uv venv backend/.venv
uv pip install --python backend/.venv/Scripts/python.exe -e "backend[dev]"
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload
```

On macOS/Linux use `backend/.venv/bin/python` instead. API docs appear at `http://localhost:8000/docs` in development.

## Midnight deployment

1. Compile `contracts/vera.compact` with the Compact compiler version supported by the selected Preview/Preprod release.
2. Commit only generated browser artifacts needed for proving into `public/artifacts/`; never commit a witness, wallet secret, or user credential.
3. Generate a typed browser adapter that calls `prove_eligibility` and exposes it as `window.veraCompact.proveEligibility` (the UI refuses to fabricate this call when missing).
4. Install 1AM, select Preview or Preprod, fund DUST, then connect. Follow wallet-provided node/indexer/prover configuration.

For a local proof-server topology after artifacts exist:

```bash
docker compose -f docker-compose.prover.yml up
```

## Gemini and Neon

Set `GEMINI_API_KEY` server-side only. VERA uses the official `google-genai` SDK and never forwards local witness data. Create Neon `development` and `production` branches; use pooled traffic URL in `DATABASE_URL` and direct migration URL in `DATABASE_DIRECT_URL`. Run Alembic with the direct URL injected in production.

## Verification

```bash
node scripts/validate-contract.mjs
npm run lint
npm test
npm run build
backend/.venv/Scripts/python.exe -m ruff check backend
backend/.venv/Scripts/python.exe -m pytest backend/tests
```

## Delivery

CI compiles the app, validates Compact privacy markers, lints, tests, builds, and deploys `main` to GitHub Pages when repository Pages is configured. `render.yaml` remains available for a standalone FastAPI host.

## Deploy both services on Vercel

This repository now supports one Vercel project: Vite is served from `dist` and the FastAPI service is exposed at `/api/*` through `api/index.py`. The Python function is configured to exclude tests and local environments from its bundle.

1. Push this repository to GitHub, then import it at [Vercel](https://vercel.com/new).
2. Keep the root directory as the repository root. Vercel uses `npm run build`, publishes `dist`, and detects the Python `api/index.py` entrypoint.
3. Add `DATABASE_URL`, `DATABASE_DIRECT_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL` as server-side Vercel environment variables. Set `VITE_API_BASE_URL=/api` for production (or leave it unset; this is the production default).
4. Run the Alembic migration against the Neon direct URL before production traffic, then deploy. Use `vercel dev` to emulate the combined deployment locally.

Run the migration from the repository root after installing the backend dependencies. The migration runner automatically converts the async runtime URL to its synchronous migration driver and always prefers `DATABASE_DIRECT_URL`:

```powershell
$env:DATABASE_DIRECT_URL = "postgresql+asyncpg://...your-unpooled-neon-url..."
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
```

The Vercel runtime must use the pooled `DATABASE_URL`; do not run migrations from a serverless request.

Vercel’s current FastAPI guidance recognises an exported `app` in `api/index.py`, and its Python runtime documentation notes the 500 MB function-bundle ceiling; the supplied exclusions keep the function focused on runtime code. [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Python runtime](https://vercel.com/docs/functions/runtimes/python).

For the exact Neon branch, direct-vs-pooled connection, Vercel environment, health-check, and operational acceptance sequence, follow [the production deployment checklist](docs/PRODUCTION_DEPLOYMENT.md). VERA applies public API security headers, narrow CORS methods/headers, host allowlisting, request IDs, response compression, safe validation errors, and a per-instance request limiter. These controls complement—not replace—Vercel firewall/WAF and provider-level monitoring.

Live demo: not deployed. Repository URL: not connected to a remote.

Known limitations: generated Compact artifacts, a deployed contract address, a proof server, live Preview/Preprod setup, a Neon project, and Gemini key are intentionally absent because they require external credentials and network deployment authority.
