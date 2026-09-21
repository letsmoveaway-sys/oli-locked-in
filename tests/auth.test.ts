// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../worker/auth/password'
import { createSessionToken, readSessionToken } from '../worker/auth/session'

describe('authentication primitives', () => {
  it('hashes and verifies passwords without storing plaintext', async () => {
    const hash = await hashPassword('this-is-a-long-test-password', new Uint8Array(16).fill(7), 100_000)
    expect(hash).not.toContain('this-is-a-long-test-password')
    await expect(verifyPassword('this-is-a-long-test-password', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('rejects a tampered session', async () => {
    const secret = 'test-session-secret-that-is-long-enough'
    const user = { id: 'user-1', username: 'student', displayName: 'Student', role: 'student' as const }
    const token = await createSessionToken(user, secret)
    await expect(readSessionToken(token, secret)).resolves.toEqual(user)
    await expect(readSessionToken(`${token}tampered`, secret)).resolves.toBeNull()
  })
})
