import { afterEach, describe, expect, it } from 'vitest'
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import type { WalletProvider } from './types'
import { discoverWallets, preferredWallet } from './wallet'

const provider = (name: string): InitialAPI => ({ rdns: `test.${name.toLowerCase()}`, name, icon: '', apiVersion: '4.0.1', connect: async () => ({} as ConnectedAPI) })

describe('wallet discovery', () => {
  afterEach(() => { delete window.midnight })
  it('discovers UUID keyed providers', () => { window.midnight = { 'a-uuid': provider('Test wallet') }; expect(discoverWallets()[0].id).toBe('a-uuid') })
  it('prefers 1AM', () => { const wallets = [{ id: 'other', ...provider('Other') }, { id: '1am-id', ...provider('1AM Wallet') }] as WalletProvider[]; expect(preferredWallet(wallets)?.name).toBe('1AM Wallet') })
})
