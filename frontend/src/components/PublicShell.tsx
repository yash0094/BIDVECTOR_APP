import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogoMark } from './Logo'
import { Footer } from './Footer'

const NAV = [
  { to: '/public/tenders', label: 'Search Tenders' },
  { to: '/public/awards', label: 'Awards & Results' },
  { to: '/public/price-transparency', label: 'Price Transparency' },
  { to: '/public/statistics', label: 'Statistics' },
]

export function PublicShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="no-print sticky top-0 z-10 bg-brand-800 text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <span className="rounded-lg bg-white/10 p-2"><LogoMark size={22} /></span>
          <div className="hidden sm:block">
            <div className="text-[15px] font-bold tracking-wide">BidVector</div>
            <p className="text-[10px] uppercase tracking-widest text-white/60">Public Portal</p>
          </div>
          <nav className="ml-2 flex items-center gap-1 text-[13px]">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 font-medium ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => nav('/')}
                  className="ml-auto rounded-md bg-white/10 px-3 py-1.5 text-[13px] font-medium hover:bg-white/20">
            &larr; Back to Dashboard
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 p-6">{children}</main>
      <Footer />
    </div>
  )
}

export function PublicBanner() {
  return (
    <div className="no-print mb-6 rounded-2xl p-6 text-white shadow-lg sm:p-8"
         style={{ background: 'linear-gradient(to right, var(--color-brand-800), var(--color-brand-600))' }}>
      <div className="text-[22px] font-extrabold">Public Tender Portal</div>
      <div className="mt-1.5 text-[13px] text-white/70">
        Aggregate government procurement data &middot; Available to every signed-in account &middot; Powered by BidVector
      </div>
    </div>
  )
}
