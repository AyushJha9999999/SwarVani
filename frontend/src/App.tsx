import { useEffect, useState } from 'react'
import DangerAlert from './components/DangerAlert'
import Landing from './components/Landing'
import VisitForm from './components/VisitForm'
import { ArrowIcon, BackIcon, CheckIcon, MicIcon, MutedIcon, SpeakerIcon, StopIcon, WaveIcon } from './components/Icons'
import { useVoiceSession } from './lib/useVoiceSession'
import type { FollowUp } from './lib/types'

type Page = 'landing' | 'visit' | 'followups'

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const voice = useVoiceSession()
  const [correction, setCorrection] = useState('')
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
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
    fetch('/api/followups')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load follow-ups.')
        return response.json() as Promise<{ followUps: FollowUp[] }>
      })
      .then((payload) => { if (active) setFollowUps(payload.followUps ?? []) })
      .catch(() => { if (active) setFollowUpError('Could not reach the backend. Start the API and refresh this page.') })
    return () => { active = false }
  }, [page])

  const goBack = () => {
    voice.disconnect()
    setPage('landing')
  }

  if (page === 'landing') {
    return <Landing onStart={() => setPage('visit')} onRecords={() => { setFollowUpError(''); setPage('followups') }} />
  }

  if (page === 'followups') {
    return (
      <main className="min-h-screen bg-cream">
        <header className="border-b border-forest/10 bg-paper">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <button onClick={goBack} className="inline-flex items-center gap-2 text-sm font-semibold text-forest" type="button"><BackIcon className="h-4 w-4" /> Home</button>
            <span className="font-hindi font-bold">स्वरवाणी · Follow-ups</span>
          </div>
        </header>
        <section className="mx-auto max-w-5xl px-5 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">Visit queue</p>
          <h1 className="mt-2 text-3xl font-extrabold">Follow-up board</h1>
          <p className="mt-2 text-sm text-ink/60">Saved visit follow-ups, ordered by the next visit date.</p>
          {followUpError && <p role="alert" className="mt-6 rounded-xl bg-danger-soft p-4 text-sm text-danger">{followUpError}</p>}
          {!followUpError && followUps.length === 0 && <p className="mt-8 rounded-card border border-forest/10 bg-paper p-6 text-sm text-ink/60">No saved follow-ups yet. Confirm a visit record to add one.</p>}
          <ul className="mt-6 grid gap-3">
            {followUps.map((item, i) => (
              <li key={`${item.recordId}-${i}`} className={`rounded-card border bg-paper p-5 ${item.danger ? 'border-danger/30' : 'border-forest/10'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold">{item.beneficiaryName || 'Beneficiary'}</p><p className="mt-1 text-xs uppercase tracking-wide text-ink/50">{item.visitType} · {item.recordId}</p></div>
                  {item.nextVisit && <time className="rounded-full bg-cream px-3 py-1 text-xs font-semibold">{item.nextVisit}</time>}
                </div>
                <p className="mt-4 text-sm text-ink/75">{item.line}</p>
                {item.danger && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-danger">Danger flag open · confirm PHC referral</p>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-forest/10 bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button onClick={goBack} className="inline-flex items-center gap-2 text-sm font-semibold text-forest" type="button"><BackIcon className="h-4 w-4" /> Home</button>
          <div className="flex items-center gap-2 font-bold"><WaveIcon className="h-5 w-5 text-moss" /> SwarVani · Visit</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={voice.toggleMute}
              aria-pressed={voice.muted}
              aria-label={voice.muted ? 'Unmute voice assistant' : 'Mute voice assistant'}
              title={voice.muted ? 'Unmute voice assistant' : 'Mute voice assistant'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                voice.muted ? 'bg-danger-soft text-danger' : 'bg-cream text-forest hover:bg-mint/60'
              }`}
            >
              {voice.muted ? <MutedIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{voice.muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-forest">{voice.status}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="rounded-card border border-forest/10 bg-paper p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Voice field register</p>
            <h1 className="mt-2 text-2xl font-extrabold">Speak the visit. Confirm the record.</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">The assistant discloses that it is AI, then listens. Check the extracted fields and correct anything before saving.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-forest/70">
              <span className="rounded-full bg-cream px-3 py-1.5">STT: {voice.meta?.stt ?? 'connecting'}</span>
              <span className="rounded-full bg-cream px-3 py-1.5">TTS: {voice.meta?.tts ?? 'connecting'}</span>
              <span className="rounded-full bg-cream px-3 py-1.5">Extraction: {voice.meta?.llm ?? 'rules'}</span>
            </div>
          </div>

          <div className="rounded-card border border-forest/10 bg-paper p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold">Conversation</h2>
              <span className="text-xs text-ink/45">{voice.sessionState.replaceAll('_', ' ')}</span>
            </div>
            <div className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto" aria-live="polite">
              {voice.turns.length === 0 && <p className="text-sm text-ink/45">The AI disclosure will appear here when the session connects.</p>}
              {voice.turns.map((turn) => (
                <p key={turn.id} className={`max-w-[92%] rounded-2xl px-4 py-3 text-base leading-relaxed ${turn.role === 'asha' ? 'ml-auto bg-forest text-cream' : turn.kind === 'danger' ? 'bg-danger-soft text-danger' : 'bg-cream text-ink'}`}>
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
              <input value={correction} onChange={(event) => setCorrection(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-forest/15 bg-cream px-4 py-3 text-sm outline-none focus:border-moss" placeholder={voice.record ? 'Correct one field, e.g. weight 52 kilo' : 'Or type a visit note'} aria-label="Visit note or correction" />
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
    </main>
  )
}
