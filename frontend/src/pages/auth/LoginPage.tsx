import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, LogoMark } from '../../components/Logo'
import { Button, Field, inputCls } from '../../components/ui'
import { Footer } from '../../components/Footer'
import { GoogleSignInButton, useGoogleClientId } from '../../components/GoogleSignInButton'
import { useAuth, type Role } from '../../lib/auth'
import { api, ApiError } from '../../lib/api'
import { IconBuilding, IconShieldAlert, IconUserCircle } from '../../components/Icons'

const COPY: Record<Role, { title: string; blurb: string; home: string; demo: string }> = {
  bidder: {
    title: 'User / Bidder', blurb: 'Procurement professionals, contractors & MSMEs',
    home: '/app/dashboard', demo: 'demo@bidvector.in',
  },
  government: {
    title: 'Government', blurb: 'Procurement officers & tender management teams',
    home: '/gov/dashboard', demo: 'gov@bidvector.in',
  },
}

export function LoginPage({ role }: { role: Role }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [department, setDepartment] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, loginWithGoogle, register } = useAuth()
  const nav = useNavigate()
  const copy = COPY[role]
  const googleClientId = useGoogleClientId()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api.post('/api/auth/request-password-reset', { email })
        setForgotSent(true)
        return
      }
      if (mode === 'login') {
        await login(email, password)
        nav(copy.home)
      } else {
        const payload: Record<string, unknown> = { email, password, company_name: companyName, role }
        if (role === 'government') {
          payload.org_profile = { org_name: companyName, department, state, designation: '' }
        }
        const res = await register(payload)
        setPendingMessage(res.message)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogleCredential(credential: string) {
    setError(null)
    setBusy(true)
    try {
      await loginWithGoogle(credential)
      nav(copy.home)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 items-center justify-center px-4 py-10"
           style={{ background: 'radial-gradient(120% 100% at 50% 0%, var(--color-brand-50), var(--color-ink-50) 60%)' }}>
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-ink-200">
              <LogoMark size={40} />
            </div>
            <div className="text-[15px] font-semibold text-ink-900">India's Procurement Intelligence Platform</div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white shadow-sm">
            <RoleTabs current={role} />
            <div className="border-b border-ink-100 bg-ink-50 px-5 py-2 text-[12px] text-ink-500">{copy.blurb}</div>

            <div className="p-5">
              {mode === 'forgot' && forgotSent ? (
                <div className="space-y-3 text-center">
                  <p className="text-[13px] text-ink-700">
                    If an account exists for that email, a reset link has been sent.
                  </p>
                  <button className="text-[12px] font-medium text-brand-600 hover:underline"
                          onClick={() => { setMode('login'); setForgotSent(false) }}>
                    Back to sign in
                  </button>
                </div>
              ) : pendingMessage ? (
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <IconShieldAlert width={20} height={20} />
                  </div>
                  <p className="text-[13px] text-ink-700">{pendingMessage}</p>
                  <button className="text-[12px] font-medium text-brand-600 hover:underline"
                          onClick={() => { setMode('login'); setPendingMessage(null) }}>
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3">
                  {mode === 'register' && (
                    <div className="rounded-md border border-warn-100 bg-warn-100/50 p-2.5 text-[11.5px] text-warn-500">
                      <IconShieldAlert width={13} height={13} className="mr-1 inline-block align-text-bottom" />
                      All newly registered accounts are reviewed and authorized by a Government Official before activation.
                    </div>
                  )}
                  {mode === 'register' && (
                    <Field label={role === 'bidder' ? 'Company name' : 'Organisation name'}>
                      <input className={inputCls} required value={companyName}
                             onChange={(e) => setCompanyName(e.target.value)} />
                    </Field>
                  )}
                  {mode === 'register' && role === 'government' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Department"><input className={inputCls} value={department}
                            onChange={(e) => setDepartment(e.target.value)} /></Field>
                      <Field label="State"><input className={inputCls} value={state}
                            onChange={(e) => setState(e.target.value)} /></Field>
                    </div>
                  )}
                  <Field label="Email Address">
                    <input type="email" className={inputCls} required value={email}
                           placeholder="you@company.com"
                           onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  {mode !== 'forgot' && (
                    <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
                      <input type="password" className={inputCls} required value={password}
                             onChange={(e) => setPassword(e.target.value)} />
                    </Field>
                  )}
                  {error && <div className="rounded-md bg-danger-100 px-2.5 py-1.5 text-[12px] text-danger-500">{error}</div>}
                  <Button type="submit" className="w-full justify-center" disabled={busy}>
                    {busy ? 'Please wait…'
                      : mode === 'login' ? 'Sign In'
                      : mode === 'forgot' ? 'Send reset link'
                      : 'Submit Application for Review'}
                  </Button>
                  {mode === 'login' && (
                    <button type="button" className="block w-full text-center text-[12px] text-ink-500 hover:underline"
                            onClick={() => setMode('forgot')}>
                      Forgot password?
                    </button>
                  )}

                  {role === 'bidder' && mode !== 'forgot' && googleClientId && (
                    <>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-400">
                        <span className="h-px flex-1 bg-ink-100" /> or continue with <span className="h-px flex-1 bg-ink-100" />
                      </div>
                      <GoogleSignInButton clientId={googleClientId} onCredential={onGoogleCredential} />
                    </>
                  )}
                </form>
              )}

              {!pendingMessage && (
                <div className="mt-3 flex items-center justify-between text-[12px] text-ink-500">
                  <button className="hover:underline" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                    {mode === 'register' ? 'Already have an account? Sign in' : 'Apply for an account'}
                  </button>
                  <span className="mono text-ink-400">demo: {copy.demo} / demo1234</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center opacity-60"><Logo size={20} /></div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function TopBar() {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-10 bg-brand-800 text-white shadow-lg">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <span className="rounded-lg bg-white/10 p-2"><LogoMark size={22} /></span>
        <div>
          <div className="flex items-center gap-2 text-[16px] font-bold tracking-wide">
            BidVector
            <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-900">Portal</span>
          </div>
          <p className="hidden text-[10px] uppercase tracking-widest text-white/60 sm:block">
            India's Procurement Intelligence Platform
          </p>
        </div>
        <nav className="ml-auto flex items-center gap-1 text-[13px]">
          <button onClick={() => nav('/public/tenders')} className="rounded-md px-3 py-1.5 hover:bg-white/10">
            Public Portal
          </button>
          <button onClick={() => nav('/app/help')} className="rounded-md px-3 py-1.5 hover:bg-white/10">
            User Manual
          </button>
        </nav>
      </div>
    </header>
  )
}

function RoleTabs({ current }: { current: Role }) {
  const nav = useNavigate()
  const tabs: { role: Role | 'public'; to: string; label: string; icon: (p: { className?: string }) => React.ReactNode }[] = [
    { role: 'bidder', to: '/login', label: 'User / Bidder', icon: (p) => <IconUserCircle {...p} /> },
    { role: 'government', to: '/login/government', label: 'Government', icon: (p) => <IconBuilding {...p} /> },
    { role: 'public', to: '/public/tenders', label: 'Public', icon: (p) => <span className={p.className}>&#9679;</span> },
  ]
  return (
    <div className="grid grid-cols-3 border-b border-ink-100">
      {tabs.map((t) => (
        <button key={t.role} onClick={() => nav(t.to)}
                className={`flex items-center justify-center gap-1.5 border-b-2 py-3 text-[13px] font-medium ${
                  t.role === current ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
          {t.icon({ className: 'h-[15px] w-[15px]' })} {t.label}
        </button>
      ))}
    </div>
  )
}
