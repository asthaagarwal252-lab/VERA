# Production deployment checklist

## Neon / Lakebase Postgres

1. Create `development` and `production` branches. Test every Alembic migration against a branch cloned from production before promoting it.
2. Set `DATABASE_URL` to the pooled `-pooler` endpoint for Vercel runtime traffic.
3. Set `DATABASE_DIRECT_URL` to the unpooled endpoint and use it only to run Alembic. Do not use a pooler URL for migrations.
4. Apply revisions through `0002_receipt_timestamp` before setting `ENVIRONMENT=production`.

## Vercel

1. Import the repository at its root. The project builds Vite into `dist` and detects `api/index.py` as the FastAPI function.
2. Add the production values for `ENVIRONMENT`, `ALLOWED_HOSTS`, `CORS_ORIGINS`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`.
3. Set `VITE_API_BASE_URL=/api`; use a real contract address and artifact base URL only after deploying verified Compact artifacts.
4. Verify `GET /api/health` returns `status: ok` and `database: reachable` before exposing the app.

## Operational acceptance

- Check Vercel function logs for unhandled errors; never add request-body logging.
- Confirm the host/security headers and public-only receipt validation with an external scan.
- Configure Vercel firewall/rate-limit rules for `/api/v1/proof-plan` and `/api/v1/receipts`.
- Restore-test the Neon branch/backup strategy before collecting production receipts.

