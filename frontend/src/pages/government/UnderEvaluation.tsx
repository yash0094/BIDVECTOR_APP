import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function UnderEvaluation() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['gov-evaluation'], queryFn: () => api.get('/api/government/evaluation') })

  const award = useMutation({
    mutationFn: ({ tid, sid }: { tid: number; sid: number }) =>
      api.post(`/api/government/tenders/${tid}/award`, { submission_id: sid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gov-evaluation'] }),
  })

  return (
    <div>
      <PageHeader title="Under Evaluation" sub="Tenders with submissions awaiting a decision." />
      <Card>
        <DataGrid
          rows={data?.tenders ?? []}
          onRowClick={(r: any) => nav(`/gov/tenders/${r.id}`)}
          emptyLabel={isLoading ? 'Loading…' : 'Nothing awaiting evaluation right now.'}
          columns={[
            { key: 'ref', header: 'Tender ID', render: (r: any) => r.ref_no },
            { key: 'title', header: 'Title', render: (r: any) => r.title },
            { key: 'bids', header: 'Bids Received', align: 'right', numeric: true, render: (r: any) => r.bids_received },
            { key: 'opened', header: 'Opened On', align: 'right', render: (r: any) => r.opened_on },
            { key: 'l1', header: 'L1 Bidder', render: (r: any) => r.l1_bidder },
            { key: 'action', header: '', align: 'right', render: (r: any) => (
              <Button className="!py-1 text-[11px]"
                      onClick={(e: any) => { e.stopPropagation(); award.mutate({ tid: r.id, sid: r.l1_submission_id }) }}
                      disabled={award.isPending}>
                Award
              </Button>
            ) },
          ]}
        />
      </Card>
    </div>
  )
}
