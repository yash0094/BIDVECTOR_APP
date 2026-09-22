import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Card, Field, Spinner, inputCls, money, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function VendorRegistry() {
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-registry', q], queryFn: () => api.get('/api/government/vendor-registry', { q }),
  })

  return (
    <div>
      <PageHeader title="Vendor Registry" sub="Every bidder company and their track record." />
      <Card className="mb-4">
        <Field label="Search company name">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </Field>
      </Card>
      <Card>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.vendors ?? []}
            columns={[
              { key: 'name', header: 'Company', render: (r: any) => r.company_name },
              { key: 'bids', header: 'Bids', align: 'right', numeric: true, render: (r: any) => r.bids },
              { key: 'wins', header: 'Wins', align: 'right', numeric: true, render: (r: any) => r.wins },
              { key: 'hit', header: 'Hit rate', align: 'right', numeric: true, render: (r: any) => pct(r.hit_rate) },
              { key: 'won_value', header: 'Won value', align: 'right', numeric: true, render: (r: any) => money(r.won_value) },
              { key: 'ratio', header: 'Avg bid ratio', align: 'right', numeric: true, render: (r: any) => pct(r.avg_ratio) },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
