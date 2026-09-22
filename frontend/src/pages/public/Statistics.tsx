import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PublicBanner } from '../../components/PublicShell'
import { Card, ExportPdfButton, KpiTile, Spinner, money, pct } from '../../components/ui'
import { PageHeader } from '../../components/Shell'

export default function Statistics() {
  const { data, isLoading } = useQuery({ queryKey: ['public-statistics'], queryFn: () => api.get('/api/public/statistics') })
  if (isLoading || !data) return <Spinner />
  const t = data.totals
  const maxState = Math.max(...data.top_procuring_states.map((s: any) => s.value), 1)

  return (
    <div data-pdf-root>
      <PublicBanner />
      <PageHeader title="Procurement Statistics" action={<ExportPdfButton />} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Total Tenders (all time)" value={t.total_tenders?.toLocaleString('en-IN')} />
        <KpiTile label="Total Value (₹)" value={money(t.total_value)} tone="good" />
        <KpiTile label="Avg. Bidders / Tender" value={t.avg_bidders ? t.avg_bidders.toFixed(1) : '—'} />
        <KpiTile label="Avg. L1 Saving" value={t.avg_l1_saving != null ? pct(t.avg_l1_saving) : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top Procuring States">
          <div className="space-y-2.5">
            {data.top_procuring_states.map((s: any) => (
              <div key={s.state}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-700">{s.state}</span>
                  <span className="font-semibold text-ink-900">{money(s.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full bg-brand-500" style={{ width: `${(s.value / maxState) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Category Distribution">
          <div className="space-y-2.5">
            {data.category_distribution.map((c: any) => (
              <div key={c.category} className="flex items-center justify-between text-[12.5px]">
                <span className="text-ink-700">{c.category}</span>
                <span className="font-medium text-ink-900">{c.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
