const KEY = 'vera.local.credential.v2'

export const TRUSTED_ISSUER_HEX = 'c11e9f2d65f50958c609d162c46048c95c615a4bbe8c776440997f456b1f3f0b'

export type LocalWitness = {
  issuerKey: string
  birthYear: number
  currentlyEnrolled: boolean
  holderSecret: string
  credentialNonce: string
  createdAt: string
}

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
const randomHex = () => bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
const isHex32 = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)

export function createWitness(): LocalWitness {
  return {
    issuerKey: TRUSTED_ISSUER_HEX,
    birthYear: new Date().getUTCFullYear() - 20,
    currentlyEnrolled: true,
    holderSecret: randomHex(),
    credentialNonce: randomHex(),
    createdAt: new Date().toISOString(),
  }
}

export function loadWitness(): LocalWitness | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LocalWitness>
    if (!isHex32(value.holderSecret) || !isHex32(value.credentialNonce) || !isHex32(value.issuerKey)) return null
    if (!Number.isInteger(value.birthYear) || value.birthYear! < 1900 || value.birthYear! > new Date().getUTCFullYear()) return null
    if (typeof value.currentlyEnrolled !== 'boolean' || typeof value.createdAt !== 'string') return null
    return value as LocalWitness
  } catch {
    return null
  }
}

export function saveWitness(witness: LocalWitness): void {
  localStorage.setItem(KEY, JSON.stringify(witness))
}

export function updateWitness(current: LocalWitness, update: Pick<LocalWitness, 'birthYear' | 'currentlyEnrolled'>): LocalWitness {
  const witness = { ...current, ...update }
  saveWitness(witness)
  return witness
}

export function rotateWitness(): LocalWitness {
  const witness = createWitness()
  saveWitness(witness)
  return witness
}

export function hexToBytes(value: string): Uint8Array {
  if (!isHex32(value)) throw new Error('Expected a 32-byte hexadecimal value.')
  return Uint8Array.from(value.match(/.{2}/g)!, (pair) => Number.parseInt(pair, 16))
}
