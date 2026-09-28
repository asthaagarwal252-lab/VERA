# Contract notes

`VERAEligibility` exposes only its public policy, proof outcome, a scope-bound nullifier set, and an aggregate counter. It deliberately does **not** disclose the birth year, enrollment flag, holder secret, credential nonce, or wallet identifier.

`disclose(true)` is justified because the relying party must know that the private checks succeeded. Constructor `disclose()` calls intentionally publish the policy parameters. The source is pinned to Compact language 0.23 and generated with toolchain 0.31.1 for the Midnight.js 4.1.x / ledger-v8 stack. Generated bindings live under `contracts/managed/vera`; browser proof material is copied to `public/artifacts/`.
