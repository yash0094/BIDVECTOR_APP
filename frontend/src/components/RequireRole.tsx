import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../lib/auth'
import { Spinner } from './ui'

const LOGIN_FOR: Record<Role, string> = {
  bidder: '/login',
  government: '/login/government',
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to={LOGIN_FOR[role]} replace />
  if (user.role !== role) return <Navigate to={LOGIN_FOR[user.role]} replace />
  return <>{children}</>
}

/** Any signed-in account, either role -- for the Public portal, which needs
 * a real login now but isn't its own account type. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
