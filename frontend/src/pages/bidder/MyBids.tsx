import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, DaysPill, money } from '../../components/ui'

const COLUMNS = [
  { key: 'watching', label: 'Watching' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
] as const

type Status = typeof COLUMNS[number]['key']
const FLOW: Record<Status, Status | null> = {
  watching: 'preparing', preparing: 'submitted', submitted: 'won', won: null, lost: null,
}

export default function MyBids() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['my-bids'], queryFn: () => api.get('/api/bidder/pipeline') })

  const move = useMutation({
    mutationFn: ({ tender_id, status }: { tender_id: number; status: string }) =>
      api.post('/api/bidder/pipeline', { tender_id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bids'] }),
  })

  if (isLoading || !data) return null
  const byStatus: Record<string, any[]> = {}
  for (const c of COLUMNS) byStatus[c.key] = []
  for (const p of data.pipeline) (byStatus[p.status] ?? (byStatus[p.status] = [])).push(p)

  return (
    <div>
      <PageHeader title="My Bids" sub="Move a card forward as work progresses." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-lg bg-ink-100/60 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase text-ink-500">{col.label}</span>
              <span className="text-[11px] text-ink-400">{byStatus[col.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(byStatus[col.key] ?? []).map((p) => (
                <div key={p.id} className="rounded-md border border-ink-200 bg-white p-2.5 shadow-sm">
                  <div className="cursor-pointer" onClick={() => nav(`/app/tenders/${p.tender_id}`)}>
                    <div className="text-[13px] font-medium text-ink-800">{p.title}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{p.buyer}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="mono text-[11px] text-ink-600">{money(p.our_bid)}</span>
                      <DaysPill days={p.days_left} />
                    </div>
                  </div>
                  {FLOW[col.key] && (
                    <Button variant="ghost" className="mt-2 w-full !py-1 text-[11px]"
                            onClick={() => move.mutate({ tender_id: p.tender_id, status: FLOW[col.key]! })}>
                      Advance &rarr;
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
