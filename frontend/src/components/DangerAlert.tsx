import type { DangerSignInfo } from '../lib/types'
import { AlertIcon, ShieldIcon } from './Icons'

type Props = {
  signs: DangerSignInfo[]
  message: string
}

export default function DangerAlert({ signs, message }: Props) {
  if (!signs.length) return null

  return (
    <div className="mt-4 overflow-hidden rounded-card border border-danger/30 bg-danger-soft" role="alert">
      <div className="flex items-start gap-3 border-b border-danger/20 px-5 py-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger text-white">
          <AlertIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-danger">
            Danger sign · referral required
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-ink">{message}</p>
        </div>
      </div>

      <ul className="divide-y divide-danger/15">
        {signs.map((sign) => (
          <li key={sign.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{sign.labelEn}</p>
              <p className="font-hindi text-xs text-ink/60">{sign.labelHi}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                sign.confident ? 'bg-danger/15 text-danger' : 'bg-turmeric/25 text-[#8a5a12]'
              }`}
            >
              {sign.confident ? `matched: ${sign.matched}` : 'uncertain → flagged'}
            </span>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 border-t border-danger/15 px-5 py-3 text-[11px] leading-relaxed text-ink/55">
        <ShieldIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger/70" />
        <span>
          Rule-based flag from public-health referral criteria. No diagnosis, treatment or dosage advice is
          given. Source: {signs[0]?.source}
        </span>
      </p>
    </div>
  )
}
