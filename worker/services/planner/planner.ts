import type { RagStatus } from './mastery'
import { productLocalDateTimeToIso } from '../../utils/dateTime'

export const PLANNING_HORIZON_DAYS = 42

export interface PlannerTopic {
  id: string
  subjectId: string
  subjectName: string
  name: string
  active: boolean
  masteryScore: number | null
  ragStatus: RagStatus
  latestAssessment: number | null
  lastRevisedAt: string | null
  nextReviewAt: string | null
  estimatedEffort: number
  importance: number
  manualPriority: number | null
  requestedMore: boolean
  targetSessions?: number
  completedSessions?: number
  coverageComplete?: boolean
}

export interface PlannedReviewItem {
  topicId: string
  subjectId: string
  subjectName: string
  topicName: string
  plannedMinutes: number
  reason: string
}

export interface PlannerExam {
  subjectId: string
  examDatetime: string
}

export interface PlannerAvailability {
  weekday: number
  availableSlots?: number
  availableMinutes?: number
  sessionMinutes?: number
  startTime?: string | null
}

export interface PlannerException {
  startDatetime: string
  endDatetime: string
  availableSlots?: number
  availableMinutes?: number
  protectStreak: boolean
  reason: string
}

export interface TutorOccurrence {
  id: string
  date: string
  subjectId: string
  subjectName: string
  startTime: string
  durationMinutes: number
}

export interface PlannedSession {
  id: string
  topicId: string | null
  subjectId: string
  subjectName: string
  topicName: string
  scheduledAt: string
  startedAt?: string | null
  plannedMinutes: number
  sessionType: string
  status: string
  plannerReason: string
  source: 'generated' | 'manual' | 'tutor'
  locked: boolean
  reviewItems?: PlannedReviewItem[]
}

export interface PlannerContext {
  today: string
  defaultSessionMinutes: number
  availability: PlannerAvailability[]
  exceptions: PlannerException[]
  tutors: TutorOccurrence[]
  exams: PlannerExam[]
  topics: PlannerTopic[]
  existingSessions: PlannedSession[]
}

export interface PriorityContext {
  today: string
  exams: PlannerExam[]
  tutorSubjectToday?: string | null
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

function addDays(date: string, days: number): string {
  const value = new Date(`${dateOnly(date)}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return (new Date(`${dateOnly(to)}T00:00:00.000Z`).getTime() - new Date(`${dateOnly(from)}T00:00:00.000Z`).getTime()) / 86_400_000
}

function weekday(date: string): number {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  return ((day + 6) % 7) + 1
}

export function calculateRemainingWorkload(topic: PlannerTopic): number {
  const targetSessions = topic.targetSessions ?? Math.max(1, Math.ceil(topic.estimatedEffort))
  if (!topic.active || targetSessions === 0) return 0
  return Math.max(topic.coverageComplete === true ? 0 : 1, targetSessions - (topic.completedSessions ?? 0))
}

export function calculateTopicPriority(topic: PlannerTopic, context: PriorityContext): number {
  if (!topic.active) return 0
  const relevantExams = context.exams
    .filter((exam) => exam.subjectId === topic.subjectId)
    .map((exam) => daysBetween(context.today, exam.examDatetime))
    .filter((days) => days >= 0)
  const nearestExam = relevantExams.length ? Math.min(...relevantExams) : null
  const examUrgency = nearestExam === null ? 0.25 : clamp(1 - nearestExam / 180)
  const manual = clamp((topic.manualPriority ?? 0) / 100)
  const remaining = calculateRemainingWorkload(topic)
  if (remaining <= 0) return 0

  let score = 100 * (
    examUrgency * 0.45 +
    clamp(remaining / Math.max(1, topic.targetSessions ?? topic.estimatedEffort)) * 0.25 +
    clamp(topic.importance) * 0.15 +
    manual * 0.15
  )
  if (topic.requestedMore) score += 15
  if (context.tutorSubjectToday === topic.subjectId) score -= 25
  return Math.max(0, Math.round(score * 10) / 10)
}

function explanation(topic: PlannerTopic, _asOfDate: string): string {
  const remaining = calculateRemainingWorkload(topic)
  const parts = [`${remaining} allocated session${remaining === 1 ? '' : 's'} remaining`]
  if (topic.coverageComplete === false && (topic.completedSessions ?? 0) > 0) parts.push('coverage points still open')
  if (!topic.lastRevisedAt) parts.push('not covered yet')
  return parts.join(' · ')
}

function exceptionFor(date: string, exceptions: PlannerException[]): PlannerException | undefined {
  return exceptions.find((item) => date >= dateOnly(item.startDatetime) && date <= dateOnly(item.endDatetime))
}

function sessionTime(date: string, startTime: string | null | undefined, index: number): string {
  const [hour = 12, minute = 0] = (startTime ?? '12:00').split(':').map(Number)
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCHours(hour, minute + index * 60)
  return productLocalDateTimeToIso(value.toISOString().slice(0, 16))
}

export function generateRevisionPlan(context: PlannerContext, horizonDays = PLANNING_HORIZON_DAYS): PlannedSession[] {
  const end = addDays(context.today, horizonDays - 1)
  const preserved = context.existingSessions.filter((session) => {
    const date = dateOnly(session.scheduledAt)
    if (session.source === 'tutor') return false // Recreated from the authoritative recurrence rule below.
    return date >= context.today && date <= end && (session.locked || session.status !== 'planned')
  })
  const output = [...preserved]
  const usedIds = new Set(output.map((session) => session.id))
  const workload = new Map(context.topics.map((topic) => [topic.id, calculateRemainingWorkload(topic)]))
  const workloadBySubject = new Map<string, number>()
  for (const topic of context.topics.filter((item) => item.active)) {
    workloadBySubject.set(topic.subjectId, (workloadBySubject.get(topic.subjectId) ?? 0) + (workload.get(topic.id) ?? 0))
  }
  const activeSubjects = [...workloadBySubject.keys()]
  const totalWorkload = [...workloadBySubject.values()].reduce((total, value) => total + value, 0)
  const subjectTargetShare = new Map(activeSubjects.map((subjectId) => {
    const equalShare = activeSubjects.length ? 1 / activeSubjects.length : 0
    const workloadShare = totalWorkload ? (workloadBySubject.get(subjectId) ?? 0) / totalWorkload : equalShare
    return [subjectId, equalShare * 0.5 + workloadShare * 0.5]
  }))
  const plannedBySubject = new Map<string, number>()
  const plannedByTopic = new Map<string, number>()
  for (const session of preserved) {
    plannedBySubject.set(session.subjectId, (plannedBySubject.get(session.subjectId) ?? 0) + 1)
    if (session.topicId) plannedByTopic.set(session.topicId, (plannedByTopic.get(session.topicId) ?? 0) + 1)
  }
  let previousTopicId: string | null = null
  let previousSubjectId: string | null = null

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const date = addDays(context.today, dayOffset)
    const template = context.availability.find((item) => item.weekday === weekday(date))
    const exception = exceptionFor(date, context.exceptions)
    let slots = exception
      ? exception.availableSlots ?? Math.floor((exception.availableMinutes ?? 0) / 35)
      : template?.availableSlots ?? Math.floor((template?.availableMinutes ?? 0) / Math.max(1, template?.sessionMinutes ?? context.defaultSessionMinutes))
    const existingToday = output.filter((session) => dateOnly(session.scheduledAt) === date)
    slots -= existingToday.length

    const tutorsToday = context.tutors.filter((tutor) => tutor.date === date)
    for (const tutor of tutorsToday) {
      output.push({
        id: `tutor-${tutor.id}-${date}`,
        topicId: null,
        subjectId: tutor.subjectId,
        subjectName: tutor.subjectName,
        topicName: `${tutor.subjectName} tutor`,
        scheduledAt: productLocalDateTimeToIso(`${date}T${tutor.startTime}`),
        startedAt: null,
        plannedMinutes: 1,
        sessionType: 'Tutor session',
        status: 'tutor',
        plannerReason: 'Recurring tutor session',
        source: 'tutor',
        locked: true,
        reviewItems: [],
      })
      plannedBySubject.set(tutor.subjectId, (plannedBySubject.get(tutor.subjectId) ?? 0) + 1)
      slots -= 1
    }

    if (slots < 1) continue
    const subjectCounts = new Map<string, number>()
    const topicIdsToday = new Set<string>()
    for (const session of output.filter((item) => dateOnly(item.scheduledAt) === date)) {
      subjectCounts.set(session.subjectId, (subjectCounts.get(session.subjectId) ?? 0) + 1)
      if (session.topicId) topicIdsToday.add(session.topicId)
    }
    let slotIndex = 0
    while (slots >= 1) {
      const tutorSubjects = new Set(tutorsToday.map((tutor) => tutor.subjectId))
      const candidates = context.topics
        .filter((topic) => topic.active && (workload.get(topic.id) ?? 0) > 0.05)
        .filter((topic) => (subjectCounts.get(topic.subjectId) ?? 0) < 2)
        .map((topic) => {
          let priority = calculateTopicPriority(topic, {
            today: date,
            exams: context.exams,
            tutorSubjectToday: tutorSubjects.has(topic.subjectId) ? topic.subjectId : null,
          })
          if (topic.id === previousTopicId) priority -= 30
          if (topic.subjectId === previousSubjectId) priority -= 8
          return { topic, priority }
        })
        .sort((left, right) => right.priority - left.priority || left.topic.name.localeCompare(right.topic.name))
      const candidateSubjects = [...new Set(candidates.map(({ topic }) => topic.subjectId))]
      const newSubjectsToday = candidateSubjects.filter((subjectId) => !subjectCounts.has(subjectId))
      const subjectPool = newSubjectsToday.length ? newSubjectsToday : candidateSubjects
      const selectedSubject = subjectPool.sort((left, right) => {
        const leftRatio = (plannedBySubject.get(left) ?? 0) / Math.max(0.001, subjectTargetShare.get(left) ?? 0)
        const rightRatio = (plannedBySubject.get(right) ?? 0) / Math.max(0.001, subjectTargetShare.get(right) ?? 0)
        return leftRatio - rightRatio || (subjectTargetShare.get(right) ?? 0) - (subjectTargetShare.get(left) ?? 0) || left.localeCompare(right)
      })[0]
      const subjectCandidates = candidates.filter(({ topic }) => topic.subjectId === selectedSubject)
      const freshTopicCandidates = subjectCandidates.filter(({ topic }) => !topicIdsToday.has(topic.id))
      const topicPool = freshTopicCandidates.length ? freshTopicCandidates : subjectCandidates
      const selected = topicPool.sort((left, right) => {
        const countDifference = (plannedByTopic.get(left.topic.id) ?? 0) - (plannedByTopic.get(right.topic.id) ?? 0)
        return countDifference || right.priority - left.priority || left.topic.name.localeCompare(right.topic.name)
      })[0]
      if (!selected || selected.priority <= 0) break

      let generatedId = `generated-${date}-${slotIndex}`
      while (usedIds.has(generatedId)) generatedId = `${generatedId}-next`
      usedIds.add(generatedId)
      output.push({
        id: generatedId,
        topicId: selected.topic.id,
        subjectId: selected.topic.subjectId,
        subjectName: selected.topic.subjectName,
        topicName: selected.topic.name,
        scheduledAt: sessionTime(date, template?.startTime, slotIndex),
        startedAt: null,
        plannedMinutes: 1,
        sessionType: 'Revision topic',
        status: 'planned',
        plannerReason: explanation(selected.topic, date),
        source: 'generated',
        locked: false,
        reviewItems: [],
      })
      workload.set(selected.topic.id, Math.max(0, (workload.get(selected.topic.id) ?? 0) - 1))
      subjectCounts.set(selected.topic.subjectId, (subjectCounts.get(selected.topic.subjectId) ?? 0) + 1)
      topicIdsToday.add(selected.topic.id)
      plannedBySubject.set(selected.topic.subjectId, (plannedBySubject.get(selected.topic.subjectId) ?? 0) + 1)
      plannedByTopic.set(selected.topic.id, (plannedByTopic.get(selected.topic.id) ?? 0) + 1)
      previousTopicId = selected.topic.id
      previousSubjectId = selected.topic.subjectId
      slots -= 1
      slotIndex += 1
    }
  }
  return output.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
}

export function replanAfterChange(change: string, context: PlannerContext): { sessions: PlannedSession[]; message: string; change: string } {
  return { sessions: generateRevisionPlan(context), message: 'Your six-week schedule has been adjusted.', change }
}

export function calculateBurndown(context: PlannerContext, horizonDays = 14): Array<{ date: string; idealRemaining: number }> {
  const total = context.topics.reduce((sum, topic) => sum + calculateRemainingWorkload(topic), 0)
  return Array.from({ length: horizonDays + 1 }, (_, index) => ({
    date: addDays(context.today, index),
    idealRemaining: Math.round(Math.max(0, total * (1 - index / horizonDays)) * 10) / 10,
  }))
}
