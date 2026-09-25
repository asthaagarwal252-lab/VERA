import type { Connection, Network, WalletProvider } from './types'

declare global { interface Window { midnight?: Record<string, Omit<WalletProvider, 'id'>>; veraCompact?: { proveEligibility: (api: unknown, input: unknown) => Promise<{ transactionId: string }> } } }

export function discoverWallets(): WalletProvider[] {
  return Object.entries(window.midnight ?? {}).map(([id, provider]) => ({ id, ...provider }))
}

export function preferredWallet(wallets = discoverWallets()): WalletProvider | undefined {
  return wallets.find((wallet) => /1am/i.test(wallet.name) || /1am/i.test(wallet.id)) ?? wallets[0]
}

export async function connectWallet(network: Network): Promise<Connection> {
  const provider = preferredWallet()
  if (!provider) throw new Error('A 1AM wallet is not available in this browser.')
  const api = await provider.connect(network)
  const dustRaw = await (api as { getDustBalance?: () => Promise<unknown> }).getDustBalance?.()
  return { provider, api, network, dust: dustRaw === undefined ? undefined : String(dustRaw) }
}

export async function callEligibilityCircuit(connection: Connection, localWitness: { commitment: string; nonce: string }, scope: string) {
  if (!window.veraCompact) throw new Error('The compiled VERA browser artifacts are not installed. No transaction was submitted.')
  return window.veraCompact.proveEligibility(connection.api, { credentialCommitment: localWitness.commitment, secretNonce: localWitness.nonce, verifierScope: scope })
}
