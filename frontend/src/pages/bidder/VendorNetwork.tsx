import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, Spinner, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function VendorNetwork() {
  const { data, isLoading } = useQuery({ queryKey: ['vendor-network'], queryFn: () => api.get('/api/bidder/vendor-network') })

  return (
    <div>
      <PageHeader title="Vendor Network"
        sub="Other firms you tend to share a tender bucket with, and who wins more often." />
      <Card title={data ? `Categories: ${data.categories.join(', ') || '—'}` : 'Loading…'}>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.network ?? []}
            columns={[
              { key: 'bidder', header: 'Firm', render: (r: any) => r.bidder },
              { key: 'shared', header: 'Shared tenders', align: 'right', numeric: true, render: (r: any) => r.shared_tenders },
              { key: 'wins', header: 'Wins', align: 'right', numeric: true, render: (r: any) => r.wins },
              { key: 'win_rate', header: 'Win rate', align: 'right', numeric: true, render: (r: any) => pct(r.win_rate) },
              { key: 'ratio', header: 'Avg bid ratio', align: 'right', numeric: true, render: (r: any) => pct(r.avg_ratio) },
            ]}
            emptyLabel="No shared-tender history for your categories yet."
          />
        )}
      </Card>
    </div>
  )
}
