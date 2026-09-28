import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js'
import type { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime'
import {
  Contract as GeneratedVeraContract,
  type Ledger,
  type StudentCredential,
} from '../../contracts/managed/vera/contract/index.js'

export const VERA_PRIVATE_STATE_ID = 'veraCredential'
export type VeraCircuitId = 'proveEligibility' | 'proveEnrollment'
export type VeraPrivateState = { readonly credential: StudentCredential }
export type VeraContract = GeneratedVeraContract<VeraPrivateState>

const witnesses = {
  localCredential({ privateState }: WitnessContext<Ledger, VeraPrivateState>): [VeraPrivateState, StudentCredential] {
    return [privateState, privateState.credential]
  },
}

export const compiledVeraContract = CompiledContract.make<VeraContract>('VERAEligibility', GeneratedVeraContract<VeraPrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('artifacts'),
)
