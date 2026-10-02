// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createEvidenceToken, readEvidenceToken } from '../worker/auth/evidence'

const payload = {
  studentId: 'student-1', topicId: 'topic-1', questionId: 'question-1', score: 6, maximumScore: 8,
  confidence: 'high' as const, summary: 'A sound response.', nextStep: 'Add one precise example.',
  modelVersion: 'test-model', rubricVersion: 'gcse-formative-v1',
}

describe('signed marking evidence', () => {
  it('accepts an untampered, short-lived result for the expected secret', async () => {
    const token = await createEvidenceToken(payload, 'a-test-secret-long-enough')
    await expect(readEvidenceToken(token, 'a-test-secret-long-enough')).resolves.toMatchObject(payload)
    await expect(readEvidenceToken(token, 'a-different-secret-long-enough')).resolves.toBeNull()
  })

  it('rejects payload and signature tampering', async () => {
    const token = await createEvidenceToken(payload, 'a-test-secret-long-enough')
    const [body, signature] = token.split('.')
    const changedBody = `${body!.slice(0, -1)}${body!.endsWith('a') ? 'b' : 'a'}`
    const changedSignature = `${signature!.startsWith('a') ? 'b' : 'a'}${signature!.slice(1)}`
    await expect(readEvidenceToken(`${changedBody}.${signature}`, 'a-test-secret-long-enough')).resolves.toBeNull()
    await expect(readEvidenceToken(`${body}.${changedSignature}`, 'a-test-secret-long-enough')).resolves.toBeNull()
  })

  it('rejects an expired result', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const token = await createEvidenceToken(payload, 'a-test-secret-long-enough')
    vi.spyOn(Date, 'now').mockReturnValue(1_000 + 11 * 60 * 1000)
    await expect(readEvidenceToken(token, 'a-test-secret-long-enough')).resolves.toBeNull()
    vi.restoreAllMocks()
  })
})
