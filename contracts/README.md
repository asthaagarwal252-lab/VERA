# Contract notes

`VERAEligibility` exposes only issuer membership, proof outcome, a scope-bound nullifier state, and an aggregate counter. It deliberately does **not** disclose the credential commitment, birth year, issuer signature, secret nonce, student number, or wallet identifier.

`disclose(eligible)` is justified because the relying party must know whether access can be granted. `disclose(true)` in `prove_enrollment` likewise reveals only success, never the enrolled attribute itself. A deployment must compile this source with a toolchain version compatible with the chosen Preview/Preprod environment and commit the resulting browser artifacts under `public/artifacts/`.

