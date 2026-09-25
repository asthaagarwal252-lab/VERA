import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('../contracts/vera.compact', import.meta.url), 'utf8')
const requirements = ['ledger issuers', 'ledger used_nullifiers', 'private credential_commitment', 'circuit prove_eligibility', 'circuit prove_enrollment', 'disclose(eligible)', 'used_nullifiers.insert', 'verified_count.increment']
const missing = requirements.filter((item) => !source.includes(item))
if (missing.length) throw new Error(`Contract privacy validation failed: ${missing.join(', ')}`)
console.log('VERA Compact privacy-boundary validation passed.')

