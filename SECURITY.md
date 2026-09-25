# Security policy

## Reporting

Do not open a public issue for a vulnerability involving credentials, private witnesses, proof bypasses, receipt forgery, or data exposure. Contact the repository maintainer privately with a minimal reproduction and allow time for remediation before disclosure.

## Privacy invariants

- Never log, persist, transmit, or render a private witness, credential, student identifier, seed phrase, document, or wallet address.
- A public receipt contains only a finalized transaction ID, pass/fail outcome, scope, public-policy hash, and timestamp.
- Gemini receives only redacted public policy text. It has no wallet, credential, or document access.
- The Compact circuit is the authority for eligibility; backend responses never replace a network proof.

## Production controls

- Set `ENVIRONMENT=production`, a precise `ALLOWED_HOSTS` list, and exact HTTPS `CORS_ORIGINS` values.
- Use a pooled Lakebase Postgres/Neon URL for API traffic and an unpooled direct URL only for Alembic migrations.
- Run migrations before deployment. Production deliberately does not create database tables at application start.
- Keep Vercel, Neon, Gemini, and wallet secrets in provider-managed environment variables only.
- Configure an edge-level rate limit/WAF. The in-process limiter protects a single function instance but is not a distributed control.

