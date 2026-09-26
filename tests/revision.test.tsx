import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LearningSession } from '../src/components/LearningSession'
import { RevisionSubjectGuide } from '../src/components/RevisionSubjectGuide'
import { TopicLearning } from '../src/components/TopicLearning'
import { buildPhoneHandoffUrl } from '../src/components/PhoneHandoff'
import { createFallbackLesson } from '../worker/services/revision'
import type { SubjectRevisionGuide, TopicRevision } from '../src/types'

const guide: SubjectRevisionGuide = {
  subjectId: 'subject-mathematics', examSummary: 'Three papers.', assessmentObjectives: ['AO1 techniques'], examTips: ['Show working'],
  specificationUrl: 'https://example.com/spec', assessmentResourcesUrl: 'https://example.com/papers', provisional: false, verifiedAt: '2026-09-19',
  resources: [{ id: 'papers', title: 'Past papers', provider: 'Pearson Edexcel', resourceType: 'past_papers', description: 'Official practice.', url: 'https://example.com/papers', freeAccess: true }],
}

const revision: TopicRevision = {
  topicId: 'equations', summary: 'Solve equations.', learningObjectives: ['Solve a linear equation'], keyPoints: ['Balance both sides'], examTips: ['Show each step'], bespoke: true,
  workedExample: { title: 'Linear equation', prompt: 'Solve x + 2 = 5.', steps: ['Subtract 2'], answer: 'x = 3' },
  practiceQuestions: [{ question: 'Solve 2x = 8.', hint: 'Divide by 2.', answer: 'x = 4', marks: 2 }], resources: [],
  testQuestions: [{ id: 'q1', question: 'Solve 2x = 8.', options: ['2', '4', '6'], correctOption: 1, explanation: 'Divide both sides by 2.', marks: 2 }],
  writtenQuestions: [{ id: 'written-1', question: 'Solve 2x = 8 and show your method.', marks: 2, suggestedMinutes: 3, expectedLength: 'One or two precise sentences', hint: 'Divide by 2.', markingPoints: ['Show a valid method', 'Give the correct answer'], exemplar: '2x = 8, so x = 4.', exemplarAnnotations: [{ label: 'Valid method', explanation: 'Both sides are divided by two.' }], canUpdateMastery: true }],
  assessmentAvailable: true,
}

describe('revision learning content', () => {
  it('builds a phone link for only the selected topic without carrying secrets', () => {
    const link = new URL(buildPhoneHandoffUrl('maths-algebra-equations', 'https://revision.example/?token=secret#private'))
    expect(link.searchParams.get('topic')).toBe('maths-algebra-equations')
    expect(link.searchParams.get('stage')).toBe('test')
    expect(link.searchParams.get('handoff')).toBe('phone')
    expect(link.searchParams.has('token')).toBe(false)
    expect(link.hash).toBe('')
  })

  it('shows exam-board detail and trusted practice links', () => {
    render(<RevisionSubjectGuide guide={guide} loading={false} />)
    expect(screen.getByText('What you will be tested on')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Past papers/ })).toHaveAttribute('target', '_blank')
  })

  it('names the selected exam board in provisional guidance', () => {
    render(<RevisionSubjectGuide examBoard="Edexcel" guide={{ ...guide, provisional: true }} loading={false} />)
    expect(screen.getByText(/This Edexcel overview/)).toBeInTheDocument()
  })

  it('keeps model answers hidden until the learner asks', () => {
    render(<TopicLearning revision={revision} />)
    expect(screen.queryByText(/Model answer:/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByText(/Model answer:/)).toBeInTheDocument()
    expect(screen.getByText(/x = 4/)).toBeInTheDocument()
  })

  it('creates a usable original activity for topics without a bespoke lesson', () => {
    const fallback = createFallbackLesson({ id: 'geo-rivers', name: 'River landscapes', description: 'River processes.', component: 'Paper 1', subject_id: 'subject-geography', subject_name: 'Geography' })
    expect(fallback.practiceQuestions[0]?.question).toContain('River landscapes')
    expect(fallback.bespoke).toBe(false)
    expect(fallback.testQuestions).toEqual([])
    expect(fallback.writtenQuestions.every((question) => !question.canUpdateMastery)).toBe(true)
    expect(fallback.assessmentAvailable).toBe(false)
  })

  it('auto-marks a full-page test and records its weighted score', async () => {
    const onResult = vi.fn().mockResolvedValue(undefined)
    render(<LearningSession onBack={() => undefined} onResult={onResult} onReviseNow={vi.fn().mockResolvedValue(undefined)} recordResults revision={revision} topic={{ topicId: 'equations', topicName: 'Equations', description: '', subjectId: 'subject-mathematics', subjectName: 'Mathematics', component: 'All papers', masteryScore: null, confidence: null, ragStatus: 'grey', lastRevisedAt: null, totalSessions: 0, totalMinutes: 0, nextReviewAt: null, latestAssessment: null, notes: '', masteryHistory: [], assessments: [], sessions: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: '3. Test yourself' }))
    fireEvent.click(screen.getByLabelText('4'))
    fireEvent.click(screen.getByRole('button', { name: 'Finish and mark check' }))
    expect(await screen.findByText('2/2')).toBeInTheDocument()
    expect(onResult).toHaveBeenCalledWith('equations', 2, 2, expect.objectContaining({ markingSource: 'auto_marked' }))
  })

  it('offers a direct Gemini marking flow that does not need an API key', () => {
    render(<LearningSession onBack={() => undefined} onResult={vi.fn().mockResolvedValue(undefined)} onReviseNow={vi.fn().mockResolvedValue(undefined)} recordResults revision={revision} topic={{ topicId: 'equations', topicName: 'Equations', description: '', subjectId: 'subject-mathematics', subjectName: 'Mathematics', component: 'All papers', masteryScore: null, confidence: null, ragStatus: 'grey', lastRevisedAt: null, totalSessions: 0, totalMinutes: 0, nextReviewAt: null, latestAssessment: null, notes: '', masteryHistory: [], assessments: [], sessions: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: '3. Test yourself' }))
    fireEvent.click(screen.getByRole('button', { name: /Mark with Gemini.*no API key/ }))
    expect(screen.getByRole('heading', { name: /No-key Gemini marking/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Gemini/ })).toHaveAttribute('href', 'https://gemini.google.com/app')
    expect(screen.getByDisplayValue(/Return only valid JSON/)).toBeInTheDocument()
  })

  it('shows the phone QR option only inside written-answer practice', () => {
    render(<LearningSession onBack={() => undefined} onResult={vi.fn().mockResolvedValue(undefined)} onReviseNow={vi.fn().mockResolvedValue(undefined)} recordResults revision={revision} topic={{ topicId: 'equations', topicName: 'Equations', description: '', subjectId: 'subject-mathematics', subjectName: 'Mathematics', component: 'All papers', masteryScore: null, confidence: null, ragStatus: 'grey', lastRevisedAt: null, totalSessions: 0, totalMinutes: 0, nextReviewAt: null, latestAssessment: null, notes: '', masteryHistory: [], assessments: [], sessions: [] }} />)
    expect(screen.queryByRole('button', { name: 'Continue on phone' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '3. Test yourself' }))
    expect(screen.getByRole('button', { name: 'Continue on phone' })).toBeInTheDocument()
  })
})
