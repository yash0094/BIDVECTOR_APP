import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, EmptyState } from '../../components/ui'

const ROLE_LABEL: Record<string, string> = { bidder: 'Bidder / Contractor', government: 'Government Officer' }

export default function PendingApprovals() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pending-accounts'], queryFn: () => api.get('/api/government/pending-accounts'),
  })

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/api/government/pending-accounts/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-accounts'] }),
  })
  const reject = useMutation({
    mutationFn: (id: number) => api.post(`/api/government/pending-accounts/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-accounts'] }),
  })

  return (
    <div>
      <PageHeader title="Pending Approvals" sub="Self-registered accounts awaiting authorization before they can sign in." />
      <Card>
        {!isLoading && (!data?.accounts || data.accounts.length === 0) && (
          <EmptyState>No applications waiting for review.</EmptyState>
        )}
        <div className="space-y-2">
          {data?.accounts?.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium text-ink-800">{a.company_name}</div>
                <div className="text-[11.5px] text-ink-500">{a.email} &middot; {ROLE_LABEL[a.role] ?? a.role} &middot; applied {a.created_at}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="!py-1 text-[11px]" onClick={() => reject.mutate(a.id)} disabled={reject.isPending}>
                  Reject
                </Button>
                <Button className="!py-1 text-[11px]" onClick={() => approve.mutate(a.id)} disabled={approve.isPending}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
