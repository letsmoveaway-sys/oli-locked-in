import { useEffect, useState } from 'react'
import { Home } from './components/Home'
import { SignIn } from './components/SignIn'
import { DemoPage } from './components/DemoPage'
import { AUTH_EXPIRED_EVENT, getSession, signOut } from './services/api'
import type { SessionUser } from './types'

export default function App() {
  const isDemo = window.location.pathname === '/demo'
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    function expireSession() {
      setUser(null)
      setLoading(false)
      setAuthMessage('Your session expired. Sign in again to continue.')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession)
  }, [])

  useEffect(() => {
    if (isDemo) return
    let active = true
    void getSession()
      .then((response) => {
        if (active) setUser(response.user)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isDemo])

  async function handleSignOut() {
    await signOut()
    setUser(null)
    setAuthMessage('You have signed out.')
  }

  if (isDemo) return <DemoPage />

  if (loading) {
    return <main className="loading" aria-live="polite">Loading your planner…</main>
  }

  return user ? <Home onSignOut={handleSignOut} user={user} /> : <SignIn message={authMessage} onSignedIn={(signedInUser) => { setAuthMessage(''); setUser(signedInUser) }} />
}
