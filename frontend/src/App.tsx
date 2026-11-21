import { useEffect, useState } from 'react'
import DangerAlert from './components/DangerAlert'
import Landing from './components/Landing'
import SignIn from './components/SignIn'
import VisitForm from './components/VisitForm'
import { ArrowIcon, BackIcon, CheckIcon, ClipboardIcon, HomeIcon, ListIcon, LogoutIcon, MicIcon, StopIcon, WaveIcon } from './components/Icons'
import { clearWorker, loadWorker, saveWorker, workerInitials } from './lib/auth'
import type { WorkerProfile } from './lib/auth'
import { useVoiceSession } from './lib/useVoiceSession'
import type { FollowUp, WhatsAppUpdate, WhatsAppUpdatesPayload } from './lib/types'

type Page = 'landing' | 'signin' | 'visit' | 'followups'

const WHATSAPP_STATUS = {
  confirmed: { label: 'Confirmed', className: 'bg-mint text-forest' },
  reschedule_requested: { label: 'Reschedule requested', className: 'bg-turmeric/25 text-[#80520c]' },
  no_response: { label: 'No response', className: 'bg-cream text-ink/60' },
  asha_callback_requested: { label: 'ASHA callback requested', className: 'bg-danger-soft text-danger' },
} as const

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [user, setUser] = useState<WorkerProfile | null>(() => loadWorker())
  const [pendingPage, setPendingPage] = useState<'visit' | 'followups'>('visit')
  const voice = useVoiceSession()
  const [correction, setCorrection] = useState('')
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [whatsappUpdates, setWhatsappUpdates] = useState<WhatsAppUpdate[]>([])
  const [whatsappSummary, setWhatsappSummary] = useState<WhatsAppUpdatesPayload['summary']>({
    confirmed: 0,
    reschedule_requested: 0,
    no_response: 0,
    asha_callback_requested: 0,
  })
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [followUpError, setFollowUpError] = useState('')

  useEffect(() => {
    if (page === 'visit') void voice.connect()
    else voice.disconnect()
    // Connection lifecycle follows the selected screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (page !== 'followups') return
    let active = true
    const loadFollowUps = () => {
      Promise.all([fetch('/api/followups'), fetch('/api/whatsapp/updates')])
        .then(async ([followUpResponse, whatsappResponse]) => {
          if (!followUpResponse.ok || !whatsappResponse.ok) throw new Error('Could not load follow-ups.')
          return Promise.all([
            followUpResponse.json() as Promise<{ followUps: FollowUp[] }>,
            whatsappResponse.json() as Promise<WhatsAppUpdatesPayload>,
          ])
        })
        .then(([followUpPayload, whatsappPayload]) => {
          if (!active) return
          setFollowUps(followUpPayload.followUps ?? [])
          setWhatsappUpdates(whatsappPayload.updates ?? [])
          setWhatsappSummary(whatsappPayload.summary)
          setWhatsappConfigured(whatsappPayload.webhookConfigured && whatsappPayload.sendingConfigured)
          setFollowUpError('')
        })
        .catch(() => { if (active) setFollowUpError('Could not reach the backend. Start the API and refresh this page.') })
    }
    loadFollowUps()
    const refreshTimer = window.setInterval(loadFollowUps, 5000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [page])

  const goBack = () => {
    voice.disconnect()
    setPage('landing')
  }

  const openProtected = (target: 'visit' | 'followups') => {
    if (user) {
      setFollowUpError('')
      setPage(target)
      return
    }
    setPendingPage(target)
    setPage('signin')
  }

  const signIn = (profile: WorkerProfile) => {
    saveWorker(profile)
    setUser(profile)
    setPage(pendingPage)
  }

  const signOut = () => {
    voice.disconnect()
    clearWorker()
    setUser(null)
    setPage('landing')
  }

  if (page === 'landing') {
    return <Landing user={user} onStart={() => openProtected('visit')} onRecords={() => openProtected('followups')} onSignIn={() => { setPendingPage('visit'); setPage('signin') }} onSignOut={signOut} />
  }

  if (page === 'signin') return <SignIn onBack={() => setPage('landing')} onSignIn={signIn} />

  if (page === 'followups') {
    return (
      <AppShell user={user!} active="followups" onHome={goBack} onVisit={() => setPage('visit')} onFollowups={() => setPage('followups')} onSignOut={signOut}>
        <section className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">Visit queue</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-forest">Follow-up board</h1>
          <p className="mt-2 text-sm text-ink/60">Saved visit follow-ups with WhatsApp replies synchronized automatically every five seconds.</p>
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              {followUpError && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{followUpError}</p>}
              {!followUpError && followUps.length === 0 && <p className="rounded-card border border-forest/10 bg-paper p-6 text-sm text-ink/60">No saved follow-ups yet. Confirm a visit record to add one.</p>}
              <ul className="grid gap-3">
                {followUps.map((item, i) => (
                  <li key={`${item.recordId}-${i}`} className={`border-l-4 bg-paper p-5 shadow-sm ${item.danger ? 'border-danger' : 'border-moss'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-bold">{item.beneficiaryName || 'Beneficiary'}</p><p className="mt-1 text-xs uppercase tracking-wide text-ink/50">{item.visitType} · {item.recordId}</p></div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${WHATSAPP_STATUS[item.whatsappStatus].className}`}>
                          WhatsApp · {WHATSAPP_STATUS[item.whatsappStatus].label}
                        </span>
                        {item.nextVisit && <time className="rounded-full bg-cream px-3 py-1 text-xs font-semibold">{item.nextVisit}</time>}
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-ink/75">{item.line}</p>
                    {item.whatsappLastReply && <p className="mt-2 text-xs text-ink/50">Latest reply: {item.whatsappLastReply}</p>}
                    {item.danger && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-danger">Danger flag open · confirm PHC referral</p>}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="h-fit border border-forest/10 bg-paper p-5 shadow-sm lg:sticky lg:top-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">WhatsApp updates</p><h2 className="mt-1 font-display text-2xl text-forest">Reply activity</h2></div>
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${whatsappConfigured ? 'bg-[#25d366]' : 'bg-turmeric'}`} title={whatsappConfigured ? 'Connected' : 'Credentials required'} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {(Object.keys(WHATSAPP_STATUS) as Array<keyof typeof WHATSAPP_STATUS>).map((status) => (
                  <div key={status} className="rounded-xl bg-cream p-3">
                    <p className="text-xl font-extrabold text-forest">{whatsappSummary[status]}</p>
                    <p className="mt-1 text-[10px] font-bold leading-tight text-ink/50">{WHATSAPP_STATUS[status].label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-forest/10 pt-4">
                {whatsappUpdates.length === 0 ? (
                  <p className="text-xs leading-relaxed text-ink/50">New beneficiary replies will appear here automatically.</p>
                ) : (
                  <ul className="space-y-4">
                    {whatsappUpdates.slice(0, 8).map((update) => (
                      <li key={`${update.recordId}-${update.createdAt}`}>
                        <p className="text-sm font-bold text-forest">{update.beneficiaryName || update.recordId}</p>
                        <p className="mt-1 text-xs text-ink/60">{WHATSAPP_STATUS[update.status].label}{update.reply ? ` · “${update.reply}”` : ''}</p>
                        <time className="mt-1 block text-[10px] text-ink/40">{new Date(update.createdAt).toLocaleString()}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!whatsappConfigured && <p className="mt-5 rounded-xl bg-turmeric/15 p-3 text-xs font-semibold leading-relaxed text-[#80520c]">Add Meta credentials to receive live WhatsApp replies.</p>}
            </aside>
          </div>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell user={user!} active="visit" onHome={goBack} onVisit={() => setPage('visit')} onFollowups={() => setPage('followups')} onSignOut={signOut}>
      <div className="border-b border-forest/10 bg-paper px-5 py-3 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Active field visit</p><p className="text-sm text-ink/50">Speak naturally in Hindi, Hinglish, or English</p></div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-forest">Text-only assistant</span>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-forest">{voice.status}</span>
          </div>
        </div></div>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="border-l-4 border-turmeric bg-paper p-5 shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Voice field register</p>
            <h1 className="mt-2 font-display text-4xl leading-none text-forest">Speak the visit. Confirm the record.</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">The assistant discloses that it is AI, then listens. Check the extracted fields and correct anything before saving.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-forest/70">
              <span className="rounded-full bg-cream px-3 py-1.5">STT: {voice.meta?.stt ?? 'connecting'}</span>
              <span className="rounded-full bg-cream px-3 py-1.5">Output: {voice.meta?.tts ?? 'text-only'}</span>
              <span className="rounded-full bg-cream px-3 py-1.5">Extraction: {voice.meta?.llm ?? 'rules'}</span>
            </div>
          </div>

          <div className="border border-forest/12 bg-forest-deep p-5 text-cream shadow-xl sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold">Conversation</h2>
              <span className="text-xs text-cream/45">{voice.sessionState.replaceAll('_', ' ')}</span>
            </div>
            <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto" aria-live="polite">
              {voice.turns.length === 0 && <p className="text-sm text-cream/45">The AI disclosure will appear here when the session connects.</p>}
              {voice.turns.map((turn) => (
                <p key={turn.id} className={`max-w-[92%] px-4 py-3 text-lg leading-relaxed ${turn.role === 'asha' ? 'ml-auto bg-moss text-cream' : turn.kind === 'danger' ? 'bg-danger-soft text-danger' : 'bg-cream text-ink'}`}>
                  {turn.text}
                </p>
              ))}
              {voice.interim && <p className="rounded-xl bg-cream/70 p-3 text-lg italic text-ink/70">{voice.interim}</p>}
            </div>
            <DangerAlert signs={voice.danger} message={voice.dangerMessage} />
            {voice.error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{voice.error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              {!voice.listening ? (
                <button disabled={!['listening', 'awaiting_confirmation'].includes(voice.sessionState) || voice.status !== 'live'} onClick={() => void voice.startListening()} className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-45" type="button"><MicIcon className="h-4 w-4" /> {voice.sessionState === 'awaiting_confirmation' ? 'Speak correction' : 'Start listening'}</button>
              ) : (
                <button onClick={voice.stopListening} className="inline-flex items-center gap-2 rounded-full bg-danger px-5 py-3 text-sm font-semibold text-white" type="button"><StopIcon className="h-4 w-4" /> Stop listening</button>
              )}
              {voice.sessionState === 'awaiting_confirmation' && <button onClick={() => void voice.confirm()} className="inline-flex items-center gap-2 rounded-full border border-forest/20 px-5 py-3 text-sm font-semibold text-forest" type="button"><CheckIcon className="h-4 w-4" /> Confirm and save</button>}
            </div>
            <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (correction.trim()) { voice.submitText(correction, voice.record ? 'correct' : 'utterance'); setCorrection('') } }}>
              <input value={correction} onChange={(event) => setCorrection(event.target.value)} className="min-w-0 flex-1 border border-cream/20 bg-cream px-4 py-3 text-base text-ink outline-none focus:border-turmeric" placeholder={voice.record ? 'Correct one field, e.g. weight 52 kilo' : 'Or type a visit note'} aria-label="Visit note or correction" />
              <button className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest text-cream" aria-label="Send note" type="submit"><ArrowIcon className="h-4 w-4" /></button>
            </form>
          </div>
          {voice.sessionState === 'saved' && <div className="rounded-card border border-moss/20 bg-mint/40 p-5"><p className="font-bold text-forest">Visit saved</p><ul className="mt-2 list-inside list-disc text-sm text-forest/80">{voice.savedFollowUps.map((line) => <li key={line}>{line}</li>)}</ul></div>}
        </section>
        <aside className="space-y-5">
          <VisitForm record={voice.record} missing={voice.missing} extraction={voice.extractionSource} />
          <div className="rounded-card border border-forest/10 bg-paper p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">Safety boundary</p>
            {voice.danger.length > 0 && <p className="mt-3 rounded-xl bg-danger-soft p-3 font-semibold text-danger" role="status">{voice.danger.length} danger sign{voice.danger.length === 1 ? '' : 's'} flagged. Review the referral alert in the conversation.</p>}
            <p className="mt-2 text-sm leading-relaxed text-ink/65">A deterministic phrase matcher checks the transcript. It does not diagnose or recommend treatment. Confirm any flag with the PHC.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

type ShellProps = {
  user: WorkerProfile
  active: 'visit' | 'followups'
  onHome: () => void
  onVisit: () => void
  onFollowups: () => void
  onSignOut: () => void
  children: React.ReactNode
}

function AppShell({ user, active, onHome, onVisit, onFollowups, onSignOut, children }: ShellProps) {
  const nav = 'flex items-center gap-3 px-4 py-3 text-sm font-bold transition'
  return (
    <main className="min-h-screen bg-cream lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden min-h-screen flex-col bg-forest-deep text-cream lg:flex">
        <button onClick={onHome} type="button" className="flex items-center gap-3 border-b border-cream/10 px-6 py-6 text-left">
          <span className="grid h-10 w-10 place-items-center border border-cream/20 text-turmeric"><WaveIcon className="h-5 w-5" /></span>
          <span><span className="block font-hindi text-lg font-bold">स्वरवाणी</span><span className="block text-[10px] uppercase tracking-[0.2em] text-cream/45">Field register</span></span>
        </button>
        <nav className="space-y-1 px-3 py-6">
          <button onClick={onHome} type="button" className={`${nav} w-full text-cream/65 hover:bg-cream/8 hover:text-cream`}><HomeIcon className="h-5 w-5" /> Home</button>
          <button onClick={onVisit} type="button" className={`${nav} w-full ${active === 'visit' ? 'bg-turmeric text-forest' : 'text-cream/65 hover:bg-cream/8 hover:text-cream'}`}><MicIcon className="h-5 w-5" /> New visit</button>
          <button onClick={onFollowups} type="button" className={`${nav} w-full ${active === 'followups' ? 'bg-turmeric text-forest' : 'text-cream/65 hover:bg-cream/8 hover:text-cream'}`}><ListIcon className="h-5 w-5" /> Follow-ups</button>
        </nav>
        <div className="mt-auto border-t border-cream/10 p-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center bg-mint text-xs font-extrabold text-forest">{workerInitials(user.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{user.name}</span><span className="block truncate text-xs text-cream/45">{user.district}</span></span></div>
          <button onClick={onSignOut} type="button" className="mt-4 flex items-center gap-2 text-xs font-bold text-cream/50 hover:text-cream"><LogoutIcon className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="flex items-center justify-between border-b border-forest/10 bg-paper px-5 py-3 lg:hidden"><button onClick={onHome} type="button" className="font-hindi text-lg font-bold text-forest">स्वरवाणी</button><div className="flex gap-2"><button onClick={onFollowups} aria-label="Follow-ups" className="p-2 text-forest"><ClipboardIcon className="h-5 w-5" /></button><button onClick={onSignOut} aria-label="Sign out" className="p-2 text-danger"><LogoutIcon className="h-5 w-5" /></button></div></header>
        {children}
      </section>
    </main>
  )
}
