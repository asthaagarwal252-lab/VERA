import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, Check, ChevronRight, CircleAlert, FlaskConical, LockKeyhole, Orbit, Radio, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getHealth, getMetrics, getProofPlan, saveReceipt } from './lib/api'
import { createWitness, loadWitness, rotateWitness, saveWitness, type LocalWitness } from './lib/private-state'
import type { Connection, Network, ProofPlan, ProofStage, PublicMetrics, ServiceHealth } from './lib/types'
import { callEligibilityCircuit, connectWallet, discoverWallets } from './lib/wallet'

const policy = 'Currently enrolled students aged 18 or over may access the campus night lab.'
const fallbackPlan: ProofPlan = {
  summary: 'This proof checks current enrolment and age eligibility without sending either source record to a verifier.',
  disclosed: ['Eligible: yes or no', 'Campus Night Lab scope', 'Replay-resistant receipt marker'],
  private: ['Student identifier', 'Date of birth', 'Credential details', 'Private witness'],
  caution: 'Practice mode is local to this browser. It does not create a blockchain transaction or public receipt.',
  source: 'local-practice-guide',
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'safe' | 'public' | 'pending' }) {
  return <span className={`tag ${tone}`}>{children}</span>
}

function scrollToProof() { document.querySelector('#proof-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

export function App() {
  const reduceMotion = useReducedMotion()
  const [network, setNetwork] = useState<Network>('preview')
  const [witness, setWitness] = useState<LocalWitness | null>(null)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [stage, setStage] = useState<ProofStage>('idle')
  const [plan, setPlan] = useState<ProofPlan | null>(null)
  const [message, setMessage] = useState('Start with a private practice proof — no wallet or personal data is required.')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [isPracticeReceipt, setIsPracticeReceipt] = useState(false)
  const [metrics, setMetrics] = useState<PublicMetrics>({ verified_proofs: 0, successful_proofs: 0, private_records_stored: 0 })
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [walletCount, setWalletCount] = useState(0)
  const artifactsInstalled = typeof window !== 'undefined' && Boolean(window.veraCompact)
  const canSubmitLive = Boolean(connection && witness && artifactsInstalled)
  const modeLabel = canSubmitLive ? 'Live proof ready' : 'Practice mode'
  const stageIndex = receipt ? 4 : connection ? 3 : plan ? 2 : witness ? 1 : 0
  const stages = useMemo(() => ['Prepare', 'Understand', 'Connect', 'Approve'], [])

  useEffect(() => {
    const stored = loadWitness(); const next = stored ?? createWitness()
    if (!stored) saveWitness(next)
    setWitness(next); setWalletCount(discoverWallets().length)
  }, [])
  useEffect(() => {
    let active = true
    const refreshPublicState = async () => {
      try {
        const [nextMetrics, nextHealth] = await Promise.all([getMetrics(), getHealth()])
        if (active) { setMetrics(nextMetrics); setServiceHealth(nextHealth) }
      } catch { if (active) setServiceHealth({ service: 'vera-api', status: 'degraded', database: 'unavailable-locally' }) }
    }
    void refreshPublicState()
    const interval = window.setInterval(() => void refreshPublicState(), 30_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])

  const loadPlan = async () => {
    setStage('review')
    try { setPlan(await getProofPlan(policy)); setMessage('Your proof plan is ready. Only the public access rule was reviewed.') }
    catch { setPlan(fallbackPlan); setMessage('Your private practice plan is ready. The local API is offline, so nothing was sent anywhere.') }
  }
  const connect = async () => {
    setStage('connecting')
    try {
      const nextConnection = await connectWallet(network)
      setConnection(nextConnection); setWalletCount(discoverWallets().length); setStage('review')
      setMessage(`${nextConnection.provider.name} is connected for this tab only. You will review before anything is submitted.`)
    } catch (error) {
      setStage('idle')
      setMessage(error instanceof Error ? `${error.message} You can still complete a private practice proof below.` : 'Wallet connection was unavailable. You can still complete a private practice proof below.')
    }
  }
  const completePracticeProof = async () => {
    setStage('proving'); setMessage('Checking the practice flow locally on this device…')
    await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 700))
    setReceipt(`practice-${crypto.randomUUID().slice(0, 8)}`); setIsPracticeReceipt(true); setStage('success')
    setMessage('Practice proof complete. No wallet, blockchain transaction, or public receipt was created.')
  }
  const prove = async () => {
    if (!canSubmitLive || !connection || !witness) { await completePracticeProof(); return }
    setStage('proving'); setMessage('Generating a zero-knowledge proof in your wallet…')
    try {
      const result = await callEligibilityCircuit(connection, witness, 'campus-night-lab')
      setStage('finalizing'); setMessage('Submitted to Midnight. Waiting for finalization…'); setReceipt(result.transactionId); setIsPracticeReceipt(false)
      try { await saveReceipt(result.transactionId, 'campus-night-lab', policy); setMessage('Your public receipt is finalized. Your source record remained private.') }
      catch { setMessage('Your chain transaction is finalized. The public receipt service will retry when available.') }
      setStage('success'); try { setMetrics(await getMetrics()) } catch { /* Chain receipts are valid without public metrics. */ }
    } catch (error) { setStage('error'); setMessage(error instanceof Error ? error.message : 'The proof could not be completed. No receipt was created.') }
  }
  const switchNetwork = (value: Network) => {
    setNetwork(value); setConnection(null); setReceipt(null); setIsPracticeReceipt(false); setStage('idle')
    setMessage('Network changed. Wallet session reset; your local record remains on this device.')
  }
  const rotate = () => { setWitness(rotateWitness()); setReceipt(null); setIsPracticeReceipt(false); setStage('idle'); setMessage('Fresh private proof material was created on this device.') }
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.5 } }

  return <main className="app-shell">
    <header className="site-header"><a className="brand" href="#top" aria-label="VERA home"><span className="brand-mark"><FlaskConical size={18}/></span><span>VERA</span></a><nav className="site-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><a href="#proof-flow">Proof station</a></nav><button className="header-action" onClick={scrollToProof}>Start privately <ChevronRight size={16}/></button></header>

    <section className="hero" id="top">
      <motion.div {...reveal} className="hero-copy"><Tag tone="safe"><span className="status-dot"/> STUDENT-FIRST PRIVATE ACCESS</Tag><p className="eyebrow">A CALIBRATED PROOF INSTRUMENT</p><h1>Prove the rule.<br/><em>Keep your record.</em></h1><p className="hero-text">VERA lets you show eligibility for campus access without uploading documents, exposing your student number, or creating a profile.</p><div className="hero-actions"><button className="primary-action" onClick={scrollToProof}>Try a private practice proof <ArrowDown size={17}/></button><a className="text-action" href="#privacy">See what stays private <ArrowUpRight size={16}/></a></div><p className="reassurance"><ShieldCheck size={15}/> Practice mode works without a wallet. A real transaction always requires your approval.</p></motion.div>
      <motion.div {...reveal} transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.12 }} className="hero-instrument" aria-label="Proof readiness instrument"><div className="instrument-head"><span>PROOF READINESS</span><Tag tone={canSubmitLive ? 'safe' : 'pending'}>{modeLabel.toUpperCase()}</Tag></div><div className="dial"><div className="dial-ring"><Orbit size={68}/><strong>{stageIndex}<small>/4</small></strong></div><p>{canSubmitLive ? 'Your wallet and verified proof adapter are ready.' : 'You can learn the flow safely before connecting anything.'}</p></div><div className="instrument-list"><span><Check size={15}/> Private material prepared</span><span className={plan ? 'ready' : ''}>{plan ? <Check size={15}/> : <span className="dot"/>} Public plan {plan ? 'reviewed' : 'available'}</span><span className={connection ? 'ready' : ''}>{connection ? <Check size={15}/> : <span className="dot"/>} Wallet {connection ? 'connected' : 'optional for practice'}</span></div><div className="instrument-foot"><span>{serviceHealth?.status === 'ok' ? 'Public service online' : 'Local-friendly mode'}</span><label>NETWORK<select value={network} onChange={(event) => switchNetwork(event.target.value as Network)} aria-label="Select network"><option value="preview">Preview</option><option value="preprod">Preprod</option></select></label></div></motion.div>
    </section>
    <section className="trust-strip" aria-label="Privacy guarantees"><span><LockKeyhole size={16}/> No document upload</span><span><Radio size={16}/> No cross-site tracking</span><span><ShieldCheck size={16}/> Approval before submission</span><span><Zap size={16}/> Clear receipt state</span></section>

    <section className="section-block" id="how-it-works"><motion.div {...reveal} className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>Small answer. Strong proof.</h2><p>Most campus services need a decision, not a copy of your record. VERA helps them ask for the smallest possible answer.</p></motion.div><div className="how-grid">{[['01', 'Read the rule', 'Start with the access requirement in plain language.'], ['02', 'Check the boundary', 'See exactly what stays on your device before continuing.'], ['03', 'Approve with confidence', 'Use a wallet only when a real proof is ready to submit.']].map(([number, title, description], index) => <motion.article {...reveal} transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08 }} className="how-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p><ChevronRight size={18}/></motion.article>)}</div></section>

    <motion.section {...reveal} className="policy-card" id="requirement"><div><p className="eyebrow">THE PUBLIC REQUIREMENT</p><h2>Campus Night Lab</h2><p>{policy}</p></div><div className="policy-output"><span>THE VERIFIER RECEIVES</span><strong>Eligible <span>yes / no</span></strong><Tag tone="public">NOT YOUR RECORD</Tag></div></motion.section>

    <section className="section-block privacy-section" id="privacy"><motion.div {...reveal} className="section-heading"><p className="eyebrow">YOUR PRIVACY BOUNDARY</p><h2>Designed to be understood at a glance.</h2><p>There is no invisible data hand-off. The two sides below show what remains private and what a verifier can learn.</p></motion.div><motion.div {...reveal} className="boundary-board"><article className="private-zone"><div className="zone-icon"><LockKeyhole size={20}/></div><p className="eyebrow">STAYS ON YOUR DEVICE</p><h3>Local only</h3><ul><li>Date of birth</li><li>Student identifier</li><li>Credential details</li><li>Secret proof material</li></ul><Tag tone="safe">NEVER UPLOADED</Tag></article><div className="boundary-seal"><span>PRIVATE</span><motion.div animate={reduceMotion ? {} : { scaleY: [0.86, 1, 0.86] }} transition={{ repeat: Infinity, duration: 2.4 }}><ShieldCheck size={26}/></motion.div><span>PROOF</span></div><article className="public-zone"><div className="zone-icon"><Radio size={20}/></div><p className="eyebrow">VERIFIER CAN LEARN</p><h3>Public receipt</h3><ul><li>Eligibility outcome</li><li>Access scope</li><li>Finalized transaction ID</li><li>Replay-safe marker</li></ul><Tag tone="public">MINIMUM NECESSARY</Tag></article></motion.div><p className="boundary-note"><Sparkles size={16}/> The proof replaces the record. It does not reveal the ingredients used to make it.</p></section>

    <section className="proof-station" id="proof-flow"><motion.div {...reveal} className="proof-intro"><Tag tone="pending">YOUR PROOF STATION</Tag><p className="eyebrow">A GENTLER PATH TO A REAL PROOF</p><h2>Start safely. Connect only when you are ready.</h2><p>You can use this station without technical setup. Practice mode is a guided local simulation; it never pretends to be a Midnight transaction.</p><div className="progress-track" aria-label={`Step ${Math.min(stageIndex + 1, 4)} of 4`}><div style={{ width: `${Math.max(8, (stageIndex / 4) * 100)}%` }}/></div><div className="progress-labels">{stages.map((item, index) => <span className={index < stageIndex ? 'complete' : index === stageIndex ? 'current' : ''} key={item}>{String(index + 1).padStart(2, '0')} {item}</span>)}</div></motion.div>
      <motion.article {...reveal} className="proof-panel"><div className="proof-panel-head"><div><p className="eyebrow">PRIVATE PROOF FLOW</p><h3>{canSubmitLive ? 'Ready to request approval' : 'Private practice proof'}</h3></div><Tag tone={canSubmitLive ? 'safe' : 'pending'}>{canSubmitLive ? 'LIVE CAPABILITY' : 'NO WALLET NEEDED'}</Tag></div><ol className="proof-steps"><li className={witness ? 'done' : ''}><span>{witness ? <Check size={16}/> : '1'}</span><div><strong>Your private material is ready</strong><small>Created and stored only in this browser.</small></div><button className="icon-button" onClick={rotate} aria-label="Create fresh private material"><RefreshCw size={16}/></button></li><li className={plan ? 'done' : ''}><span>{plan ? <Check size={16}/> : '2'}</span><div><strong>Understand the public proof plan</strong><small>Only the published rule is used to prepare it.</small></div><button className="secondary-button" onClick={loadPlan}>{plan ? 'Reviewed' : 'Review'}</button></li><li className={connection ? 'done' : ''}><span>{connection ? <Check size={16}/> : '3'}</span><div><strong>Connect 1AM only for a real proof</strong><small>{walletCount ? `${walletCount} wallet${walletCount === 1 ? '' : 's'} detected in this browser.` : 'Not installed? Practice mode still works.'}</small></div><button className="secondary-button" onClick={connect}>{connection ? 'Connected' : 'Connect'}</button></li><li className={receipt ? 'done' : ''}><span>{receipt ? <Check size={16}/> : '4'}</span><div><strong>{canSubmitLive ? 'Generate and submit' : 'Try the practice proof'}</strong><small>{canSubmitLive ? 'Your wallet asks before anything reaches Midnight.' : 'Shows the complete flow without creating a transaction.'}</small></div><button className="primary-mini" onClick={() => void prove()} disabled={stage === 'proving'}>{stage === 'proving' ? 'Working…' : canSubmitLive ? 'Request proof' : 'Try it'}</button></li></ol><AnimatePresence mode="wait"><motion.div key={message} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? {} : { opacity: 0, y: -6 }} className={stage === 'error' ? 'diagnostic error' : 'diagnostic'} role="status">{stage === 'error' ? <CircleAlert size={16}/> : <Sparkles size={16}/>}<span>{message}</span></motion.div></AnimatePresence>{!artifactsInstalled && <div className="capability-note"><CircleAlert size={17}/><div><strong>Live proofs are not configured in this build.</strong><p>That is why VERA offers practice mode instead of showing a failed transaction. Add verified Compact browser artifacts and a deployed contract to enable real Midnight submissions.</p></div></div>}</motion.article>
    </section>

    <section className="section-block plan-section" id="plan"><motion.div {...reveal} className="section-heading"><p className="eyebrow">PLAIN-LANGUAGE PROOF PLAN</p><h2>{plan ? 'Here is the boundary you approved.' : 'Want the proof in plain language?'}</h2><p>{plan ? plan.summary : 'Review the published access rule before you connect a wallet. VERA never reads a credential to explain the rule.'}</p>{!plan && <button className="secondary-button large" onClick={loadPlan}>Review this plan <ChevronRight size={16}/></button>}</motion.div>{plan && <motion.div {...reveal} className="plan-grid"><article><Tag tone="public">THE ANSWER</Tag><h3>Disclosed</h3>{plan.disclosed.map((item) => <p key={item}><Check size={15}/>{item}</p>)}</article><article><Tag tone="safe">THE RECORD</Tag><h3>Private</h3>{plan.private.map((item) => <p key={item}><LockKeyhole size={15}/>{item}</p>)}</article><aside><Sparkles size={20}/><p>{plan.caution}</p><small>Source: {plan.source}</small></aside></motion.div>}</section>

    <section className="receipt-section" id="receipt"><motion.div {...reveal} className="receipt-card"><div className="receipt-header"><div><p className="eyebrow">RECEIPT INSTRUMENT</p><h2>{receipt ? (isPracticeReceipt ? 'Practice receipt complete' : 'Transaction finalized') : 'Nothing submitted yet'}</h2></div><Tag tone={receipt ? (isPracticeReceipt ? 'pending' : 'safe') : 'neutral'}>{receipt ? (isPracticeReceipt ? 'PRACTICE ONLY' : 'FINALIZED') : 'NOT SUBMITTED'}</Tag></div><div className="receipt-id">{receipt ?? '— — — — — — — —'}</div><p>{receipt ? (isPracticeReceipt ? 'This local reference proves you completed the practice flow. It is not on-chain and cannot be used for access.' : 'This is the public reference for the finalized proof. Your underlying student record was not published.') : 'A real receipt appears only after you approve a live wallet transaction and Midnight finalizes it.'}</p><div className="receipt-footer"><span><ShieldCheck size={15}/> Private inputs excluded</span><span>{isPracticeReceipt ? 'Local browser only' : 'Public outcome only'}</span></div></motion.div><div className="public-metrics"><p className="eyebrow">PUBLIC-ONLY METRICS</p><div><strong>{metrics.private_records_stored}</strong><span>private records stored</span></div><div><strong>{metrics.verified_proofs}</strong><span>verified proofs</span></div><div><strong>{metrics.successful_proofs}</strong><span>successful proofs</span></div></div></section>

    <section className="section-block faq-section"><motion.div {...reveal} className="section-heading"><p className="eyebrow">STUDENT QUESTIONS</p><h2>Nothing hidden behind the button.</h2></motion.div><div className="faq-list"><details open><summary>Do I have to connect a wallet to explore VERA?<ChevronRight size={17}/></summary><p>No. Practice mode lets you see the full student experience locally, without a wallet, transaction, or public receipt.</p></details><details><summary>Does VERA upload my document or student ID?<ChevronRight size={17}/></summary><p>No. The browser keeps private proof material local. A real proof exposes only the outcome and the minimum public receipt metadata.</p></details><details><summary>What happens when I press “Request proof”?<ChevronRight size={17}/></summary><p>Only when verified browser artifacts and a wallet are available does VERA ask the wallet to approve a real Midnight proof. Otherwise it clearly stays in practice mode.</p></details></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark"><FlaskConical size={17}/></span><span>VERA</span></a><p>Student Proof Station · Built for transparent access</p><a className="footer-link" href="#top">Back to top ↑</a></footer>
  </main>
}
