import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignIn } from '../src/components/SignIn'

describe('SignIn', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('signs in and returns the authenticated user', async () => {
    const user = { id: 'student-1', username: 'student', displayName: 'Alex', role: 'student' as const }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const onSignedIn = vi.fn()

    render(<SignIn onSignedIn={onSignedIn} />)
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'student' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'a-secure-password' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(user))
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it('shows a useful authentication error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'The username or password is incorrect.' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    render(<SignIn onSignedIn={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'student' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The username or password is incorrect.')
  })
})
