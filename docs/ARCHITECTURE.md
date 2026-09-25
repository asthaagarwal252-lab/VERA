# Architecture

React owns only session UI state and a local browser witness placeholder. The wallet connector discovers providers from the standard `window.midnight` namespace. The Compact contract holds public issuer/nullifier/aggregate state and accepts private witnesses. FastAPI serves public-policy composition, receipt validation, and aggregates using async SQLAlchemy. Neon is deployed branch-first: development is for integration and production is for finalized public records.

