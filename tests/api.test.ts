// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { handleApi } from '../worker/api/router'
import { hashPassword } from '../worker/auth/password'
import { createSessionToken } from '../worker/auth/session'
import type { Env } from '../worker/types'

const env = {
  ASSETS: { fetch: async () => new Response() },
  DB: {} as Env['DB'],
  ENVIRONMENT: 'test',
  STUDENT_PASSWORD_HASH: 'unused',
  PARENT_PASSWORD_HASH: 'unused',
  SESSION_SECRET: 'test-session-secret-that-is-long-enough',
} satisfies Env

describe('API role enforcement', () => {
  it('provides a public health endpoint', async () => {
    const response = await handleApi(new Request('https://example.test/api/health'), env)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true })
  })

  it('rejects unauthenticated protected requests', async () => {
    const response = await handleApi(new Request('https://example.test/api/dashboard'), env)
    expect(response.status).toBe(401)
  })

  it('authenticates an active seeded user and sets an HTTP-only cookie', async () => {
    const password = 'a-long-development-password'
    const loginEnv: Env = {
      ...env,
      STUDENT_PASSWORD_HASH: await hashPassword(password, new Uint8Array(16).fill(9), 100_000),
      DB: {
        prepare: () => ({
          bind: () => ({
            first: () => Promise.resolve({
              id: 'student-1',
              email_or_username: 'student',
              display_name: 'Student',
              role: 'student',
              active: 1,
            }),
          }),
        }),
      } as unknown as Env['DB'],
    }
    const response = await handleApi(new Request('https://example.test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' },
      body: JSON.stringify({ username: 'student', password }),
    }), loginEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict')
  })

  it('limits repeated sign-in attempts before checking the database', async () => {
    const response = await handleApi(new Request('https://example.test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' },
      body: JSON.stringify({ username: 'student', password: 'wrong-password' }),
    }), {
      ...env,
      LOGIN_RATE_LIMITER: { limit: async () => ({ success: false }) } as Env['LOGIN_RATE_LIMITER'],
    })
    expect(response.status).toBe(429)
  })

  it('rejects a Student account from Parent operations', async () => {
    const token = await createSessionToken(
      { id: 'student-1', username: 'student', displayName: 'Student', role: 'student' },
      env.SESSION_SECRET,
    )
    const response = await handleApi(new Request('https://example.test/api/parent', {
      headers: { Cookie: `gcse_session=${token}` },
    }), env)
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } })
  })

  it('allows a Parent account to access Parent operations', async () => {
    const token = await createSessionToken(
      { id: 'parent-1', username: 'parent', displayName: 'Parent', role: 'parent' },
      env.SESSION_SECRET,
    )
    const response = await handleApi(new Request('https://example.test/api/parent', {
      headers: { Cookie: `gcse_session=${token}` },
    }), env)
    expect(response.status).toBe(200)
  })

  it('protects the POC reset behind Parent role and typed confirmation', async () => {
    const studentToken = await createSessionToken(
      { id: 'student-1', username: 'student', displayName: 'Student', role: 'student' },
      env.SESSION_SECRET,
    )
    const studentResponse = await handleApi(new Request('https://example.test/api/parent/reset-progress', {
      method: 'POST', headers: { Cookie: `gcse_session=${studentToken}`, Origin: 'https://example.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET PROGRESS' }),
    }), env)
    expect(studentResponse.status).toBe(403)

    const parentToken = await createSessionToken(
      { id: 'parent-1', username: 'parent', displayName: 'Parent', role: 'parent' },
      env.SESSION_SECRET,
    )
    const unconfirmedResponse = await handleApi(new Request('https://example.test/api/parent/reset-progress', {
      method: 'POST', headers: { Cookie: `gcse_session=${parentToken}`, Origin: 'https://example.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'reset' }),
    }), env)
    expect(unconfirmedResponse.status).toBe(400)
  })

  it('restricts calendar, export and AI controls to the Parent account', async () => {
    const studentToken = await createSessionToken(
      { id: 'student-1', username: 'student', displayName: 'Student', role: 'student' },
      env.SESSION_SECRET,
    )
    const headers = { Cookie: `gcse_session=${studentToken}`, Origin: 'https://example.test', 'Content-Type': 'application/json' }
    const requests = [
      new Request('https://example.test/api/availability/exceptions', { method: 'POST', headers, body: '{}' }),
      new Request('https://example.test/api/parent/exams', { method: 'POST', headers, body: '{}' }),
      new Request('https://example.test/api/parent/ai-marking', { method: 'PUT', headers, body: JSON.stringify({ enabled: true }) }),
      new Request('https://example.test/api/parent/export', { headers: { Cookie: `gcse_session=${studentToken}` } }),
    ]
    for (const request of requests) {
      const response = await handleApi(request, env)
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } })
    }
  })

  it('fails safely when written-answer marking is not configured', async () => {
    const token = await createSessionToken(
      { id: 'student-1', username: 'student', displayName: 'Student', role: 'student' },
      env.SESSION_SECRET,
    )
    const response = await handleApi(new Request('https://example.test/api/marking/written', {
      method: 'POST',
      headers: { Cookie: `gcse_session=${token}`, Origin: 'https://example.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: 'topic-1', questionId: 'question-1', answerText: 'My answer', imageDataUrls: [] }),
    }), env)
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'AI_MARKING_UNAVAILABLE' } })
  })
})
