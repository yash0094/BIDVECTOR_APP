import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'

const NAV = [
  { to: '/public/tenders', label: 'Search Tenders' },
  { to: '/public/awards', label: 'Awards & Results' },
  { to: '/public/price-transparency', label: 'Price Transparency' },
  { to: '/public/statistics', label: 'Statistics' },
]

export function PublicShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="no-print sticky top-0 z-10 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
          <Logo size={30} />
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-[13px] font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => nav('/')}
                  className="ml-auto text-[13px] font-medium text-ink-500 hover:text-ink-800">
            &larr; Back to Login
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] p-6">{children}</main>
    </div>
  )
}

export function PublicBanner() {
  return (
    <div className="no-print mb-6 flex items-center justify-between rounded-lg px-6 py-5 text-white"
         style={{ background: 'var(--color-gov-900)' }}>
      <div>
        <div className="text-[16px] font-semibold">Public Tender Portal</div>
        <div className="mt-0.5 text-[12.5px] text-white/60">
          Open access to government procurement data &middot; No registration required &middot; Powered by BidVector
        </div>
      </div>
    </div>
  )
}
