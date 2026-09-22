import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PublicBanner } from '../../components/PublicShell'
import { Card, Field, Spinner, inputCls, money, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function AwardsResults() {
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['public-awards', q], queryFn: () => api.get('/api/public/awards', { q }),
  })

  return (
    <div>
      <PublicBanner />
      <Card className="mb-4">
        <Field label="Search awards">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, buyer, winner…" />
        </Field>
      </Card>
      <Card title={`${data?.total ?? 0} awards`}>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.results ?? []}
            columns={[
              { key: 'ref', header: 'Ref No.', render: (r: any) => r.ref_no },
              { key: 'title', header: 'Title', render: (r: any) => r.title },
              { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
              { key: 'winner', header: 'Winner', render: (r: any) => r.winner },
              { key: 'value', header: 'Estimated', align: 'right', numeric: true, render: (r: any) => money(r.estimated_value) },
              { key: 'winning', header: 'Winning bid', align: 'right', numeric: true, render: (r: any) => money(r.winning_bid) },
              { key: 'ratio', header: 'L1 ratio', align: 'right', numeric: true, render: (r: any) => pct(r.l1_ratio) },
              { key: 'bidders', header: 'Bidders', align: 'right', numeric: true, render: (r: any) => r.n_bidders },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
