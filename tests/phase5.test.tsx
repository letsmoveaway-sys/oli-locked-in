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
  targetSessions: 3, remainingSessions: 2, coverageItems: [
    { id: 'algebra-expand', name: 'Expand brackets', completed: true },
    { id: 'algebra-factorise', name: 'Factorise expressions', completed: false },
  ],
}
const subject: CourseSubject = {
  id: 'maths', name: 'Mathematics', examBoard: 'TBC', specificationCode: null, active: true, tier: 'higher',
  currentGrade: '5', targetGrade: '7', options: {}, configurationComplete: true, components: [], topics: [],
}

describe('Phase 5 student experience', () => {
  it('shows today’s scheduled topic and opens the coverage journey', () => {
    render(<TodayDashboard sessions={[session]} topics={[topic]} onComplete={vi.fn()} onCannotDo={vi.fn()} onViewTopic={vi.fn()} onOpenWeek={vi.fn()} />)
    expect(screen.getByText('Today’s revision topics')).toBeInTheDocument()
    expect(screen.getByText('Why this is here: Low mastery and an upcoming review.')).toBeInTheDocument()
    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Complete and mark coverage' }))
    expect(screen.getByText('What did you cover in this session?')).toBeInTheDocument()
    expect(screen.getByLabelText('Factorise expressions')).toBeInTheDocument()
  })

  it('renders the seven-day planner with move controls', () => {
    render(<WeeklyPlanner sessions={[session]} topics={[topic]} onComplete={vi.fn()} onMove={vi.fn()} onReplan={vi.fn()} onViewTopic={vi.fn()} />)
    expect(screen.getAllByText(/Rest \/ unavailable|Mathematics/).length).toBeGreaterThanOrEqual(7)
    expect(screen.getByRole('button', { name: 'Postpone / swap' })).toBeInTheDocument()
  })

  it('keeps coverage and useful materials available after completion', () => {
    const onViewTopic = vi.fn()
    render(<TodayDashboard sessions={[{ ...session, status: 'completed' }]} topics={[topic]} onComplete={vi.fn()} onCannotDo={vi.fn()} onViewTopic={onViewTopic} onOpenWeek={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'View checklist and resources' }))
    expect(onViewTopic).toHaveBeenCalledWith('topic-1')
  })

  it('summarises subject coverage and exposes topic detail navigation', () => {
    const onViewTopic = vi.fn()
    render(<SubjectBrowser subjects={[subject]} topics={[topic]} sessions={[session]} onViewTopic={onViewTopic} />)
    fireEvent.click(screen.getByText('Mathematics'))
    const topicButton = screen.getByRole('button', { name: /Algebra.*1.*2 coverage points/ })
    expect(topicButton).toBeInTheDocument()
    fireEvent.click(topicButton)
    expect(onViewTopic).toHaveBeenCalledWith('topic-1')
  })
})
