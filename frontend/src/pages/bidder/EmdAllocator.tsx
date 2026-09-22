import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/Shell'
import { Button, Card, ExportPdfButton, Field, KpiTile, inputCls, money, pct } from '../../components/ui'
import { DataGrid } from '../../components/DataGrid'

export default function EmdAllocator() {
  const [capital, setCapital] = useState('')
  const [maxBids, setMaxBids] = useState('6')
  const optimise = useMutation({
    mutationFn: () => api.post('/api/bidder/portfolio/optimise', {
      capital: capital ? Number(capital) : undefined, max_bids: Number(maxBids),
    }),
  })

  return (
    <div data-pdf-root>
      <PageHeader title="EMD Allocator" sub="EMD-constrained selection of which open tenders to bid, given your working capital."
        action={<ExportPdfButton />} />
      <Card className="no-print mb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Working capital (INR)"><input className={inputCls} value={capital}
                onChange={(e) => setCapital(e.target.value)} placeholder="from your profile" /></Field>
          <Field label="Max concurrent bids"><input className={inputCls} value={maxBids}
                onChange={(e) => setMaxBids(e.target.value)} /></Field>
          <div className="col-span-2 flex items-end">
            <Button onClick={() => optimise.mutate()} disabled={optimise.isPending}>
              {optimise.isPending ? 'Allocating…' : 'Allocate EMD'}
            </Button>
          </div>
        </div>
      </Card>

      {optimise.data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Bids selected" value={optimise.data.totals.bids} sub={`of ${optimise.data.considered} considered`} />
            <KpiTile label="EMD committed" value={money(optimise.data.totals.emd_committed)} />
            <KpiTile label="Expected profit" value={money(optimise.data.totals.expected_profit)} tone="good" />
            <KpiTile label="Shadow price / lakh" value={money(optimise.data.shadow_price?.per_lakh)}
                     sub="value of one more lakh of capital" />
          </div>
          <Card title="Selected bids (EMD Allocation)">
            <DataGrid
              rows={optimise.data.selected}
              columns={[
                { key: 'title', header: 'Tender', render: (r: any) => r.title },
                { key: 'buyer', header: 'Buyer', render: (r: any) => r.buyer },
                { key: 'bid', header: 'Reco. bid', align: 'right', numeric: true, render: (r: any) => money(r.recommended_bid) },
                { key: 'emd', header: 'EMD required', align: 'right', numeric: true, render: (r: any) => money(r.emd) },
                { key: 'win', header: 'Win %', align: 'right', numeric: true, render: (r: any) => pct(r.win_prob) },
                { key: 'ev', header: 'Exp. profit', align: 'right', numeric: true, render: (r: any) => money(r.expected_profit) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  )
}
