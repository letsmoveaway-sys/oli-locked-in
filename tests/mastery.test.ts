// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { calculateMastery } from '../worker/services/planner/mastery'

describe('mastery calculation', () => {
  it('keeps topics Grey when there is no evidence', () => {
    expect(calculateMastery({
      assessmentPercentage: null,
      confidence: null,
      completedSessions: 0,
      totalMinutes: 0,
      lastRevisedAt: null,
    })).toEqual({ score: null, ragStatus: 'grey', inputs: [] })
  })

  it('uses confidence as an approximate initial score', () => {
    expect(calculateMastery({
      assessmentPercentage: null,
      confidence: 'ok',
      completedSessions: 0,
      totalMinutes: 0,
      lastRevisedAt: null,
    })).toMatchObject({ score: 60, ragStatus: 'amber' })
  })

  it('redistributes unavailable weights across recorded evidence', () => {
    expect(calculateMastery({
      assessmentPercentage: 90,
      confidence: 'confident',
      completedSessions: 0,
      totalMinutes: 0,
      lastRevisedAt: null,
    })).toMatchObject({ score: 88, ragStatus: 'green' })
  })

  it('does not make a topic Green from session attendance alone', () => {
    expect(calculateMastery({
      assessmentPercentage: null,
      confidence: null,
      completedSessions: 20,
      totalMinutes: 700,
      lastRevisedAt: null,
    })).toMatchObject({ score: 70, ragStatus: 'amber' })
  })
})
