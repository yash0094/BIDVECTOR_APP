import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PublicBanner } from '../../components/PublicShell'
import { Card, ExportPdfButton, Spinner, money, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'
import { PageHeader } from '../../components/Shell'

export default function PriceTransparency() {
  const { data, isLoading } = useQuery({ queryKey: ['price-transparency'], queryFn: () => api.get('/api/public/price-transparency') })

  return (
    <div data-pdf-root>
      <PublicBanner />
      <PageHeader title="Price Transparency"
        sub="Estimated value vs. actual winning bid, by category -- how much competitive bidding actually saved."
        action={<ExportPdfButton />} />
      <Card>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.by_category ?? []}
            columns={[
              { key: 'category', header: 'Category', render: (r: any) => r.category },
              { key: 'n', header: 'Awards', align: 'right', numeric: true, render: (r: any) => r.n },
              { key: 'est', header: 'Total estimated', align: 'right', numeric: true, render: (r: any) => money(r.total_estimated) },
              { key: 'awarded', header: 'Total awarded', align: 'right', numeric: true, render: (r: any) => money(r.total_awarded) },
              { key: 'ratio', header: 'Avg L1 ratio', align: 'right', numeric: true, render: (r: any) => pct(r.avg_l1_ratio) },
              { key: 'savings', header: 'Savings vs. estimate', align: 'right', numeric: true, render: (r: any) => (
                <span className={r.savings_pct >= 0 ? 'text-success-500' : 'text-danger-500'}>{r.savings_pct}%</span>
              ) },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
