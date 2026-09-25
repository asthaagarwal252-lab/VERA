const KEY = 'vera.local.witness.v1'
export type LocalWitness = { commitment: string; nonce: string; createdAt: string }

export function createWitness(): LocalWitness {
  const part = () => crypto.getRandomValues(new Uint32Array(4)).join('-')
  return { commitment: `local-${part()}`, nonce: `nonce-${part()}`, createdAt: new Date().toISOString() }
}
export function loadWitness(): LocalWitness | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as LocalWitness : null } catch { return null }
}
export function saveWitness(witness: LocalWitness): void { localStorage.setItem(KEY, JSON.stringify(witness)) }
export function rotateWitness(): LocalWitness { const witness = createWitness(); saveWitness(witness); return witness }

