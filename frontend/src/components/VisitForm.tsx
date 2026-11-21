import type { VisitRecord } from '../lib/types'
import { ClipboardIcon } from './Icons'

type Props = {
  record: VisitRecord | null
  missing: string[]
  extraction: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export default function VisitForm({ record, missing, extraction }: Props) {
  const rows: { label: string; field: string; value: string }[] = [
    { label: 'Beneficiary', field: 'beneficiaryName', value: record?.beneficiaryName ?? '—' },
    { label: 'Beneficiary ID', field: 'beneficiaryId', value: record?.beneficiaryId ?? '—' },
    { label: 'Visit type', field: 'visitType', value: record?.visitType ?? '—' },
    { label: 'Weight', field: 'weightKg', value: record?.weightKg != null ? `${record.weightKg} kg` : '—' },
    { label: 'BP', field: 'bp', value: record?.bp ?? '—' },
    { label: 'Hb', field: 'hb', value: record?.hb != null ? `${record.hb} g/dL` : '—' },
    { label: 'Vaccination', field: 'vaccination', value: record?.vaccination ?? '—' },
    {
      label: 'Supplements',
      field: 'supplements',
      value: record?.supplements?.length ? record.supplements.join(', ') : '—',
    },
    { label: 'Next visit', field: 'nextVisit', value: formatDate(record?.nextVisit ?? null) },
  ]

  return (
    <section className="overflow-hidden rounded-card border border-forest/12 bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest text-mint">
            <ClipboardIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Visit record</h2>
            <p className="text-[11px] text-ink/45">
              {record ? `ID ${record.id}` : 'Waiting for the first utterance'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest/70">
            {extraction === 'llm' ? 'LLM extraction' : extraction === 'correction' ? 'Field patch' : 'Rule extraction'}
          </span>
          {missing.length > 0 && record && (
            <span className="rounded-full bg-turmeric/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8a5a12]">
              {missing.length} missing
            </span>
          )}
        </div>
      </div>

      <dl className="divide-y divide-forest/8">
        {rows.map((row) => {
          const isMissing = missing.includes(row.field)
          return (
            <div key={row.field} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink/40">{row.label}</dt>
              <dd className={`text-right text-sm ${isMissing ? 'font-semibold text-[#8a5a12]' : row.value === '—' ? 'text-ink/25' : 'font-semibold text-ink'}`}>
                {isMissing ? 'Need to capture' : row.value}
              </dd>
            </div>
          )
        })}
      </dl>

      {record?.transcript ? (
        <div className="border-t border-forest/10 bg-cream/60 px-5 py-3">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/60">Raw transcript</p>
          <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-hindi text-lg leading-8 text-ink/85">{record.transcript}</p>
        </div>
      ) : null}
    </section>
  )
}
