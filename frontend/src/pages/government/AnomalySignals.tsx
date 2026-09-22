import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, ExportPdfButton, RiskBadge, Spinner } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function AnomalySignals() {
  const { data, isLoading } = useQuery({ queryKey: ['gov-anomaly'], queryFn: () => api.get('/api/government/anomaly-signals') })

  return (
    <div data-pdf-root>
      <PageHeader title="Anomaly Signals"
        sub="System-wide collusion screens across every tender caller, ranked by risk."
        action={<ExportPdfButton />} />
      <Card>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.buckets ?? []}
            columns={[
              { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
              { key: 'category', header: 'Category', render: (r: any) => r.category },
              { key: 'risk', header: 'Risk', align: 'center', render: (r: any) => <RiskBadge risk={r.risk} /> },
              { key: 'top', header: 'Top flag', render: (r: any) => r.top_flag ?? '—' },
              { key: 'flags_high', header: 'High flags', align: 'right', numeric: true, render: (r: any) => r.flags_high },
              { key: 'n', header: 'Tenders', align: 'right', numeric: true, render: (r: any) => r.n_tenders },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
