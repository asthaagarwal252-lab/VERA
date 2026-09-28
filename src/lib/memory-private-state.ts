import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime'
import type {
  ImportPrivateStatesResult,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types'

/**
 * Session-only storage for circuit private state and contract maintenance keys.
 * The student's credential is persisted separately in localStorage, but these
 * highly sensitive runtime values intentionally disappear when the tab closes.
 */
export function memoryPrivateStateProvider<PSI extends PrivateStateId, PS>(): PrivateStateProvider<PSI, PS> {
  const privateStates = new Map<ContractAddress, Map<PSI, PS>>()
  const signingKeys = new Map<ContractAddress, SigningKey>()
  let activeContract: ContractAddress | null = null

  const requireContract = () => {
    if (!activeContract) throw new Error('The contract session has not been initialized.')
    return activeContract
  }
  const scopedStates = (address: ContractAddress) => {
    const existing = privateStates.get(address)
    if (existing) return existing
    const created = new Map<PSI, PS>()
    privateStates.set(address, created)
    return created
  }
  const unsupported = (): never => {
    throw new Error('Exporting runtime private state is disabled in the browser for safety.')
  }

  return {
    setContractAddress(address) { activeContract = address },
    async set(key, state) { scopedStates(requireContract()).set(key, state) },
    async get(key) { return scopedStates(requireContract()).get(key) ?? null },
    async remove(key) { scopedStates(requireContract()).delete(key) },
    async clear() { privateStates.delete(requireContract()) },
    async setSigningKey(address, key) { signingKeys.set(address, key) },
    async getSigningKey(address) { return signingKeys.get(address) ?? null },
    async removeSigningKey(address) { signingKeys.delete(address) },
    async clearSigningKeys() { signingKeys.clear() },
    async exportPrivateStates(): Promise<PrivateStateExport> { return unsupported() },
    async importPrivateStates(): Promise<ImportPrivateStatesResult> { return unsupported() },
    async exportSigningKeys(): Promise<SigningKeyExport> { return unsupported() },
    async importSigningKeys(): Promise<ImportSigningKeysResult> { return unsupported() },
  }
}
