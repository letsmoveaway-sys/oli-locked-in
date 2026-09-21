import { type FormEvent, useState } from 'react'
import type { SessionUser } from '../types'
import { signIn } from '../services/api'

interface SignInProps {
  onSignedIn: (user: SessionUser) => void
}

export function SignIn({ onSignedIn }: SignInProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await signIn(username.trim(), password)
      onSignedIn(response.user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="intro" aria-labelledby="welcome-heading">
        <p className="eyebrow">Oli: Locked In</p>
        <h1 id="welcome-heading">Know what to revise next.</h1>
        <p>
          Oli&apos;s GCSE dashboard. A calm, adaptive plan for Summer 2027 that keeps
          revision focused and progress visible.
        </p>
      </section>

      <section className="card sign-in-card" aria-labelledby="sign-in-heading">
        <h2 id="sign-in-heading">Sign in</h2>
        <p className="muted">Use your private Student or Parent account.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username or email</label>
          <input
            autoComplete="username"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            value={username}
          />
          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="demo-entry"><span>Want to see how it works?</span> <a href="/demo">Explore the public demo</a></p>
      </section>
    </main>
  )
}
