import type { ReactNode } from 'react'
import { useAuth, type Role } from '../../lib/auth'
import { PageHeader } from '../../components/Shell'
import { Card } from '../../components/ui'
import {
  IconHome, IconSearch, IconColumns, IconShieldAlert, IconWallet, IconBarChart,
  IconUsers, IconFileText, IconBell, IconUserCircle, IconBookmark, IconNetwork,
  IconClipboardList, IconAlertTriangle, IconLandmark, IconGauge, IconSettings,
} from '../../components/Icons'

interface Feature { icon: (p: { className?: string }) => ReactNode; title: string; desc: string }

const STEPS: Record<Role, string[]> = {
  bidder: [
    'Fill in your Company Profile (menu) — it drives eligibility matching and the bid model.',
    'Use Find Tenders to search live tenders, or check Command Centre for your ranked opportunities.',
    'Open a tender to see its recommended bid price and contestability analysis, then track it in My Bids.',
    'Use the EMD Allocator to pick which tenders to bid on within your working capital, and set Tender Alerts for the rest.',
  ],
  government: [
    'Create a tender under All Tenders — eligibility clauses are parsed automatically from what you paste in.',
    'Publish it once it looks right; it then appears to bidders under Find Tenders.',
    'When submissions come in, check Under Evaluation to compare bids and award a winner.',
    'Anomaly Signals and the Investigation Queue flag unusual bidding patterns across every tender, system-wide.',
    'Check Pending Approvals regularly — new bidder and government accounts stay locked out until you approve them.',
  ],
}

const FEATURES: Record<Role, Feature[]> = {
  bidder: [
    { icon: (p) => <IconHome {...p} />, title: 'Command Centre', desc: 'Your ranked opportunity list and pipeline health at a glance.' },
    { icon: (p) => <IconSearch {...p} />, title: 'Find Tenders', desc: 'Search and filter every published tender.' },
    { icon: (p) => <IconColumns {...p} />, title: 'My Bids', desc: 'Kanban board tracking bids from prep through award.' },
    { icon: (p) => <IconWallet {...p} />, title: 'EMD Allocator', desc: 'EMD-constrained pick of which tenders to bid, given your working capital.' },
    { icon: (p) => <IconBell {...p} />, title: 'Tender Alerts', desc: 'Saved searches that notify you when a matching tender is published.' },
    { icon: (p) => <IconBookmark {...p} />, title: 'Saved Tenders', desc: 'Tenders you’ve bookmarked to watch.' },
    { icon: (p) => <IconUsers {...p} />, title: 'Competitors', desc: 'Who you tend to compete against, and how aggressively they bid.' },
    { icon: (p) => <IconShieldAlert {...p} />, title: 'Collusion Screen', desc: 'OECD-style collusion screening on any buyer/category bucket.' },
    { icon: (p) => <IconNetwork {...p} />, title: 'Vendor Network', desc: 'Firms you regularly share a tender bucket with.' },
    { icon: (p) => <IconBarChart {...p} />, title: 'Tender Analytics', desc: 'Your win rate, margins and bidding history over time.' },
    { icon: (p) => <IconFileText {...p} />, title: 'Clause Parser', desc: 'Paste any tender’s eligibility clause to check it offline.' },
    { icon: (p) => <IconUserCircle {...p} />, title: 'Company Profile', desc: 'Your MSME class, certifications and capital — used for matching and pricing.' },
  ],
  government: [
    { icon: (p) => <IconGauge {...p} />, title: 'Dashboard', desc: 'Active tenders, cases requiring review, and total procurement value.' },
    { icon: (p) => <IconClipboardList {...p} />, title: 'All Tenders', desc: 'Every tender, any status, across the department.' },
    { icon: (p) => <IconUsers {...p} />, title: 'Under Evaluation', desc: 'Compare submitted bids and award a winner.' },
    { icon: (p) => <IconAlertTriangle {...p} />, title: 'Anomaly Signals', desc: 'System-wide collusion screens, ranked by risk.' },
    { icon: (p) => <IconSearch {...p} />, title: 'Investigation Queue', desc: 'The highest-risk cases that warrant a human follow-up.' },
    { icon: (p) => <IconLandmark {...p} />, title: 'Vendor Registry', desc: 'Every bidder company and their track record.' },
    { icon: (p) => <IconUserCircle {...p} />, title: 'Pending Approvals', desc: 'Review and activate self-registered bidder and government accounts.' },
  ],
}

export default function Help() {
  const { user } = useAuth()
  if (!user) return null
  const steps = STEPS[user.role]
  const features = FEATURES[user.role]

  return (
    <div>
      <PageHeader title="Help & Manual" sub="A quick guide to using BidVector." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Getting started">
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Features">
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 text-ink-500">{f.icon({ className: 'h-[18px] w-[18px] shrink-0' })}</span>
                <div>
                  <div className="text-[13px] font-medium text-ink-800">{f.title}</div>
                  <div className="text-[11.5px] text-ink-500">{f.desc}</div>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 border-t border-ink-100 pt-3">
              <span className="mt-0.5 text-ink-500"><IconSettings className="h-[18px] w-[18px] shrink-0" /></span>
              <div>
                <div className="text-[13px] font-medium text-ink-800">Settings</div>
                <div className="text-[11.5px] text-ink-500">Change your password and manage your account.</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
