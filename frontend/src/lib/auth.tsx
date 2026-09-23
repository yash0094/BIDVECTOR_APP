import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'

export type Role = 'bidder' | 'government'

export interface User {
  id: number
  email: string
  company_name: string
  role: Role
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  // Accounts are pending until a Government user approves them -- no token
  // is issued at registration time, just a confirmation message.
  register: (payload: Record<string, unknown>) => Promise<{ pending: true; message: string }>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.get('/api/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password })
    setToken(res.token)
    setUser(res.user)
    return res.user as User
  }

  async function register(payload: Record<string, unknown>) {
    return await api.post('/api/auth/register', payload) as { pending: true; message: string }
  }

  function logout() {
    api.post('/api/auth/logout').catch(() => {})
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
