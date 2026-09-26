import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SubjectBrowser } from '../src/components/SubjectBrowser'
import { TodayDashboard } from '../src/components/TodayDashboard'
import { WeeklyPlanner } from '../src/components/WeeklyPlanner'
import type { CourseSubject, PlanSession, TopicProgress } from '../src/types'

const today = new Date().toISOString().slice(0, 10)
const session: PlanSession = {
  id: 'session-1', topicId: 'topic-1', subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Algebra',
  scheduledAt: `${today}T17:00:00.000Z`, plannedMinutes: 35, sessionType: 'Focused revision', status: 'planned',
  plannerReason: 'Low mastery and an upcoming review.', source: 'generated', locked: false,
  reviewItems: [{ topicId: 'topic-old', subjectId: 'science', subjectName: 'Science', topicName: 'Cell biology', plannedMinutes: 8, reason: 'Spaced retrieval from 4 days ago' }],
}
const topic: TopicProgress = {
  topicId: 'topic-1', topicName: 'Algebra', description: 'Algebra skills.', subjectId: 'maths', subjectName: 'Mathematics',
  component: 'Paper 1', masteryScore: 42, confidence: 'struggling', ragStatus: 'red', lastRevisedAt: null,
  totalSessions: 1, totalMinutes: 35, nextReviewAt: null, latestAssessment: 40,
}
const subject: CourseSubject = {
  id: 'maths', name: 'Mathematics', examBoard: 'TBC', specificationCode: null, active: true, tier: 'higher',
  currentGrade: '5', targetGrade: '7', options: {}, configurationComplete: true, components: [], topics: [],
}

describe('Phase 5 student experience', () => {
  it('shows today’s session and opens the completion journey', () => {
    render(<TodayDashboard sessions={[session]} topics={[topic]} onComplete={vi.fn()} onCannotDo={vi.fn()} onReviewTopic={vi.fn()} onViewTopic={vi.fn()} onOpenWeek={vi.fn()} />)
    expect(screen.getByText('Your revision for today')).toBeInTheDocument()
    expect(screen.getByText('Why this is here: Low mastery and an upcoming review.')).toBeInTheDocument()
    expect(screen.getByText('Memory review from earlier learning')).toBeInTheDocument()
    expect(screen.getByText('Cell biology')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))
    expect(screen.getByText('Finish revision session')).toBeInTheDocument()
    expect(screen.getByLabelText('Actual time spent (minutes)')).toHaveValue(35)
  })

  it('renders the seven-day planner with move controls', () => {
    render(<WeeklyPlanner sessions={[session]} topics={[topic]} onMove={vi.fn()} onReplan={vi.fn()} onReviewTopic={vi.fn()} onViewTopic={vi.fn()} />)
    expect(screen.getAllByText(/Rest \/ unavailable|Mathematics/).length).toBeGreaterThanOrEqual(7)
    expect(screen.getByRole('button', { name: 'Postpone / swap' })).toBeInTheDocument()
  })

  it('reopens completed session content through a separate review action', () => {
    const onReviewTopic = vi.fn()
    render(<TodayDashboard sessions={[{ ...session, status: 'completed' }]} topics={[topic]} onComplete={vi.fn()} onCannotDo={vi.fn()} onReviewTopic={onReviewTopic} onViewTopic={vi.fn()} onOpenWeek={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review content' }))
    expect(onReviewTopic).toHaveBeenCalledWith('topic-1')
  })

  it('summarises subject mastery and exposes topic detail navigation', () => {
    const onViewTopic = vi.fn()
    render(<SubjectBrowser subjects={[subject]} topics={[topic]} sessions={[session]} onViewTopic={onViewTopic} />)
    fireEvent.click(screen.getByText('Mathematics'))
    expect(screen.getAllByText('42%')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Algebra/ }))
    expect(onViewTopic).toHaveBeenCalledWith('topic-1')
  })
})
