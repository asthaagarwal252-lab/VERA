# Privacy model

The private circuit witness includes credential commitments, proof nonces, and eligibility attributes. Public ledger state contains issuer membership, used nullifier state, and aggregate verification count.

`disclose(eligible)` exists only to let a verifier grant or deny access. It does not reveal why the rule passed. Scope-bound nullifiers prevent reusing the same credential proof for the same verifier scope. No field is disclosed merely to make integration easier.

Backend receipt validation rejects labels associated with private data. Gemini receives sanitized public policy text only; raw policy text is not persisted where a hash suffices.

