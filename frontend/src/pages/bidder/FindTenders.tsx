import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, Field, Spinner, TenderCard, inputCls, money } from '../../components/ui'

export default function FindTenders() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [state, setState] = useState('')
  const [eligibleOnly, setEligibleOnly] = useState(false)

  const { data: filters } = useQuery({ queryKey: ['filters'], queryFn: () => api.get('/api/filters') })
  const params = { q, category, state, eligible_only: eligibleOnly ? '1' : '', page_size: 50 }
  const { data, isLoading } = useQuery({
    queryKey: ['tenders', params],
    queryFn: () => api.get('/api/tenders', params),
  })

  return (
    <div>
      <PageHeader title="Find Tenders" sub="Search every published tender, screened against your eligibility profile." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Keyword"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, buyer, ref no…" /></Field>
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {filters?.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="State">
            <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All States</option>
              {filters?.states?.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <label className="mt-6 flex items-center gap-2 text-[13px] text-ink-600">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
            Eligible only
          </label>
        </div>
      </Card>

      {isLoading ? <Spinner /> : (
        <Card title={`${data?.total ?? 0} tenders`}>
          <div className="space-y-2.5">
            {(data?.results ?? []).map((r: any) => (
              <TenderCard key={r.id} title={r.title} buyer={r.buyer} category={r.category}
                daysLeft={r.days_left} onClick={() => nav(`/app/tenders/${r.id}`)}
                stats={[
                  { label: 'Value', value: money(r.estimated_value) },
                  { label: 'EMD', value: money(r.emd) },
                  { label: 'Expected bidders', value: String(r.contestability?.expected_bidders ?? '—') },
                  { label: 'Match', value: r.match ? r.match.verdict.replace('_', ' ') : '—',
                    tone: r.match?.verdict === 'eligible' ? 'good' : undefined },
                ]} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
