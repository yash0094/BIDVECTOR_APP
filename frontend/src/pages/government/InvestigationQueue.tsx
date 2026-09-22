import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, RiskBadge, Spinner } from '../../components/ui'

export default function InvestigationQueue() {
  const { data, isLoading } = useQuery({ queryKey: ['gov-investigation'], queryFn: () => api.get('/api/government/investigation-queue') })

  return (
    <div>
      <PageHeader title="Investigation Queue" sub="The highest-risk buckets from the anomaly screen -- the subset that actually warrants a human follow-up." />
      {isLoading ? <Spinner /> : (
        <div className="space-y-3">
          {(data?.cases ?? []).length === 0 && (
            <Card><div className="py-4 text-center text-[13px] text-ink-400">No elevated-risk cases right now.</div></Card>
          )}
          {data?.cases?.map((c: any, i: number) => (
            <Card key={i} title={`${c.buyer} · ${c.category}`} action={<RiskBadge risk={c.risk} />}>
              <div className="grid grid-cols-3 gap-3 text-[13px]">
                <div><div className="text-[11px] uppercase text-ink-400">Tenders</div><div className="font-medium">{c.n_tenders}</div></div>
                <div><div className="text-[11px] uppercase text-ink-400">High-severity flags</div><div className="font-medium text-danger-500">{c.flags_high}</div></div>
                <div><div className="text-[11px] uppercase text-ink-400">Top flag</div><div className="font-medium">{c.top_flag ?? '—'}</div></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
