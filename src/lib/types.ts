export type Network = 'preview' | 'preprod'
export type ProofStage = 'idle' | 'review' | 'connecting' | 'proving' | 'finalizing' | 'success' | 'error'
export type WalletProvider = { id: string; name: string; apiVersion: string; icon?: string; connect: (network: string) => Promise<unknown> }
export type Connection = { provider: WalletProvider; api: unknown; network: Network; dust?: string }
export type ProofPlan = { summary: string; disclosed: string[]; private: string[]; caution: string; source: string }
export type PublicMetrics = { verified_proofs: number; successful_proofs: number; private_records_stored: number }
export type ServiceHealth = { service: string; status: 'ok' | 'degraded'; database: string }
