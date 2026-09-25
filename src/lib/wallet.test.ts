import { afterEach, describe, expect, it } from 'vitest'
import { discoverWallets, preferredWallet } from './wallet'

describe('wallet discovery', () => {
  afterEach(() => { delete window.midnight })
  it('discovers UUID keyed providers', () => { window.midnight = { 'a-uuid': { name: 'Test wallet', apiVersion: '4.0.1', connect: async () => ({}) } }; expect(discoverWallets()[0].id).toBe('a-uuid') })
  it('prefers 1AM', () => { const wallets = [{ id: 'other', name: 'Other', apiVersion: '4', connect: async () => ({}) }, { id: '1am-id', name: '1AM Wallet', apiVersion: '4', connect: async () => ({}) }]; expect(preferredWallet(wallets)?.name).toBe('1AM Wallet') })
})

