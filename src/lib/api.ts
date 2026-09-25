import type { ProofPlan, PublicMetrics, ServiceHealth } from './types'
const base = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error('The public VERA service is temporarily unavailable. Your local record was not sent.')
  return response.json() as Promise<T>
}

export async function getProofPlan(publicRequirement: string): Promise<ProofPlan> {
  return request<ProofPlan>('/v1/proof-plan', { method: 'POST', body: JSON.stringify({ public_requirement: publicRequirement }) })
}

export async function getMetrics(): Promise<PublicMetrics> { return request<PublicMetrics>('/v1/metrics') }
export async function getHealth(): Promise<ServiceHealth> { return request<ServiceHealth>('/health') }

export async function saveReceipt(transactionId: string, disclosureScope: string, requirement: string): Promise<void> {
  const bytes = new TextEncoder().encode(requirement)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const requirementHash = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  await request('/v1/receipts', { method: 'POST', body: JSON.stringify({ transaction_id: transactionId, outcome: true, disclosure_scope: disclosureScope, requirement_hash: requirementHash }) })
}
