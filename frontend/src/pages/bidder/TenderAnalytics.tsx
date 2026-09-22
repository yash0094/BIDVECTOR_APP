import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, ExportPdfButton, KpiTile, Spinner, money, pct } from '../../components/ui'

export default function TenderAnalytics() {
  const { data, isLoading } = useQuery({ queryKey: ['bidder-analytics'], queryFn: () => api.get('/api/bidder/analytics') })
  if (isLoading || !data) return <Spinner />

  const maxWinRate = Math.max(...data.win_rate_by_category.map((c: any) => c.win_rate), 0.01)

  return (
    <div data-pdf-root>
      <PageHeader title="Tender Analytics" sub="Since your account was created." action={<ExportPdfButton />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiTile label="Tenders monitored" value={data.tenders_monitored} />
        <KpiTile label="Bids submitted" value={data.bids_submitted} />
        <KpiTile label="Total won" value={data.total_won} sub={`${pct(data.hit_rate)} hit rate`} tone="good" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Win Rate by Category">
          {data.win_rate_by_category.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-ink-400">Not enough decided bids yet.</div>
          ) : (
            <div className="space-y-3">
              {data.win_rate_by_category.map((c: any) => (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-700">{c.category}</span>
                    <span className="font-semibold text-ink-900">{pct(c.win_rate)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full bg-brand-500" style={{ width: `${(c.win_rate / maxWinRate) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Capital">
          <div className="space-y-2 text-[13px]">
            <Row label="Working capital" value={money(data.capital.working_capital)} />
            <Row label="Deployed" value={money(data.capital.deployed)} />
            <Row label="Available" value={money(data.capital.available)} />
            <Row label="Utilisation" value={pct(data.capital.utilisation)} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-ink-50 py-1.5 last:border-0">
    <span className="text-ink-600">{label}</span><span className="font-medium text-ink-900">{value}</span>
  </div>
}
