import { existsSync, readFileSync, statSync } from 'node:fs'
const source = readFileSync(new URL('../contracts/vera.compact', import.meta.url), 'utf8')
const requirements = [
  'pragma language_version 0.23',
  'witness localCredential()',
  'ledger usedNullifiers: Set<Bytes<32>>',
  'ledger verifiedCount: Counter',
  'circuit proveEligibility',
  'circuit proveEnrollment',
  'disclose(nullifier)',
  'usedNullifiers.insert',
  'verifiedCount.increment',
  'return disclose(true)',
]
const missing = requirements.filter((item) => !source.includes(item))
if (missing.length) throw new Error(`Contract privacy validation failed: ${missing.join(', ')}`)

const artifacts = [
  '../contracts/managed/vera/contract/index.js',
  '../public/artifacts/keys/proveEligibility.prover',
  '../public/artifacts/keys/proveEligibility.verifier',
  '../public/artifacts/zkir/proveEligibility.zkir',
  '../public/artifacts/keys/proveEnrollment.prover',
  '../public/artifacts/keys/proveEnrollment.verifier',
  '../public/artifacts/zkir/proveEnrollment.zkir',
]
for (const artifact of artifacts) {
  const url = new URL(artifact, import.meta.url)
  if (!existsSync(url) || statSync(url).size === 0) throw new Error(`Missing generated Compact artifact: ${artifact}`)
}

console.log('VERA Compact source and generated-artifact validation passed.')
