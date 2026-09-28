import type { Configuration, ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'

export type Network = 'preview' | 'preprod'
export type ProofStage = 'idle' | 'review' | 'connecting' | 'deploying' | 'proving' | 'finalizing' | 'success' | 'error'
export type WalletProvider = InitialAPI & { id: string }
export type Connection = {
  provider: WalletProvider
  api: ConnectedAPI
  network: Network
  dust: { balance: bigint; cap: bigint }
  configuration: Configuration
}
export type ProofPlan = { summary: string; disclosed: string[]; private: string[]; caution: string; source: string }
export type PublicMetrics = { verified_proofs: number; successful_proofs: number; private_records_stored: number }
export type ServiceHealth = { service: string; status: 'ok' | 'degraded'; database: string }
