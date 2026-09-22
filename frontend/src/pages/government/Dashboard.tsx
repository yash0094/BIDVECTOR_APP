import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, ExportPdfButton, KpiTile, RiskBadge, Spinner, money } from '../../components/ui'

export default function Dashboard() {
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['gov-dashboard'], queryFn: () => api.get('/api/government/dashboard') })
  if (isLoading || !data) return <Spinner />
  const t = data.totals

  return (
    <div data-pdf-root>
      <PageHeader title="Government Procurement Dashboard" action={<ExportPdfButton />} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiTile label="Active Tenders" value={t.active_tenders} sub="Currently published" />
        <KpiTile label="Under Evaluation" value={t.under_evaluation} sub="In progress" />
        <KpiTile label="Awarded Tenders" value={t.awarded_tenders} sub="All time" />
        <KpiTile label="Total Procurement Value" value={money(t.total_value)} />
        <KpiTile label="Cases Requiring Review" value={t.cases_requiring_review} tone={t.cases_requiring_review > 0 ? 'bad' : 'default'} sub="Pending investigation" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Recent Tenders">
          <div className="space-y-1.5 text-[13px]">
            {data.recent_tenders.map((r: any) => (
              <div key={r.id} onClick={() => nav(`/gov/tenders/${r.id}`)}
                   className="flex cursor-pointer items-center justify-between border-b border-ink-50 py-2 last:border-0 hover:bg-ink-50">
                <div>
                  <div className="font-medium text-ink-800">{r.title}</div>
                  <div className="text-[11px] text-ink-500">{r.ref_no} · {r.buyer}</div>
                </div>
                <span className="mono text-[11px] text-ink-500">{money(r.estimated_value)}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Anomaly Queue">
            <div className="space-y-2">
              {data.anomaly_queue.length === 0 && <div className="text-[13px] text-ink-400">No elevated-risk buckets right now.</div>}
              {data.anomaly_queue.map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-ink-50 py-1.5 text-[13px] last:border-0">
                  <span className="text-ink-700">{b.buyer} · {b.category}</span>
                  <RiskBadge risk={b.risk} />
                </div>
              ))}
              <button onClick={() => nav('/gov/anomaly-signals')} className="text-[12px] font-medium text-brand-600 hover:underline">
                Review all &rarr;
              </button>
            </div>
          </Card>
          <Card title="Procurement by Category">
            <div className="space-y-2">
              {data.procurement_by_category.map((c: any) => (
                <div key={c.category} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-700">{c.category}</span>
                  <span className="font-medium text-ink-900">{c.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
