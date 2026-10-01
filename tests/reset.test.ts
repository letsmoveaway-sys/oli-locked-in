// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../worker/types'

vi.mock('../worker/services/planner/repository', () => ({
  loadPlannerContext: vi.fn().mockResolvedValue(null),
  savePlan: vi.fn(),
}))
vi.mock('../worker/services/planner', () => ({ generateRevisionPlan: vi.fn() }))

import { resetPocProgress } from '../worker/services/reset'

describe('trial progress reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears XP and level in the same batch while preserving configuration tables', async () => {
    const sql: string[] = []
    const DB = {
      prepare(query: string) {
        sql.push(query)
        const statement = {
          bind: () => statement,
          first: async () => query.includes('SELECT user_id') ? { user_id: 'student-1' } : null,
        }
        return statement
      },
      batch: vi.fn().mockResolvedValue([]),
    } as unknown as Env['DB']

    await expect(resetPocProgress({ id: 'parent-1', username: 'parent', displayName: 'Parent', role: 'parent' }, { DB } as Env)).resolves.toBe(true)
    expect(sql).toContain('UPDATE student_profiles SET xp = 0, level = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    expect(sql.some((query) => /student_subjects|weekly_availability|exams|tutor_sessions/.test(query))).toBe(false)
  })
})
