import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo, LogoMark } from '../../components/Logo'
import { Button, Field, inputCls } from '../../components/ui'
import { GoogleSignInButton, useGoogleClientId } from '../../components/GoogleSignInButton'
import { useAuth, type Role } from '../../lib/auth'
import { api, ApiError } from '../../lib/api'
import { IconBuilding, IconUserCircle } from '../../components/Icons'

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
      } else {
        const payload: Record<string, unknown> = { email, password, company_name: companyName, role }
        if (role === 'government') {
          payload.org_profile = { org_name: companyName, department, state, designation: '' }
        }
        await register(payload)
      }
      nav(copy.home)
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10"
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
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
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
                    : 'Create Account'}
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

            <div className="mt-3 flex items-center justify-between text-[12px] text-ink-500">
              <button className="hover:underline" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Already have an account? Sign in' : 'Create an account'}
              </button>
              <span className="mono text-ink-400">demo: {copy.demo} / demo1234</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center opacity-60"><Logo size={20} /></div>
      </div>
    </div>
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
