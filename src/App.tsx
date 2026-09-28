import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  FlaskConical,
  LockKeyhole,
  LogOut,
  Orbit,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getHealth, getMetrics, getProofPlan, saveReceipt } from './lib/api'
import {
  createWitness,
  loadWitness,
  rotateWitness,
  saveWitness,
  updateWitness,
  type LocalWitness,
} from './lib/private-state'
import type { Connection, Network, ProofPlan, ProofStage, PublicMetrics, ServiceHealth } from './lib/types'
import {
  callProofCircuit,
  connectWallet,
  disconnectWallet,
  discoverWallets,
  friendlyWalletError,
  getStoredContractAddress,
  prepareVeraContract,
  type VeraSession,
} from './lib/wallet'

type ProofType = 'eligibility' | 'enrollment'

const proofModes: Record<ProofType, {
  label: string
  action: string
  circuit: 'proveEligibility' | 'proveEnrollment'
  scope: string
  policy: string
  fallbackPlan: ProofPlan
}> = {
  eligibility: {
    label: 'Night Lab eligibility',
    action: 'eligibility',
    circuit: 'proveEligibility',
    scope: 'campus-night-lab',
    policy: 'Currently enrolled students aged 18 or over may access the campus night lab.',
    fallbackPlan: {
      summary: 'This proof checks current enrolment and age eligibility without sending either source record to a verifier.',
      disclosed: ['Eligible: yes', 'Campus Night Lab scope', 'Replay-resistant receipt marker'],
      private: ['Birth year', 'Enrollment status', 'Credential secret', 'Credential nonce'],
      caution: 'Only the public policy was analyzed. Your local credential never leaves this browser.',
      source: 'local-policy-engine',
    },
  },
  enrollment: {
    label: 'Current enrollment',
    action: 'enrollment',
    circuit: 'proveEnrollment',
    scope: 'campus-current-enrollment',
    policy: 'Currently enrolled students may prove active student status without disclosing age or source records.',
    fallbackPlan: {
      summary: 'This proof checks current enrollment without sending the source record or unrelated age data to a verifier.',
      disclosed: ['Enrolled: yes', 'Current enrollment scope', 'Replay-resistant receipt marker'],
      private: ['Enrollment status', 'Birth year', 'Credential secret', 'Credential nonce'],
      caution: 'Only the public policy was analyzed. Your local credential never leaves this browser.',
      source: 'local-policy-engine',
    },
  },
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'safe' | 'public' | 'pending' }) {
  return <span className={`tag ${tone}`}>{children}</span>
}

function scrollToProof() {
  document.querySelector('#proof-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function shortId(value: string) {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value
}

export function App() {
  const reduceMotion = useReducedMotion()
  const configuredNetwork: Network = import.meta.env.VITE_DEFAULT_NETWORK === 'preprod' ? 'preprod' : 'preview'
  const [network, setNetwork] = useState<Network>(configuredNetwork)
  const [proofType, setProofType] = useState<ProofType>('eligibility')
  const [witness, setWitness] = useState<LocalWitness | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [contractSession, setContractSession] = useState<VeraSession | null>(null)
  const [stage, setStage] = useState<ProofStage>('idle')
  const [plan, setPlan] = useState<ProofPlan | null>(null)
  const [message, setMessage] = useState('Review the rule and your local credential, then connect 1AM to begin.')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [blockHeight, setBlockHeight] = useState<number | null>(null)
  const [metrics, setMetrics] = useState<PublicMetrics>({ verified_proofs: 0, successful_proofs: 0, private_records_stored: 0 })
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [walletCount, setWalletCount] = useState(0)
  const canSetUp = Boolean(connection && witness && plan)
  const canProve = Boolean(connection && witness && contractSession && plan)
  const stageIndex = receipt ? 5 : !witness ? 0 : !plan ? 1 : !connection ? 2 : !contractSession ? 3 : 4
  const stages = useMemo(() => ['Credential', 'Boundary', 'Wallet', 'Contract', 'Proof'], [])
  const modeLabel = receipt ? 'Finalized' : contractSession && plan ? 'Proof ready' : connection ? 'Wallet connected' : 'Setup required'
  const selectedProof = proofModes[proofType]

  useEffect(() => {
    const stored = loadWitness()
    const next = stored ?? createWitness()
    if (!stored) saveWitness(next)
    setWitness(next)
    setWalletCount(discoverWallets().length)
  }, [])

  useEffect(() => {
    let active = true
    const refreshPublicState = async () => {
      try {
        const [nextMetrics, nextHealth] = await Promise.all([getMetrics(), getHealth()])
        if (active) {
          setMetrics(nextMetrics)
          setServiceHealth(nextHealth)
        }
      } catch {
        if (active) setServiceHealth({ service: 'vera-api', status: 'degraded', database: 'unavailable-locally' })
      }
    }
    void refreshPublicState()
    const interval = window.setInterval(() => void refreshPublicState(), 30_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const loadPlan = async () => {
    setStage('review')
    try {
      setPlan(await getProofPlan(selectedProof.policy))
      setMessage('Boundary reviewed. Only the public access rule was sent for explanation.')
    } catch {
      setPlan(selectedProof.fallbackPlan)
      setMessage('Boundary reviewed locally. Your private credential was not sent anywhere.')
    }
  }

  const connect = async () => {
    setStage('connecting')
    setMessage(`Waiting for 1AM approval on ${network}…`)
    try {
      const nextConnection = await connectWallet(network)
      setConnection(nextConnection)
      setWalletCount(discoverWallets().length)
      setStage('review')
      setMessage(`${nextConnection.provider.name} connected. Next, set up your VERA contract on ${network}.`)
    } catch (error) {
      setStage('error')
      setMessage(friendlyWalletError(error))
    }
  }

  const setupContract = async () => {
    if (!connection || !witness) return
    setStage('deploying')
    setMessage(getStoredContractAddress(network) ? 'Rejoining your existing VERA contract…' : 'Preparing your VERA contract. 1AM will ask you to approve deployment…')
    try {
      const session = await prepareVeraContract(connection, witness)
      setContractSession(session)
      setStage('review')
      setMessage(session.joinedExisting ? 'Your existing contract is ready. You can now request a proof.' : 'Contract finalized. Your address was generated and saved for this network.')
    } catch (error) {
      setStage('error')
      setMessage(friendlyWalletError(error))
    }
  }

  const prove = async () => {
    if (!connection || !witness || !contractSession) {
      setStage('error')
      setMessage('Complete the credential, wallet, and contract steps before requesting a proof.')
      return
    }
    setStage('proving')
    setMessage('1AM is generating the zero-knowledge proof. Keep this tab open…')
    try {
      const result = await callProofCircuit(connection, witness, selectedProof.scope, selectedProof.circuit)
      setStage('finalizing')
      setMessage('The transaction was submitted. Waiting for Midnight finalization…')
      setReceipt(result.transactionId)
      setBlockHeight(result.blockHeight)
      try {
        await saveReceipt(result.transactionId, selectedProof.scope, selectedProof.policy)
        setMessage('Proof finalized. The public receipt contains no private credential fields.')
      } catch {
        setMessage('Proof finalized on Midnight. The optional public metrics service is currently unavailable.')
      }
      setStage('success')
      try {
        setMetrics(await getMetrics())
      } catch {
        // The on-chain receipt remains valid even when the public metrics API is offline.
      }
    } catch (error) {
      setStage('error')
      setMessage(friendlyWalletError(error))
    }
  }

  const disconnect = () => {
    disconnectWallet(connection)
    setConnection(null)
    setContractSession(null)
    setStage('idle')
    setMessage('Wallet disconnected from this tab. Your local credential and saved contract address remain on this device.')
  }

  const switchNetwork = (value: Network) => {
    disconnectWallet(connection)
    setNetwork(value)
    setConnection(null)
    setContractSession(null)
    setReceipt(null)
    setBlockHeight(null)
    setStage('idle')
    setMessage('Network changed. Wallet session reset; your local record remains on this device.')
  }

  const selectProofType = (value: ProofType) => {
    setProofType(value)
    setPlan(null)
    setReceipt(null)
    setBlockHeight(null)
    setStage('idle')
    setMessage(`Selected ${proofModes[value].label}. Review its disclosure boundary before requesting the proof.`)
  }

  const updateLocalCredential = (update: Partial<Pick<LocalWitness, 'birthYear' | 'currentlyEnrolled'>>) => {
    if (!witness) return
    const next = updateWitness(witness, {
      birthYear: update.birthYear ?? witness.birthYear,
      currentlyEnrolled: update.currentlyEnrolled ?? witness.currentlyEnrolled,
    })
    setWitness(next)
    setReceipt(null)
    setBlockHeight(null)
    setMessage('Local credential updated on this device. Nothing was uploaded.')
  }

  const rotate = () => {
    setWitness(rotateWitness())
    setReceipt(null)
    setBlockHeight(null)
    setStage('idle')
    setMessage('Fresh private credential material was generated and stored only on this device.')
  }

  const reveal = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.5 } }

  const busy = ['connecting', 'deploying', 'proving', 'finalizing'].includes(stage)

  return <main className="app-shell">
    <header className="site-header">
      <a className="brand" href="#top" aria-label="VERA home"><span className="brand-mark"><FlaskConical size={18}/></span><span>VERA</span></a>
      <nav className="site-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><a href="#proof-flow">Proof station</a></nav>
      <button className="header-action" onClick={scrollToProof}>Start proof <ChevronRight size={16}/></button>
    </header>

    <section className="hero" id="top">
      <motion.div {...reveal} className="hero-copy">
        <Tag tone="safe"><span className="status-dot"/> LIVE MIDNIGHT PROOF FLOW</Tag>
        <p className="eyebrow">A CALIBRATED PROOF INSTRUMENT</p>
        <h1>Prove the rule.<br/><em>Keep your record.</em></h1>
        <p className="hero-text">VERA lets students prove campus eligibility through a real Midnight transaction—without uploading a document, exposing a birth year, or creating a server-side profile.</p>
        <div className="hero-actions"><button className="primary-action" onClick={scrollToProof}>Start private proof <ArrowDown size={17}/></button><a className="text-action" href="#privacy">Inspect the privacy boundary <ArrowUpRight size={16}/></a></div>
        <p className="reassurance"><ShieldCheck size={15}/> You approve deployment and proof transactions in 1AM. VERA never invents a receipt.</p>
      </motion.div>
      <motion.div {...reveal} transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.12 }} className="hero-instrument" aria-label="Proof readiness instrument">
        <div className="instrument-head"><span>PROOF READINESS</span><Tag tone={contractSession ? 'safe' : 'pending'}>{modeLabel.toUpperCase()}</Tag></div>
        <div className="dial"><div className="dial-ring"><Orbit size={68}/><strong>{stageIndex}<small>/5</small></strong></div><p>{contractSession ? 'Compiled circuits, wallet services, and your contract are ready.' : 'Complete each visible checkpoint to create a real proof.'}</p></div>
        <div className="instrument-list">
          <span><Check size={15}/> Compiled Compact circuits bundled</span>
          <span className={plan ? 'ready' : ''}>{plan ? <Check size={15}/> : <span className="dot"/>} Disclosure boundary {plan ? 'reviewed' : 'pending'}</span>
          <span className={connection ? 'ready' : ''}>{connection ? <Check size={15}/> : <span className="dot"/>} 1AM {connection ? 'connected' : 'not connected'}</span>
          <span className={contractSession ? 'ready' : ''}>{contractSession ? <Check size={15}/> : <span className="dot"/>} Contract {contractSession ? 'ready' : 'not deployed'}</span>
        </div>
        <div className="instrument-foot"><span>{serviceHealth?.status === 'ok' ? 'Public service online' : 'Proof flow independent of API'}</span><label>NETWORK<select value={network} onChange={(event) => switchNetwork(event.target.value as Network)} aria-label="Select network"><option value="preview">Preview</option><option value="preprod">Preprod</option></select></label></div>
      </motion.div>
    </section>

    <section className="trust-strip" aria-label="Privacy guarantees"><span><LockKeyhole size={16}/> Local credential</span><span><Radio size={16}/> Real network state</span><span><ShieldCheck size={16}/> Wallet approval</span><span><Zap size={16}/> Finalized receipts only</span></section>

    <section className="section-block" id="how-it-works">
      <motion.div {...reveal} className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>Small answer. Strong proof.</h2><p>Campus services need a decision, not a copy of your record. VERA turns the policy into a proof and publishes only the minimum result.</p></motion.div>
      <div className="how-grid">{[['01', 'Keep the facts local', 'Your birth year, enrollment flag, and secret material stay in this browser.'], ['02', 'Approve the real actions', '1AM deploys or rejoins your contract and asks before every transaction.'], ['03', 'Receive a finalized receipt', 'Only successful Midnight transactions appear as access receipts.']].map(([number, title, description], index) => <motion.article {...reveal} transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08 }} className="how-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p><ChevronRight size={18}/></motion.article>)}</div>
    </section>

    <motion.section {...reveal} className="policy-card" id="requirement"><div><p className="eyebrow">THE PUBLIC REQUIREMENT</p><h2>{selectedProof.label}</h2><p>{selectedProof.policy}</p></div><div className="policy-output"><span>THE VERIFIER RECEIVES</span><strong>{selectedProof.action === 'eligibility' ? 'Eligible' : 'Enrolled'} <span>yes</span></strong><Tag tone="public">NOT YOUR RECORD</Tag></div></motion.section>

    <section className="section-block privacy-section" id="privacy">
      <motion.div {...reveal} className="section-heading"><p className="eyebrow">YOUR PRIVACY BOUNDARY</p><h2>Everything is visible except your private facts.</h2><p>The two sides below show the exact boundary enforced by the Compact circuit.</p></motion.div>
      <motion.div {...reveal} className="boundary-board"><article className="private-zone"><div className="zone-icon"><LockKeyhole size={20}/></div><p className="eyebrow">STAYS ON YOUR DEVICE</p><h3>Local only</h3><ul><li>Birth year</li><li>Enrollment status</li><li>Holder secret</li><li>Credential nonce</li></ul><Tag tone="safe">PRIVATE WITNESS</Tag></article><div className="boundary-seal"><span>PRIVATE</span><motion.div animate={reduceMotion ? {} : { scaleY: [0.86, 1, 0.86] }} transition={{ repeat: Infinity, duration: 2.4 }}><ShieldCheck size={26}/></motion.div><span>PROOF</span></div><article className="public-zone"><div className="zone-icon"><Radio size={20}/></div><p className="eyebrow">VERIFIER CAN LEARN</p><h3>Public receipt</h3><ul><li>Eligibility succeeded</li><li>Access scope</li><li>Transaction ID</li><li>Scope-bound nullifier</li></ul><Tag tone="public">MINIMUM NECESSARY</Tag></article></motion.div>
      <p className="boundary-note"><Sparkles size={16}/> The circuit checks the facts; the verifier receives the answer.</p>
    </section>

    <section className="proof-station" id="proof-flow">
      <motion.div {...reveal} className="proof-intro"><Tag tone="pending">YOUR PROOF STATION</Tag><p className="eyebrow">ONE GUIDED LIVE FLOW</p><h2>Every feature is available here.</h2><p>No demo switch and no hidden admin setup. Provide your local facts, connect 1AM, create your contract, and request the proof.</p><div className="progress-track" aria-label={`Step ${Math.min(stageIndex + 1, 5)} of 5`}><div style={{ width: `${Math.max(8, (stageIndex / 5) * 100)}%` }}/></div><div className="progress-labels">{stages.map((item, index) => <span className={index < stageIndex ? 'complete' : index === stageIndex ? 'current' : ''} key={item}>{String(index + 1).padStart(2, '0')} {item}</span>)}</div></motion.div>

      <motion.article {...reveal} className="proof-panel">
        <div className="proof-panel-head"><div><p className="eyebrow">LIVE PRIVATE PROOF</p><h3>{canProve ? 'Ready for proof approval' : 'Complete the checkpoints'}</h3></div><Tag tone={canProve ? 'safe' : 'pending'}>{canProve ? 'LIVE READY' : network.toUpperCase()}</Tag></div>
        <ol className="proof-steps expanded-steps">
          <li className={witness ? 'done' : ''}>
            <span>{witness ? <Check size={16}/> : '1'}</span>
            <div className="credential-step"><strong>Check your local credential</strong><small>These values stay in this browser and enter the circuit as a private witness.</small>{witness && <div className="credential-controls"><label>Birth year<input aria-label="Private birth year" type="number" min="1900" max={new Date().getUTCFullYear()} value={witness.birthYear} onChange={(event) => updateLocalCredential({ birthYear: Number(event.target.value) })}/></label><label className="check-control"><input aria-label="Currently enrolled" type="checkbox" checked={witness.currentlyEnrolled} onChange={(event) => updateLocalCredential({ currentlyEnrolled: event.target.checked })}/> Currently enrolled</label></div>}</div>
            <button className="icon-button" onClick={rotate} aria-label="Create fresh private credential"><RefreshCw size={16}/></button>
          </li>
          <li className={plan ? 'done' : ''}><span>{plan ? <Check size={16}/> : '2'}</span><div><strong>Review the disclosure boundary</strong><small>Only the published rule—not your credential—is explained.</small></div><button className="secondary-button" onClick={loadPlan}>{plan ? 'Reviewed' : 'Review'}</button></li>
          <li className={connection ? 'done' : ''}><span>{connection ? <Check size={16}/> : '3'}</span><div><strong>Connect 1AM</strong><small>{connection ? `${connection.provider.name} · ${connection.dust.balance > 0n ? 'DUST available' : 'DUST funding needed'}` : walletCount ? `${walletCount} compatible wallet provider${walletCount === 1 ? '' : 's'} detected.` : 'Install or enable 1AM, then reload this page.'}</small></div>{connection ? <button className="secondary-button" onClick={disconnect}><LogOut size={15}/> Disconnect</button> : <button className="secondary-button" onClick={() => void connect()} disabled={busy}><WalletCards size={15}/> {stage === 'connecting' ? 'Waiting…' : 'Connect'}</button>}</li>
          <li className={contractSession ? 'done' : ''}><span>{contractSession ? <Check size={16}/> : '4'}</span><div><strong>{contractSession ? 'VERA contract ready' : 'Create or rejoin your contract'}</strong><small>{contractSession ? `${shortId(contractSession.contractAddress)} · ${contractSession.joinedExisting ? 'rejoined' : 'newly deployed'}` : getStoredContractAddress(network) ? 'A saved address was found; VERA will verify and rejoin it.' : '1AM will approve and fund this one-time deployment.'}</small></div><button className="secondary-button" onClick={() => void setupContract()} disabled={!canSetUp || busy || Boolean(contractSession)}>{stage === 'deploying' ? 'Finalizing…' : contractSession ? 'Ready' : 'Set up'}</button></li>
          <li className={receipt ? 'done' : ''}><span>{receipt ? <Check size={16}/> : '5'}</span><div className="proof-choice"><strong>Generate a private proof</strong><small>Choose either compiled circuit. The wallet button activates when the live contract is ready.</small><label>PROOF TYPE<select aria-label="Proof type" value={proofType} onChange={(event) => selectProofType(event.target.value as ProofType)} disabled={busy}><option value="eligibility">Night Lab eligibility (age + enrollment)</option><option value="enrollment">Current enrollment only</option></select></label></div><button className="primary-mini" onClick={() => void prove()} disabled={!canProve || busy}>{stage === 'proving' || stage === 'finalizing' ? 'Working…' : `Prove ${selectedProof.action}`}</button></li>
        </ol>
        <AnimatePresence mode="wait"><motion.div key={message} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? {} : { opacity: 0, y: -6 }} className={stage === 'error' ? 'diagnostic error' : 'diagnostic'} role="status">{stage === 'error' ? <CircleAlert size={16}/> : <Sparkles size={16}/>}<span>{message}</span></motion.div></AnimatePresence>
        {!walletCount && !connection && <div className="capability-note"><CircleAlert size={17}/><div><strong>1AM is required for live use.</strong><p>The compiled circuits are bundled, but a wallet must approve, fund, prove, balance, and submit the transaction. Enable 1AM and reload—there is no fake fallback.</p></div></div>}
      </motion.article>
    </section>

    <section className="section-block plan-section" id="plan"><motion.div {...reveal} className="section-heading"><p className="eyebrow">PLAIN-LANGUAGE PROOF PLAN</p><h2>{plan ? 'Here is the boundary you approved.' : 'Read the proof before approving it.'}</h2><p>{plan ? plan.summary : 'VERA explains the public policy without sending any private credential field to Gemini or the backend.'}</p>{!plan && <button className="secondary-button large" onClick={loadPlan}>Review this plan <ChevronRight size={16}/></button>}</motion.div>{plan && <motion.div {...reveal} className="plan-grid"><article><Tag tone="public">THE ANSWER</Tag><h3>Disclosed</h3>{plan.disclosed.map((item) => <p key={item}><Check size={15}/>{item}</p>)}</article><article><Tag tone="safe">THE RECORD</Tag><h3>Private</h3>{plan.private.map((item) => <p key={item}><LockKeyhole size={15}/>{item}</p>)}</article><aside><Sparkles size={20}/><p>{plan.caution}</p><small>Source: {plan.source}</small></aside></motion.div>}</section>

    <section className="receipt-section" id="receipt"><motion.div {...reveal} className="receipt-card"><div className="receipt-header"><div><p className="eyebrow">RECEIPT INSTRUMENT</p><h2>{receipt ? 'Transaction finalized' : 'Waiting for a real proof'}</h2></div><Tag tone={receipt ? 'safe' : 'neutral'}>{receipt ? 'FINALIZED' : 'NOT SUBMITTED'}</Tag></div><div className="receipt-id">{receipt ?? '— — — — — — — —'}</div><p>{receipt ? `Midnight finalized this proof${blockHeight === null ? '' : ` at block ${blockHeight}`}. The private witness and source record were not published.` : 'This panel stays empty until 1AM submits a proof and Midnight confirms it. Local simulations never appear here.'}</p>{contractSession && <div className="contract-address"><span>CONTRACT</span><code>{contractSession.contractAddress}</code></div>}<div className="receipt-footer"><span><ShieldCheck size={15}/> Private inputs excluded</span><span>{receipt ? `${network} network` : 'Finalized transactions only'}</span></div></motion.div><div className="public-metrics"><p className="eyebrow">PUBLIC-ONLY METRICS</p><div><strong>{metrics.private_records_stored}</strong><span>private records stored</span></div><div><strong>{metrics.verified_proofs}</strong><span>verified proofs</span></div><div><strong>{metrics.successful_proofs}</strong><span>successful proofs</span></div></div></section>

    <section className="section-block faq-section"><motion.div {...reveal} className="section-heading"><p className="eyebrow">STUDENT QUESTIONS</p><h2>Nothing hidden behind the button.</h2></motion.div><div className="faq-list"><details open><summary>Where does the contract address come from?<ChevronRight size={17}/></summary><p>After you connect 1AM, the Set up step deploys VERA and Midnight returns the address. The browser saves it per network so you can rejoin later.</p></details><details><summary>Does VERA upload my document or birth year?<ChevronRight size={17}/></summary><p>No. Private facts are supplied to the compiled circuit from local browser state. Only the successful outcome, nullifier, transaction metadata, and aggregate counter become public.</p></details><details><summary>Why do I need testnet funds?<ChevronRight size={17}/></summary><p>Deployment and proof calls are real Midnight transactions. 1AM needs testnet NIGHT/DUST to pay their network cost; VERA detects and explains insufficient-balance errors.</p></details></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark"><FlaskConical size={17}/></span><span>VERA</span></a><p>Student Proof Station · Real Midnight privacy</p><a className="footer-link" href="#top">Back to top ↑</a></footer>
  </main>
}
