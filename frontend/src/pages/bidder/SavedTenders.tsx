import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, EmptyState, TenderCard, money } from '../../components/ui'

export default function SavedTenders() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['bookmarks'], queryFn: () => api.get('/api/bidder/bookmarks') })

  const remove = useMutation({
    mutationFn: (tenderId: number) => api.del(`/api/bidder/bookmarks/${tenderId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })

  return (
    <div>
      <PageHeader title="Saved Tenders" sub="Tenders you've bookmarked to watch, without adding them to My Bids yet." />
      <Card>
        {!isLoading && (!data?.bookmarks || data.bookmarks.length === 0) && (
          <EmptyState>Tap "Save tender" on any tender's detail page to see it here.</EmptyState>
        )}
        <div className="space-y-2.5">
          {data?.bookmarks?.map((r: any) => (
            <div key={r.bookmark_id} className="group relative">
              <TenderCard title={r.title} buyer={r.buyer} category={r.category} daysLeft={r.days_left}
                onClick={() => nav(`/app/tenders/${r.id}`)}
                stats={[
                  { label: 'Value', value: money(r.estimated_value) },
                  { label: 'EMD', value: money(r.emd) },
                  { label: 'Closes', value: r.closes_at },
                  { label: 'Saved', value: r.bookmarked_at },
                ]} />
              <button
                onClick={(e) => { e.stopPropagation(); remove.mutate(r.id) }}
                className="absolute right-3 top-3 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-danger-500 opacity-0 shadow-sm ring-1 ring-ink-200 group-hover:opacity-100">
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
