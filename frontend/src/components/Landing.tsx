import { useEffect, useState } from 'react'
import type { WorkerProfile } from '../lib/auth'
import { workerInitials } from '../lib/auth'
import { ArrowIcon, ClipboardIcon, ListIcon, LogoutIcon, MicIcon, PhoneIcon, ShieldIcon, SparkIcon, UserIcon, WaveIcon } from './Icons'

type Props = {
  user: WorkerProfile | null
  onStart: () => void
  onRecords: () => void
  onSignIn: () => void
  onSignOut: () => void
}
type DangerPreview = { key: string; labelEn: string; labelHi: string; who: string }

const STEPS = [
  {
    title: 'She speaks the visit',
    body: 'Hinglish, Hindi or English, with health terms mixed in: "TT injection de diya, IFA goli di hai".',
  },
  {
    title: 'Safety check runs first',
    body: 'A rule engine scans every word against a cited danger-sign list before any model sees it.',
  },
  {
    title: 'The form is read back',
    body: 'She hears the structured record. "Nahi, wajan 2.8 kilo" changes only that field.',
  },
  {
    title: 'Save and follow up',
    body: 'The visit is stored, flagged if needed, and added to the follow-up board for the next round.',
  },
]

const GAPS = [
  {
    title: 'Typing on a 4-inch screen',
    body: 'There is no desk between two houses. Fields get reconstructed from memory at night, so records arrive late and incomplete.',
  },
  {
    title: 'Generic speech tools mangle the words',
    body: 'TT injection, ANC checkup, IFA goli, haemoglobin. Off-the-shelf assistants are trained on clean English, not on a lane in Bihar.',
  },
  {
    title: 'Nothing stands between a mishearing and the register',
    body: 'A wrong weight or a wrong date is written down silently, then used in the next decision. There is no confirm step.',
  },
]

const VISIT_PATHS = [
  { code: 'ANC', title: 'Pregnancy visits', body: 'Capture antenatal checkups, key measurements, supplements and the next visit date.' },
  { code: 'PNC', title: 'Postnatal care', body: 'Record a postnatal contact and keep the follow-up action with the visit.' },
  { code: 'NEWBORN', title: 'Newborn checks', body: 'Log newborn observations and surface a danger-sign flag when a listed phrase is heard.' },
  { code: 'IMMUNISATION', title: 'Immunisation', body: 'Record the vaccine mentioned and the next visit information in a structured form.' },
]

export default function Landing({ user, onStart, onRecords, onSignIn, onSignOut }: Props) {
  const [dangerPreview, setDangerPreview] = useState<DangerPreview[]>([])
  const [dangerSource, setDangerSource] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/danger-signs')
      .then((response) => response.ok ? response.json() as Promise<{ signs: DangerPreview[]; source: string }> : Promise.reject())
      .then((payload) => {
        if (!active) return
        setDangerPreview(payload.signs ?? [])
        setDangerSource(payload.source ?? '')
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  return (
    <div className="landing-page min-h-screen bg-[#11120f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10110f]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center border border-white/20 bg-white/5 text-[#e7b665]">
              <WaveIcon className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">स्वरवाणी</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">SwarVani</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/65 md:flex">
            <a className="transition hover:text-white" href="#problem">
              Problem
            </a>
            <a className="transition hover:text-white" href="#how">
              How it works
            </a>
            <a className="transition hover:text-white" href="#visits">
              Visit types
            </a>
            <a className="transition hover:text-white" href="#safety">
              Safety
            </a>
            <button className="transition hover:text-white" onClick={onRecords} type="button">
              Follow-ups
            </button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="group relative">
                <button type="button" className="flex items-center gap-2 border border-forest/15 bg-paper px-2.5 py-2 text-left">
                  <span className="grid h-8 w-8 place-items-center bg-turmeric text-xs font-extrabold text-forest">{workerInitials(user.name)}</span>
                  <span className="hidden sm:block"><span className="block text-xs font-bold">{user.name}</span><span className="block text-[10px] text-ink/45">{user.workerId}</span></span>
                </button>
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 border border-forest/15 bg-paper p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <button onClick={onSignOut} type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft"><LogoutIcon className="h-4 w-4" /> Sign out</button>
                </div>
              </div>
            ) : (
              <button onClick={onSignIn} type="button" className="hidden items-center gap-2 px-3 py-2 text-sm font-bold text-white/80 hover:text-white sm:inline-flex"><UserIcon className="h-4 w-4" /> Sign in</button>
            )}
            <button className="inline-flex items-center gap-2 bg-[#e7b665] px-4 py-2.5 text-sm font-bold text-[#171713] transition hover:bg-[#f0c879]" onClick={onStart} type="button">
              <MicIcon className="h-4 w-4" /> Start a visit
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ---------------------------------------------------------- hero */}
        <section className="hero-scene relative min-h-[45rem] overflow-hidden border-b border-white/10 bg-[#10110f] text-white">
          <video
            className="hero-video absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/swarvani-field.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-wash absolute inset-0" />
          <div className="hero-video-vignette absolute inset-0" />
          <div className="field-lines pointer-events-none absolute inset-0 opacity-10" />
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:pb-24 lg:pt-20">
            <div className="relative">
              <span className="inline-flex items-center gap-2 border border-cream/25 bg-forest-deep/45 px-3.5 py-1.5 text-xs font-semibold text-mint backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-turmeric" />
                Healthcare · Gnani Voice Hackathon
              </span>

              <h1 className="mt-6 font-display text-[3.15rem] leading-[0.96] tracking-[-0.035em] sm:text-7xl">
                Speak the visit.
                <br />
                <span className="relative inline-block">
                  <em className="relative z-10 font-normal text-mint">Confirm the record.</em>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-turmeric/40" />
                </span>
                <br />
                Know what to do next.
              </h1>

              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-cream/75 sm:text-base">
                ASHA workers log antenatal, newborn and immunisation visits by typing on small phone screens or
                writing in paper registers. SwarVani takes her spoken note — Hinglish, health terms and all —
                turns it into a structured record, reads it back for confirmation, and raises a referral alert the
                moment a danger sign is spoken.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center gap-2.5 bg-[#e7b665] px-6 py-3.5 text-sm font-bold text-[#171713] shadow-lg transition hover:bg-[#f0c879]"
                  onClick={onStart}
                  type="button"
                >
                  <MicIcon className="h-4 w-4" />
                  Start a voice visit
                  <ArrowIcon className="h-4 w-4" />
                </button>
                <a
                  className="inline-flex items-center justify-center gap-2 border border-white/35 bg-black/25 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/45"
                  href="#how"
                >
                  See the pipeline
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-cream/55">
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon className="h-4 w-4" /> Runs in a phone browser
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldIcon className="h-4 w-4" /> Fixed referral templates
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SparkIcon className="h-4 w-4" /> No typing, no diagnosis
                </span>
              </div>
            </div>

            <FieldMoment />
          </div>
        </section>

        {/* --------------------------------------------------------- trust */}
        <section className="border-b border-forest/10 bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-6 text-xs font-medium text-ink/60 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <span className="h-px w-6 bg-turmeric" /> Required speech stack: Gnani Prisma v3.0 + Timbre v3.0
            </span>
            <span className="flex items-center gap-2">
              <span className="h-px w-6 bg-turmeric" /> Deterministic danger-sign engine
            </span>
            <span className="flex items-center gap-2">
              <span className="h-px w-6 bg-turmeric" /> Open-choice LLM · rule-based safety check
            </span>
          </div>
        </section>

        {/* ------------------------------------------------------- problem */}
        <section id="problem" className="border-b border-forest/10">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">The gap</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.6rem]">
              The record is written after the walk, not during it.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
              The intelligence is not the missing piece. Reliability, safety and workflow under real field
              conditions are.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {GAPS.map((gap, i) => (
                <article
                  key={gap.title}
                  className="group rounded-card border border-forest/12 bg-paper p-6 transition hover:-translate-y-0.5 hover:border-forest/25"
                >
                  <span className="font-mono text-xs font-semibold text-turmeric">0{i + 1}</span>
                  <h3 className="mt-4 text-lg font-bold leading-snug">{gap.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink/65">{gap.body}</p>
                </article>
              ))}
            </div>

            <figure className="mt-10 rounded-card bg-forest px-6 py-8 text-cream sm:px-10">
              <blockquote className="max-w-3xl font-hindi text-lg leading-relaxed text-mint sm:text-xl">
                “Sunita Devi ka ANC checkup kiya, weight 52 kilo, TT injection de diya, IFA goli di hai, agle
                mahine 15 ko aana hai.”
              </blockquote>
              <figcaption className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/60">
                <span className="rounded-full bg-cream/10 px-2.5 py-1 font-semibold text-cream/85">One utterance</span>
                <span>beneficiary · visit type · weight · vaccination · supplement · next visit</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ------------------------------------------------------ workflow */}
        <section id="how" className="border-b border-forest/10 bg-paper">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">The pipeline</p>
                <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.6rem]">
                  Four steps, one spoken sentence.
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-forest/70">
                {['React + Tailwind', 'FastAPI WebSocket', 'Gnani Prisma v3.0 STT', 'Open-choice LLM', 'Gnani Timbre v3.0 TTS'].map(
                  (chip) => (
                    <span key={chip} className="rounded-full border border-forest/15 bg-cream px-3 py-1.5">
                      {chip}
                    </span>
                  ),
                )}
              </div>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative rounded-card border border-forest/12 bg-cream/60 p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-xs font-bold text-cream">
                      {i + 1}
                    </span>
                    <span className="h-px flex-1 bg-forest/15" />
                  </div>
                  <h3 className="mt-5 text-base font-bold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ----------------------------------------------------- visit paths */}
        <section id="visits" className="border-b border-forest/10 bg-paper">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">Visit pathways</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.6rem]">
                One voice workflow for the visits ASHAs make every day.
              </h2>
              <span className="rounded-full border border-forest/15 bg-cream px-3 py-1.5 text-xs font-semibold text-forest">
                Structured visit record
              </span>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VISIT_PATHS.map((visit) => (
                <article key={visit.code} className="rounded-card border border-forest/12 bg-cream/60 p-5">
                  <span className="font-mono text-[11px] font-bold tracking-wider text-moss">{visit.code}</span>
                  <h3 className="mt-3 text-base font-bold">{visit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{visit.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink/45">
              Prototype pathways reflect the current record schema. They are not a replacement for official registers or clinical review.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- safety */}
        <section id="safety" className="border-b border-forest/10">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-card bg-forest-deep p-8 text-cream sm:p-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-danger/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#ffcdc1]">
                  <ShieldIcon className="h-4 w-4" /> Safety layer
                </span>
                <h2 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  A missed danger sign costs double.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-cream/70">
                  The model never decides whether to escalate. Every transcript passes through a rule engine
                  built from public-health referral criteria, across spellings and code-mix variants, before
                  extraction runs. A weak or uncertain match is still a flag.
                </p>
                <ul className="mt-7 space-y-3 text-sm text-cream/80">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-turmeric" />
                    Referral wording comes from fixed templates, spoken in her language, never generated.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-turmeric" />
                    No diagnosis, no treatment, no dosage — the alert says “refer to the PHC now”.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-turmeric" />
                    This phrase matcher is a prototype; it surfaces terms for human review and does not determine a diagnosis.
                  </li>
                </ul>
              </div>

              <div className="rounded-card border border-danger/20 bg-paper p-8 sm:p-10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-danger">
                    Danger signs checked
                  </p>
                  <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger">
                    {dangerPreview.length ? `${dangerPreview.length} phrases · guideline references` : 'Guideline-based phrase list'}
                  </span>
                </div>
                <ul className="mt-6 divide-y divide-forest/10">
                  {dangerPreview.map((sign) => (
                    <li key={sign.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="text-ink/80">{sign.labelEn}</span>
                      <span className="shrink-0 rounded-md bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
                        {sign.who}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[11px] leading-relaxed text-ink/45">
                  {dangerSource || 'Source references are listed in the project README.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- impact */}
        <section className="border-b border-forest/10 bg-paper">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">Who it helps</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.6rem]">
              Less typing in the lane. Faster records in the PHC.
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <MicIcon className="h-5 w-5" />,
                  title: 'ASHA workers',
                  body: 'Log the visit while it is still fresh, hands-free, in her own language. The follow-up list builds itself.',
                },
                {
                  icon: <ShieldIcon className="h-5 w-5" />,
                  title: 'Mothers and newborns',
                  body: 'Danger signs surface before she leaves the house, with a clear refer-to-PHC action instead of a missed visit.',
                },
                {
                  icon: <ClipboardIcon className="h-5 w-5" />,
                  title: 'PHC and health system',
                  body: 'Structured, confirmed, timestamped records at the point of visit — not reconstructed at the end of the day.',
                },
              ].map((card) => (
                <article key={card.title} className="rounded-card border border-forest/12 bg-cream/60 p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-mint">{card.icon}</span>
                  <h3 className="mt-5 text-lg font-bold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{card.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-[11px] font-semibold text-forest/70">
              {[
                'AI disclosure in the first turn',
                'Encryption configurable by environment',
                'Transcript purge endpoint available',
                'No voice cloning',
                'API keys out of the repo',
              ].map((chip) => (
                <span key={chip} className="rounded-full border border-forest/15 px-3 py-1.5">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- cta */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <div className="aurora overflow-hidden rounded-[2rem] border border-forest/15 bg-paper">
            <div className="flex flex-col items-start justify-between gap-8 p-8 sm:p-12 lg:flex-row lg:items-center">
              <div>
                <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.4rem]">
                  A walk between houses becomes a complete, confirmed record.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/65">
                  Try the prototype with synthetic notes. Set your Gnani API key to use live Prisma and Timbre speech; browser speech remains available for a local demo.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <button
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-cream transition hover:bg-forest-deep"
                  onClick={onStart}
                  type="button"
                >
                  <MicIcon className="h-4 w-4" /> Start a voice visit
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-forest/20 px-6 py-3.5 text-sm font-semibold text-forest transition hover:bg-cream"
                  onClick={onRecords}
                  type="button"
                >
                  <ListIcon className="h-4 w-4" /> Open follow-up board
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-forest/10 bg-cream">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-hindi text-sm font-semibold text-ink/70">स्वरवाणी</span> · SwarVani — voice field
            register for ASHA workers
          </p>
          <p>Use synthetic data only · Not for clinical use</p>
        </div>
      </footer>
    </div>
  )
}

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      <div className="absolute -right-4 -top-4 hidden rounded-xl border border-forest/15 bg-paper px-3 py-2 text-[10px] font-semibold text-forest shadow-sm sm:block">
        example session · hi-IN
      </div>

      <div className="rounded-[2.2rem] border border-forest/20 bg-forest-deep p-2.5 shadow-2xl shadow-forest/25">
        <div className="overflow-hidden rounded-[1.7rem] bg-paper">
          <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-forest text-mint">
                <WaveIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[11px] font-bold">Visit · live</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-moss">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-moss" /> listening
            </span>
          </div>

          <div className="space-y-3 px-4 py-4">
            <p className="rounded-2xl rounded-tl-sm bg-cream px-3.5 py-2.5 font-hindi text-[12px] leading-relaxed text-ink/75">
              “Sunita Devi ka ANC checkup kiya, weight 52 kilo, TT injection de diya…”
            </p>

            <div className="rounded-xl border border-forest/12">
              {[
                ['Beneficiary', 'Sunita Devi'],
                ['Visit type', 'ANC checkup'],
                ['Wajan', '52 kg'],
                ['TT injection', 'Given'],
                ['IFA goli', 'Given'],
                ['Agli visit', '15 Dec'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-forest/8 px-3 py-2 last:border-0"
                >
                  <span className="text-[10px] uppercase tracking-wide text-ink/40">{label}</span>
                  <span className="text-[11px] font-semibold text-ink/80">{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-danger/25 bg-danger-soft px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-danger">
                <ShieldIcon className="h-3.5 w-3.5" /> Danger sign
              </p>
              <p className="mt-1 text-[11px] leading-snug text-danger/90">
                Saans tez chal rahi hai — turant PHC le jaiye.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-forest px-3 py-2.5">
              <MicIcon className="h-4 w-4 text-mint" />
              <span className="text-[10px] font-medium text-cream/80">“Sahi hai? Haan ya galat boliye.”</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-forest/15 bg-paper px-3 py-2 text-[10px] font-semibold text-forest shadow-sm sm:block">
        confirm before save
      </div>
    </div>
  )
}

function FieldMoment() {
  return (
    <div className="relative mx-auto w-full max-w-[25rem] lg:mt-14">
      <div className="border border-cream/30 bg-forest-deep/55 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <div className="flex items-center justify-between border-b border-cream/15 pb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-cream/65">
          <span>Field note · 10:42 am</span>
          <span className="flex items-center gap-1.5 text-[#f4c66b]"><span className="h-1.5 w-1.5 rounded-full bg-[#f4c66b]" /> live</span>
        </div>
        <blockquote className="mt-5 font-display text-3xl leading-[1.02] text-cream sm:text-4xl">
          “Sunita Devi ka checkup kiya…”
        </blockquote>
        <p className="mt-4 font-hindi text-sm leading-relaxed text-mint/85">आवाज़ से रिकॉर्ड तक — घर पर, उसी पल।</p>
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-cream/15 pt-4 text-[10px] font-semibold uppercase tracking-wide text-cream/55">
          <span><strong className="block text-lg text-cream">01</strong> speak</span>
          <span><strong className="block text-lg text-cream">02</strong> confirm</span>
          <span><strong className="block text-lg text-cream">03</strong> follow up</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 border border-[#f4c66b]/40 bg-[#f4c66b] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-forest shadow-lg">
        Voice-first care
      </div>
    </div>
  )
}
