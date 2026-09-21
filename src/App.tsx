import { useEffect, useState } from 'react'
import { Home } from './components/Home'
import { SignIn } from './components/SignIn'
import { getSession, signOut } from './services/api'
import type { SessionUser } from './types'

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  async function handleSignOut() {
    await signOut()
    setUser(null)
  }

  if (loading) {
    return <main className="loading" aria-live="polite">Loading your planner…</main>
  }

  return user ? <Home onSignOut={handleSignOut} user={user} /> : <SignIn onSignedIn={setUser} />
}
