import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, KpiTile, Spinner, TenderCard, money, pct } from '../../components/ui'
import { IconBell } from '../../components/Icons'

export default function Dashboard() {
  const nav = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['bidder-dashboard'],
    queryFn: () => api.get('/api/bidder/dashboard'),
  })

  if (isLoading || !data) return <Spinner />
  const m = data.metrics

  return (
    <div>
      <PageHeader title="Command Centre" sub={`Welcome back, ${data.company}`} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Expected value (live bids)" value={money(m.expected_value_live)} tone="good" />
        <KpiTile label="Capital utilisation" value={pct(m.capital_utilisation)}
                 sub={`${money(m.emd_locked)} of ${money(m.working_capital)}`} />
        <KpiTile label="Win rate" value={m.win_rate === null ? '—' : pct(m.win_rate)}
                 sub={`${m.decided_count} decided`} />
        <KpiTile label="Active bids" value={m.active_bids} sub={`${m.screened_out} screened out (~${m.hours_saved}h saved)`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Ranked opportunities" className="lg:col-span-2">
          <div className="space-y-2.5">
            {data.opportunities.length === 0 && (
              <div className="py-6 text-center text-[13px] text-ink-400">No open opportunities match your profile right now.</div>
            )}
            {data.opportunities.map((r: any) => (
              <TenderCard key={r.id} title={r.title} buyer={r.buyer} category={r.category}
                daysLeft={r.days_left} onClick={() => nav(`/app/tenders/${r.id}`)}
                stats={[
                  { label: 'Value', value: money(r.estimated_value) },
                  { label: 'Reco. bid', value: money(r.bid) },
                  { label: 'Win %', value: pct(r.win_prob), tone: 'good' },
                  { label: 'Exp. profit', value: money(r.expected_profit) },
                ]} />
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Tender Alerts" action={
            <span className="rounded-full bg-warn-100 px-2 py-0.5 text-[11px] font-semibold text-warn-500">
              {data.recent_alerts.length} new
            </span>}>
            <div className="space-y-2.5">
              {data.recent_alerts.length === 0 && <div className="text-[13px] text-ink-400">No alerts yet.</div>}
              {data.recent_alerts.map((a: any) => (
                <div key={a.id} className="flex gap-2 text-[12.5px]">
                  <IconBell width={14} height={14} className="mt-0.5 shrink-0 text-ink-400" />
                  <span className="text-ink-700">{a.message}</span>
                </div>
              ))}
              <button onClick={() => nav('/app/alerts')} className="text-[12px] font-medium text-brand-600 hover:underline">
                View all alerts &rarr;
              </button>
            </div>
          </Card>
          <Card title="Closing soon (your pipeline)">
            <div className="space-y-3">
              {data.closing_soon.length === 0 && <div className="text-[13px] text-ink-400">Nothing in prep right now.</div>}
              {data.closing_soon.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2">
                  <div>
                    <div className="text-[13px] font-medium text-ink-800">{p.title}</div>
                    <div className="text-[11px] text-ink-500">{p.buyer}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
