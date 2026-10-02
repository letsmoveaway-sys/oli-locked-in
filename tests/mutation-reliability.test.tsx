import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlanDashboard } from '../src/components/PlanDashboard'
import type { PlanSession, TopicProgress } from '../src/types'
import { AUTH_EXPIRED_EVENT, getProgress } from '../src/services/api'

const session: PlanSession = {
  id: 'session-1', topicId: 'topic-1', subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Algebra',
  scheduledAt: '2026-09-30T16:00:00.000Z', plannedMinutes: 35, sessionType: 'Focused learning', status: 'planned',
  plannerReason: 'Needs practice.', source: 'generated', locked: false, reviewItems: [],
}
const topic: TopicProgress = {
  topicId: 'topic-1', topicName: 'Algebra', description: 'Algebra skills.', subjectId: 'maths', subjectName: 'Mathematics', component: 'Paper 1',
  masteryScore: null, confidence: null, ragStatus: 'grey', lastRevisedAt: null, totalSessions: 0, totalMinutes: 0, nextReviewAt: null, latestAssessment: null,
  targetSessions: 2, remainingSessions: 2, coverageItems: [{ id: 'algebra-equations', name: 'Solve equations', completed: false }],
}

describe('mutation reliability', () => {
  it('uses the evidence form from the plan and preserves values after a failed save', async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error('Network unavailable'))
    render(<PlanDashboard availability={[]} onAvailability={vi.fn()} onCannotDo={vi.fn()} onComplete={onComplete} onGenerate={vi.fn()} onViewTopic={vi.fn()} sessions={[session]} studentMode topics={[topic]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Complete slot' }))
    fireEvent.click(screen.getByLabelText('Solve equations'))
    fireEvent.change(screen.getByLabelText(/Session notes/), { target: { value: 'Hard but useful' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save coverage' }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Solve equations')).toBeChecked()
    expect(screen.getByLabelText(/Session notes/)).toHaveValue('Hard but useful')
  })

  it('emits one central auth-expiry event and preserves structured API error details', async () => {
    const expired = vi.fn()
    window.addEventListener(AUTH_EXPIRED_EVENT, expired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Session expired.' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })))

    await expect(getProgress()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED', message: 'Session expired.' })
    expect(expired).toHaveBeenCalledTimes(1)
    window.removeEventListener(AUTH_EXPIRED_EVENT, expired)
    vi.unstubAllGlobals()
  })

  it('asks why a session cannot be done before changing the plan', async () => {
    const onCannotDo = vi.fn().mockResolvedValue(undefined)
    render(<PlanDashboard availability={[]} onAvailability={vi.fn()} onCannotDo={onCannotDo} onComplete={vi.fn()} onGenerate={vi.fn()} onViewTopic={vi.fn()} sessions={[session]} studentMode topics={[topic]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cannot do' }))
    expect(screen.getByRole('dialog', { name: /Why can’t you do Algebra/ })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/ill or exhausted/))
    fireEvent.click(screen.getByRole('button', { name: 'Find another slot' }))
    await waitFor(() => expect(onCannotDo).toHaveBeenCalledWith('session-1', 'unwell', 'rescheduled'))
  })
})
