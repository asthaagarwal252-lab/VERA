import { beforeEach, describe, expect, it } from 'vitest'
import { createWitness, loadWitness, rotateWitness, saveWitness } from './private-state'

describe('local private state', () => {
  beforeEach(() => localStorage.clear())
  it('persists only on this device', () => { const witness = rotateWitness(); expect(loadWitness()).toEqual(witness) })
  it('replaces material on rotation', () => { const first = rotateWitness(); const next = rotateWitness(); expect(next.credentialNonce).not.toBe(first.credentialNonce) })
  it('loads a saved local witness', () => { const witness = createWitness(); saveWitness(witness); expect(loadWitness()).toEqual(witness) })
})
