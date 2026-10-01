// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  calculateRemainingWorkload,
  calculateTopicPriority,
  generateRevisionPlan,
  replanAfterChange,
  type PlannerContext,
  type PlannerTopic,
} from '../worker/services/planner'

function topic(overrides: Partial<PlannerTopic> = {}): PlannerTopic {
  return {
    id: 'topic-maths',
    subjectId: 'maths',
    subjectName: 'Mathematics',
    name: 'Algebra',
    active: true,
    masteryScore: 30,
    ragStatus: 'red',
    latestAssessment: null,
    lastRevisedAt: null,
    nextReviewAt: null,
    estimatedEffort: 5,
    importance: 1,
    manualPriority: null,
    requestedMore: false,
    ...overrides,
  }
}

function context(overrides: Partial<PlannerContext> = {}): PlannerContext {
  return {
    today: '2026-09-16',
    defaultSessionMinutes: 35,
    availability: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, availableMinutes: 70, startTime: '17:00' })),
    exceptions: [],
    tutors: [],
    exams: [],
    topics: [topic()],
    existingSessions: [],
    ...overrides,
  }
}

describe('adaptive planner', () => {
  it('returns missed work to future planning without overdue debt', () => {
    const base = context({
      existingSessions: [{
        id: 'missed-1', topicId: 'topic-maths', subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Algebra',
        scheduledAt: '2026-09-16T17:00:00.000Z', plannedMinutes: 35, sessionType: 'Learn/review', status: 'rescheduled',
        plannerReason: 'Missed', source: 'generated', locked: false,
      }],
    })
    const result = replanAfterChange('Session missed', base)
    expect(result.message).toBe('Your plan has been adjusted.')
    expect(result.sessions.filter((session) => session.id === 'missed-1')).toHaveLength(1)
    expect(result.sessions.some((session) => session.status === 'planned' && session.topicId === 'topic-maths')).toBe(true)
  })

  it('does not overwrite a rescheduled generated-session history row', () => {
    const historical = {
      id: 'generated-2026-09-16-0', topicId: 'topic-maths', subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Algebra',
      scheduledAt: '2026-09-16T17:00:00.000Z', plannedMinutes: 35, sessionType: 'Learn/review', status: 'rescheduled',
      plannerReason: 'Missed', source: 'generated' as const, locked: false,
    }
    const plan = generateRevisionPlan(context({ existingSessions: [historical] }), 1)
    expect(new Set(plan.map((session) => session.id)).size).toBe(plan.length)
    expect(plan.find((session) => session.id === historical.id)?.status).toBe('rescheduled')
  })

  it('removes independent study across protected illness days', () => {
    const plan = generateRevisionPlan(context({
      exceptions: [{
        startDatetime: '2026-09-17T00:00:00.000Z', endDatetime: '2026-09-19T23:59:59.999Z',
        availableMinutes: 0, protectStreak: true, reason: 'Illness',
      }],
    }), 5)
    expect(plan.filter((session) => session.scheduledAt.slice(0, 10) >= '2026-09-17' && session.scheduledAt.slice(0, 10) <= '2026-09-19')).toHaveLength(0)
  })

  it('favours the topic with the earlier exam when weakness is equal', () => {
    const maths = topic()
    const science = topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells' })
    const exams = [
      { subjectId: 'maths', examDatetime: '2027-05-10T09:00:00.000Z' },
      { subjectId: 'science', examDatetime: '2027-06-10T09:00:00.000Z' },
    ]
    expect(calculateTopicPriority(maths, { today: '2027-04-01', exams })).toBeGreaterThan(
      calculateTopicPriority(science, { today: '2027-04-01', exams }),
    )
  })

  it('reduces additional Maths scheduling on a Maths tutor Tuesday', () => {
    const plan = generateRevisionPlan(context({
      today: '2026-09-22',
      availability: [{ weekday: 2, availableMinutes: 105, startTime: '17:00' }],
      topics: [topic(), topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells' })],
      tutors: [{ id: 'maths-tutor', date: '2026-09-22', subjectId: 'maths', subjectName: 'Mathematics', startTime: '18:00', durationMinutes: 60 }],
    }), 1)
    expect(plan.some((session) => session.source === 'tutor' && session.subjectId === 'maths')).toBe(true)
    expect(plan.some((session) => session.source === 'generated' && session.subjectId === 'science')).toBe(true)
  })

  it('mixes subjects within a day even when one topic has much higher priority', () => {
    const plan = generateRevisionPlan(context({
      availability: [{ weekday: 3, availableMinutes: 105, startTime: '17:00' }],
      topics: [
        topic({ latestAssessment: 10, requestedMore: true }),
        topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells', masteryScore: 85, ragStatus: 'green', latestAssessment: 90 }),
        topic({ id: 'topic-english', subjectId: 'english', subjectName: 'English', name: 'Creative reading', masteryScore: 85, ragStatus: 'green', latestAssessment: 90 }),
      ],
    }), 1).filter((session) => session.source === 'generated')

    expect(plan).toHaveLength(3)
    expect(new Set(plan.map((session) => session.subjectId))).toEqual(new Set(['maths', 'science', 'english']))
    expect(new Set(plan.map((session) => session.topicId)).size).toBe(3)
  })

  it('uses a different topic before repeating within the same subject', () => {
    const plan = generateRevisionPlan(context({
      availability: [{ weekday: 3, availableMinutes: 70, startTime: '17:00' }],
      topics: [
        topic({ latestAssessment: 10, requestedMore: true }),
        topic({ id: 'topic-geometry', name: 'Geometry', masteryScore: 85, ragStatus: 'green', latestAssessment: 90 }),
      ],
    }), 1).filter((session) => session.source === 'generated')

    expect(plan.map((session) => session.topicId)).toEqual(['topic-maths', 'topic-geometry'])
  })

  it('balances all active subjects across the planning horizon', () => {
    const subjects = [
      topic(),
      topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells' }),
      topic({ id: 'topic-language', subjectId: 'language', subjectName: 'English Language', name: 'Creative reading' }),
      topic({ id: 'topic-literature', subjectId: 'literature', subjectName: 'English Literature', name: 'Macbeth' }),
      topic({ id: 'topic-history', subjectId: 'history', subjectName: 'History', name: 'Medicine' }),
    ]
    const plan = generateRevisionPlan(context({ topics: subjects }), 14).filter((session) => session.source === 'generated')
    const counts = subjects.map(({ subjectId }) => plan.filter((session) => session.subjectId === subjectId).length)

    expect(counts.every((count) => count > 0)).toBe(true)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('adds a due spaced-retrieval item to a later learning session', () => {
    const plan = generateRevisionPlan(context({
      availability: [{ weekday: 3, availableMinutes: 35, startTime: '17:00' }],
      topics: [
        topic({ masteryScore: 60, ragStatus: 'amber', lastRevisedAt: '2026-09-12T17:00:00.000Z', nextReviewAt: '2026-09-16T17:00:00.000Z' }),
        topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells', masteryScore: null, ragStatus: 'grey' }),
      ],
    }), 1).filter((session) => session.source === 'generated')

    expect(plan[0]?.topicId).toBe('topic-science')
    expect(plan[0]?.sessionType).toBe('Learning + spaced review')
    expect(plan[0]?.reviewItems).toMatchObject([{ topicId: 'topic-maths', plannedMinutes: 8 }])
  })

  it('does not duplicate a persisted recurring tutor occurrence', () => {
    const existingTutor = {
      id: 'tutor-maths-tutor-2026-09-22', topicId: null, subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Mathematics tutor',
      scheduledAt: '2026-09-22T18:00:00.000Z', plannedMinutes: 60, sessionType: 'Tutor session', status: 'tutor',
      plannerReason: 'Recurring tutor session', source: 'tutor' as const, locked: true,
    }
    const plan = generateRevisionPlan(context({
      today: '2026-09-22',
      existingSessions: [existingTutor],
      tutors: [{ id: 'maths-tutor', date: '2026-09-22', subjectId: 'maths', subjectName: 'Mathematics', startTime: '18:00', durationMinutes: 60 }],
    }), 1)
    expect(plan.filter((session) => session.id === existingTutor.id)).toHaveLength(1)
  })

  it('increases priority after a weak assessment', () => {
    const weak = topic({ latestAssessment: 35 })
    const neutral = topic({ latestAssessment: 65 })
    expect(calculateTopicPriority(weak, { today: '2026-09-16', exams: [] })).toBeGreaterThan(
      calculateTopicPriority(neutral, { today: '2026-09-16', exams: [] }),
    )
  })

  it('reduces immediate priority after strong evidence while retaining maintenance workload', () => {
    const strong = topic({ masteryScore: 88, ragStatus: 'green', latestAssessment: 90, lastRevisedAt: '2026-09-15T12:00:00.000Z' })
    const weak = topic({ latestAssessment: 40 })
    expect(calculateTopicPriority(strong, { today: '2026-09-16', exams: [] })).toBeLessThan(
      calculateTopicPriority(weak, { today: '2026-09-16', exams: [] }),
    )
    expect(calculateRemainingWorkload(strong)).toBeGreaterThan(0)
  })

  it('redistributes work when Saturday capacity is reduced', () => {
    const full = generateRevisionPlan(context({ today: '2026-09-19', availability: [{ weekday: 6, availableMinutes: 105, startTime: '10:00' }] }), 1)
    const reduced = generateRevisionPlan(context({ today: '2026-09-19', availability: [{ weekday: 6, availableMinutes: 35, startTime: '10:00' }] }), 1)
    expect(reduced.filter((session) => session.source === 'generated').length).toBeLessThan(full.filter((session) => session.source === 'generated').length)
  })

  it('uses the study-block length chosen for that day and leaves a break between blocks', () => {
    const plan = generateRevisionPlan(context({
      availability: [{ weekday: 3, availableMinutes: 60, sessionMinutes: 20, startTime: '17:00' }],
      topics: [
        topic(),
        topic({ id: 'topic-science', subjectId: 'science', subjectName: 'Science', name: 'Cells' }),
        topic({ id: 'topic-english', subjectId: 'english', subjectName: 'English', name: 'Reading' }),
      ],
    }), 1).filter((session) => session.source === 'generated')

    expect(plan).toHaveLength(3)
    expect(plan.every((session) => session.plannedMinutes === 20)).toBe(true)
    expect(plan.slice(1).map((session, index) => Date.parse(session.scheduledAt) - Date.parse(plan[index]!.scheduledAt))).toEqual([30 * 60_000, 30 * 60_000])
  })

  it('preserves a locked manual session during replanning', () => {
    const locked = {
      id: 'locked-1', topicId: 'topic-maths', subjectId: 'maths', subjectName: 'Mathematics', topicName: 'Algebra',
      scheduledAt: '2026-09-17T17:00:00.000Z', plannedMinutes: 35, sessionType: 'Exam questions', status: 'planned',
      plannerReason: 'Parent locked', source: 'manual' as const, locked: true,
    }
    const plan = generateRevisionPlan(context({ existingSessions: [locked] }), 3)
    expect(plan.find((session) => session.id === 'locked-1')).toEqual(locked)
  })

  it('never schedules inactive course content', () => {
    const plan = generateRevisionPlan(context({ topics: [topic({ active: false })] }), 2)
    expect(plan.filter((session) => session.source === 'generated')).toHaveLength(0)
  })
})
