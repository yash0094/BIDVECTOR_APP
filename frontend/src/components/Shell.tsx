import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo, LogoMark } from './Logo'
import { useAuth } from '../lib/auth'
import {
  IconHome, IconSearch, IconColumns, IconShieldAlert, IconWallet, IconBarChart,
  IconUsers, IconFileText, IconBell, IconUserCircle,
  IconClipboardList, IconSettings, IconHelp,
  IconBookmark, IconNetwork, IconAlertTriangle, IconLandmark, IconGauge, IconLogout,
} from './Icons'

export interface NavItem { to: string; label: string; icon: (p: { className?: string }) => ReactNode }
export interface NavSection { label: string; items: NavItem[] }

const BIDDER_NAV: NavSection[] = [
  { label: 'Workspace', items: [
    { to: '/app/dashboard', label: 'Command Centre', icon: (p) => <IconHome {...p} /> },
    { to: '/app/tenders', label: 'Find Tenders', icon: (p) => <IconSearch {...p} /> },
    { to: '/app/bids', label: 'My Bids', icon: (p) => <IconColumns {...p} /> },
    { to: '/app/emd-allocator', label: 'EMD Allocator', icon: (p) => <IconWallet {...p} /> },
    { to: '/app/alerts', label: 'Tender Alerts', icon: (p) => <IconBell {...p} /> },
    { to: '/app/saved', label: 'Saved Tenders', icon: (p) => <IconBookmark {...p} /> },
  ]},
  { label: 'Market Intelligence', items: [
    { to: '/app/competitors', label: 'Competitors', icon: (p) => <IconUsers {...p} /> },
    { to: '/app/collusion-screen', label: 'Collusion Screen', icon: (p) => <IconShieldAlert {...p} /> },
    { to: '/app/vendor-network', label: 'Vendor Network', icon: (p) => <IconNetwork {...p} /> },
  ]},
  { label: 'Tools', items: [
    { to: '/app/analytics', label: 'Tender Analytics', icon: (p) => <IconBarChart {...p} /> },
    { to: '/app/clause-parser', label: 'Clause Parser', icon: (p) => <IconFileText {...p} /> },
  ]},
  { label: 'Account', items: [
    { to: '/app/profile', label: 'Company Profile', icon: (p) => <IconUserCircle {...p} /> },
    { to: '/app/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
    { to: '/app/help', label: 'Help & Manual', icon: (p) => <IconHelp {...p} /> },
  ]},
]

const GOV_NAV: NavSection[] = [
  { label: '', items: [
    { to: '/gov/dashboard', label: 'Dashboard', icon: (p) => <IconGauge {...p} /> },
    { to: '/gov/tenders', label: 'All Tenders', icon: (p) => <IconClipboardList {...p} /> },
    { to: '/gov/evaluation', label: 'Under Evaluation', icon: (p) => <IconUsers {...p} /> },
    { to: '/gov/anomaly-signals', label: 'Anomaly Signals', icon: (p) => <IconAlertTriangle {...p} /> },
    { to: '/gov/investigation-queue', label: 'Investigation Queue', icon: (p) => <IconSearch {...p} /> },
    { to: '/gov/vendor-registry', label: 'Vendor Registry', icon: (p) => <IconLandmark {...p} /> },
  ]},
  { label: '', items: [
    { to: '/gov/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
    { to: '/gov/help', label: 'Help & Manual', icon: (p) => <IconHelp {...p} /> },
  ]},
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
}

/** Light-themed left sidebar for the Bidder / Contractor portal. */
export function BidderShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  if (!user) return null

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="flex">
        <aside className="no-print fixed inset-y-0 left-0 z-20 flex w-64 flex-col overflow-y-auto border-r border-ink-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-4">
            <LogoMark size={30} />
            <div>
              <div className="text-[14px] font-semibold leading-tight text-ink-900">BidVector</div>
              <div className="text-[9px] font-medium uppercase tracking-wide text-ink-400">
                Procurement Intelligence
              </div>
            </div>
          </div>
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="text-[11px] text-ink-400">Logged in as</div>
            <div className="truncate text-[13px] font-semibold text-ink-800">{user.company_name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Active &mdash; Bidder
            </div>
          </div>
          <nav className="flex-1 space-y-4 px-2.5 py-3">
            {BIDDER_NAV.map((section) => (
              <div key={section.label}>
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium ${
                          isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'}`}>
                      {item.icon({ className: 'h-[17px] w-[17px] shrink-0' })}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-ink-100 p-2.5">
            <button onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger-500 hover:bg-danger-100/60">
              <IconLogout width={17} height={17} /> Sign out
            </button>
          </div>
        </aside>

        <div className="ml-64 min-h-screen flex-1">
          <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-ink-200 bg-white px-6 py-3">
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => nav('/app/alerts')} className="relative rounded-md p-1.5 text-ink-500 hover:bg-ink-50" aria-label="Alerts">
                <IconBell width={19} height={19} />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[12px] font-semibold text-white">
                {initials(user.company_name)}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

/** Dark navy left sidebar for the Government portal. */
export function GovernmentShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="flex">
        <aside className="no-print fixed inset-y-0 left-0 z-20 flex w-64 flex-col overflow-y-auto"
               style={{ background: 'var(--color-gov-900)' }}>
          <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
            <LogoMark size={30} />
            <div>
              <div className="text-[14px] font-semibold leading-tight text-white">BidVector</div>
              <div className="text-[9px] font-medium uppercase tracking-wide text-white/40">
                Government Portal
              </div>
            </div>
          </div>
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-[11px] text-white/40">Logged in as</div>
            <div className="truncate text-[13px] font-semibold text-white">{user.company_name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Government Officer
            </div>
          </div>
          <nav className="flex-1 space-y-4 px-2.5 py-3">
            {GOV_NAV.map((section, i) => (
              <div key={i} className={i > 0 ? 'border-t border-white/10 pt-3' : ''}>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium ${
                          isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}>
                      {item.icon({ className: 'h-[17px] w-[17px] shrink-0' })}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-white/10 p-2.5">
            <button onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-400 hover:bg-white/5">
              <IconLogout width={17} height={17} /> Sign out
            </button>
          </div>
        </aside>

        <div className="ml-64 min-h-screen flex-1">
          <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-ink-200 bg-white px-6 py-3">
            <div className="ml-auto flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                   style={{ background: 'var(--color-gov-500)' }}>
                {initials(user.company_name)}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-ink-500">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export { Logo }
