import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts'
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'
import { fromHex, toHex, type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime'
import {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger'
import { createProofProvider, type MidnightProviders, type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types'
import type { Connection, Network, WalletProvider } from './types'
import { hexToBytes, type LocalWitness } from './private-state'
import { memoryPrivateStateProvider } from './memory-private-state'
import {
  compiledVeraContract,
  VERA_PRIVATE_STATE_ID,
  type VeraCircuitId,
  type VeraContract,
  type VeraPrivateState,
} from './vera-contract'

type VeraProviders = MidnightProviders<VeraCircuitId, typeof VERA_PRIVATE_STATE_ID, VeraPrivateState>
type VeraDeployment = FoundContract<VeraContract>

export type VeraSession = {
  contractAddress: string
  deploymentTransactionId?: string
  joinedExisting: boolean
}

type InternalSession = VeraSession & {
  contract: VeraDeployment
  providers: VeraProviders
}

const sessions = new WeakMap<ConnectedAPI, InternalSession>()
const contractStorageKey = (network: Network) => `vera.contract.${network}.${new Date().getUTCFullYear()}.v1`

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>
  }
}

export function discoverWallets(): WalletProvider[] {
  return Object.entries(window.midnight ?? {}).map(([id, provider]) => ({ id, ...provider }))
}

const isCompatible = (wallet: WalletProvider) => wallet.apiVersion.split('.')[0] === '4'

export function preferredWallet(wallets = discoverWallets()): WalletProvider | undefined {
  const compatible = wallets.filter(isCompatible)
  return compatible.find((wallet) => /1am/i.test(wallet.name) || /1am/i.test(wallet.id) || /1am/i.test(wallet.rdns)) ?? compatible[0]
}

export async function connectWallet(network: Network): Promise<Connection> {
  const provider = preferredWallet()
  if (!provider) {
    if (discoverWallets().length) throw new Error('Your wallet connector is not compatible with Midnight API v4. Update 1AM and reload this page.')
    throw new Error('1AM was not detected. Install or enable the extension, then reload this page.')
  }

  const api = await provider.connect(network)
  await api.hintUsage([
    'getConfiguration',
    'getDustBalance',
    'getShieldedAddresses',
    'getProvingProvider',
    'balanceUnsealedTransaction',
    'submitTransaction',
  ])
  const [dust, configuration] = await Promise.all([api.getDustBalance(), api.getConfiguration()])
  return { provider, api, network, dust, configuration }
}

const toPrivateState = (witness: LocalWitness): VeraPrivateState => ({
  credential: {
    issuerKey: hexToBytes(witness.issuerKey),
    birthYear: BigInt(witness.birthYear),
    currentlyEnrolled: witness.currentlyEnrolled,
    holderSecret: hexToBytes(witness.holderSecret),
    credentialNonce: hexToBytes(witness.credentialNonce),
  },
})

const initializeProviders = async (connection: Connection): Promise<VeraProviders> => {
  setNetworkId(connection.network)
  const privateStateProvider = memoryPrivateStateProvider<typeof VERA_PRIVATE_STATE_ID, VeraPrivateState>()
  const artifactBase = new URL(import.meta.env.VITE_PROOF_ARTIFACT_BASE_URL ?? '/artifacts', window.location.origin).toString()
  const zkConfigProvider = new FetchZkConfigProvider<VeraCircuitId>(artifactBase, fetch.bind(window))
  const publicDataProvider = indexerPublicDataProvider(connection.configuration.indexerUri, connection.configuration.indexerWsUri)
  const provingProvider = await connection.api.getProvingProvider(zkConfigProvider)
  const proofProvider = createProofProvider(provingProvider)
  const shieldedAddresses = await connection.api.getShieldedAddresses()

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const response = await connection.api.balanceUnsealedTransaction(toHex(tx.serialize()))
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(response.tx))
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connection.api.submitTransaction(toHex(tx.serialize()))
        const [transactionId] = tx.identifiers()
        if (!transactionId) throw new Error('The wallet submitted the transaction without returning an identifier.')
        return transactionId
      },
    },
  }
}

export async function prepareVeraContract(connection: Connection, witness: LocalWitness): Promise<VeraSession> {
  const cached = sessions.get(connection.api)
  if (cached) return cached

  const providers = await initializeProviders(connection)
  const initialPrivateState = toPrivateState(witness)
  const storedAddress = localStorage.getItem(contractStorageKey(connection.network)) as ContractAddress | null

  if (storedAddress) {
    try {
      providers.privateStateProvider.setContractAddress(storedAddress)
      const contract = await findDeployedContract<VeraContract>(providers, {
        contractAddress: storedAddress,
        compiledContract: compiledVeraContract,
        privateStateId: VERA_PRIVATE_STATE_ID,
        initialPrivateState,
      })
      const session: InternalSession = { contractAddress: storedAddress, joinedExisting: true, contract, providers }
      sessions.set(connection.api, session)
      return session
    } catch {
      localStorage.removeItem(contractStorageKey(connection.network))
    }
  }

  const deployed = await deployContract(providers, {
    compiledContract: compiledVeraContract,
    privateStateId: VERA_PRIVATE_STATE_ID,
    initialPrivateState,
    args: [hexToBytes(witness.issuerKey), 18n, BigInt(new Date().getUTCFullYear())],
  })
  const contractAddress = deployed.deployTxData.public.contractAddress
  providers.privateStateProvider.setContractAddress(contractAddress)
  localStorage.setItem(contractStorageKey(connection.network), contractAddress)
  const session: InternalSession = {
    contractAddress,
    deploymentTransactionId: deployed.deployTxData.public.txId,
    joinedExisting: false,
    contract: deployed,
    providers,
  }
  sessions.set(connection.api, session)
  return session
}

const scopeToBytes = async (scope: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope)))

export async function callProofCircuit(
  connection: Connection,
  witness: LocalWitness,
  scope: string,
  circuit: VeraCircuitId,
) {
  const session = sessions.get(connection.api)
  if (!session) throw new Error('Set up your proof station before requesting a proof.')

  session.providers.privateStateProvider.setContractAddress(session.contractAddress as ContractAddress)
  await session.providers.privateStateProvider.set(VERA_PRIVATE_STATE_ID, toPrivateState(witness))
  const verifierScope = await scopeToBytes(scope)
  const result = circuit === 'proveEnrollment'
    ? await session.contract.callTx.proveEnrollment(verifierScope)
    : await session.contract.callTx.proveEligibility(verifierScope)
  return {
    transactionId: result.public.txId,
    blockHeight: result.public.blockHeight,
    contractAddress: session.contractAddress,
  }
}

export function disconnectWallet(connection: Connection | null): void {
  if (connection) sessions.delete(connection.api)
}

export function getStoredContractAddress(network: Network): string | null {
  return localStorage.getItem(contractStorageKey(network))
}

export function friendlyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (normalized.includes('reject') || normalized.includes('permission')) return 'The wallet request was declined. Nothing was submitted.'
  if (normalized.includes('dust') || normalized.includes('insufficient') || normalized.includes('balance')) return 'Your wallet needs testnet NIGHT/DUST before it can pay for this transaction.'
  if (normalized.includes('prover') || normalized.includes('proof server') || normalized.includes('proving')) return 'The proving service is unavailable. Check 1AM’s network settings and try again.'
  if (normalized.includes('indexer') || normalized.includes('graphql') || normalized.includes('websocket')) return 'The Midnight indexer is unavailable. Your private credential is still safe on this device.'
  if (normalized.includes('already used') || normalized.includes('nullifier')) return 'This credential has already been used for this proof scope. Rotate the local credential or choose another proof type.'
  return message || 'The Midnight request could not be completed. No receipt was created.'
}
