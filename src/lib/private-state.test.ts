import { beforeEach, describe, expect, it } from 'vitest'
import { loadWitness, rotateWitness, saveWitness } from './private-state'

describe('local private state', () => {
  beforeEach(() => localStorage.clear())
  it('persists only on this device', () => { const witness = rotateWitness(); expect(loadWitness()).toEqual(witness) })
  it('replaces material on rotation', () => { const first = rotateWitness(); const next = rotateWitness(); expect(next.nonce).not.toBe(first.nonce) })
  it('loads a saved local witness', () => { const witness = { commitment: 'a', nonce: 'b', createdAt: 'now' }; saveWitness(witness); expect(loadWitness()).toEqual(witness) })
})

