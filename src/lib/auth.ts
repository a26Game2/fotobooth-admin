const AUTH_KEY = 'fotobooth-vn-admin-auth'
const PERSISTENT_AUTH_KEY = 'fotobooth-vn-admin-auth-persistent'

export type AuthSession = {
  method: 'api-key' | 'password'
  apiKey?: string
  accessToken?: string
  username?: string
  role?: 'SALES' | 'ADMIN' | string
}

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(PERSISTENT_AUTH_KEY)
    return raw ? JSON.parse(raw) as AuthSession : null
  } catch { return null }
}

export function saveSession(session: AuthSession, remember = false) {
  const target = remember ? localStorage : sessionStorage
  const key = remember ? PERSISTENT_AUTH_KEY : AUTH_KEY
  target.setItem(key, JSON.stringify(session))
  if (remember) sessionStorage.removeItem(AUTH_KEY)
  else localStorage.removeItem(PERSISTENT_AUTH_KEY)
}
export function clearSession() { sessionStorage.removeItem(AUTH_KEY); localStorage.removeItem(PERSISTENT_AUTH_KEY) }
