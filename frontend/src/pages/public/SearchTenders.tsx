import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PublicBanner } from '../../components/PublicShell'
import { Card, Field, Spinner, inputCls, money } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function SearchTenders() {
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['public-tenders', q], queryFn: () => api.get('/api/public/tenders', { q }),
  })

  return (
    <div>
      <PublicBanner />
      <Card className="mb-4">
        <Field label="Search tenders">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, buyer, reference number…" />
        </Field>
      </Card>
      <Card title={`${data?.total ?? 0} tenders`}>
        {isLoading ? <Spinner /> : (
          <DataGrid
            rows={data?.results ?? []}
            columns={[
              { key: 'ref', header: 'Ref No.', render: (r: any) => r.ref_no },
              { key: 'title', header: 'Title', render: (r: any) => r.title },
              { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
              { key: 'value', header: 'Value', align: 'right', numeric: true, render: (r: any) => money(r.estimated_value) },
              { key: 'closes', header: 'Closes', align: 'right', render: (r: any) => r.closes_at },
              { key: 'status', header: 'Status', align: 'center', render: (r: any) => (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  r.public_status === 'Awarded' ? 'bg-success-100 text-success-500'
                  : r.public_status === 'Closing Soon' ? 'bg-danger-100 text-danger-500'
                  : 'bg-brand-100 text-brand-700'}`}>
                  {r.public_status}
                </span>
              ) },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
