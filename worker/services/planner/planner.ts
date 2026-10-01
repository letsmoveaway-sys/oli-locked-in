import type { RagStatus } from './mastery'
import { productLocalDateTimeToIso } from '../../utils/dateTime'

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
  availableMinutes: number
  startTime: string | null
  sessionMinutes?: number
}

export interface PlannerException {
  startDatetime: string
  endDatetime: string
  availableMinutes: number
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
  if (!topic.active) return 0
  const gap = 1 - (topic.masteryScore ?? 0) / 100
  return Math.max(topic.ragStatus === 'green' ? topic.estimatedEffort * 0.1 : 0, topic.estimatedEffort * gap)
}

export function calculateTopicPriority(topic: PlannerTopic, context: PriorityContext): number {
  if (!topic.active) return 0
  const masteryGap = 1 - (topic.masteryScore ?? 0) / 100
  const relevantExams = context.exams
    .filter((exam) => exam.subjectId === topic.subjectId)
    .map((exam) => daysBetween(context.today, exam.examDatetime))
    .filter((days) => days >= 0)
  const nearestExam = relevantExams.length ? Math.min(...relevantExams) : null
  const examUrgency = nearestExam === null ? 0.25 : clamp(1 - nearestExam / 180)
  const sinceRevision = topic.lastRevisedAt ? clamp(daysBetween(topic.lastRevisedAt, context.today) / 30) : 1
  const importance = clamp(topic.importance)
  const uncovered = topic.masteryScore === null ? 1 : 0
  const manual = clamp((topic.manualPriority ?? 0) / 100)

  let score = 100 * (
    masteryGap * 0.35 +
    examUrgency * 0.2 +
    sinceRevision * 0.15 +
    importance * 0.1 +
    uncovered * 0.1 +
    manual * 0.1
  )
  if (topic.ragStatus === 'red') score += 10
  if (topic.ragStatus === 'grey') score += 8
  if (topic.ragStatus === 'amber') score += 3
  if (topic.ragStatus === 'green') score -= 10
  if (topic.latestAssessment !== null && topic.latestAssessment < 50) score += 15
  if (topic.latestAssessment !== null && topic.latestAssessment >= 80) score -= 12
  if (topic.requestedMore) score += 15
  if (context.tutorSubjectToday === topic.subjectId) score -= 25
  if (topic.lastRevisedAt && daysBetween(topic.lastRevisedAt, context.today) <= 2 && (topic.masteryScore ?? 0) >= 75) score -= 15
  return Math.max(0, Math.round(score * 10) / 10)
}

function explanation(topic: PlannerTopic, asOfDate: string): string {
  const parts = [topic.ragStatus === 'grey' ? 'Not assessed' : `${topic.ragStatus[0]!.toUpperCase()}${topic.ragStatus.slice(1)} topic`]
  if (topic.latestAssessment !== null && topic.latestAssessment < 50) parts.push('low recent assessment')
  if (!topic.lastRevisedAt) parts.push('not revised yet')
  else {
    const days = Math.max(0, Math.floor(daysBetween(topic.lastRevisedAt, asOfDate)))
    if (days > 0) parts.push(`not revised for ${days} days`)
  }
  if (topic.requestedMore) parts.push('requested more practice')
  return parts.join(' · ')
}

function exceptionFor(date: string, exceptions: PlannerException[]): PlannerException | undefined {
  return exceptions.find((item) => date >= dateOnly(item.startDatetime) && date <= dateOnly(item.endDatetime))
}

function sessionTime(date: string, startTime: string | null, index: number, duration: number): string {
  const [hour = 17, minute = 0] = (startTime ?? '17:00').split(':').map(Number)
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCHours(hour, minute + index * (duration + 10))
  return productLocalDateTimeToIso(value.toISOString().slice(0, 16))
}

export function generateRevisionPlan(context: PlannerContext, horizonDays = 14): PlannedSession[] {
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
  const reviewTopicsScheduled = new Set<string>()
  for (const session of preserved) {
    plannedBySubject.set(session.subjectId, (plannedBySubject.get(session.subjectId) ?? 0) + 1)
    if (session.topicId) plannedByTopic.set(session.topicId, (plannedByTopic.get(session.topicId) ?? 0) + 1)
    for (const item of session.reviewItems ?? []) reviewTopicsScheduled.add(item.topicId)
  }
  let previousTopicId: string | null = null
  let previousSubjectId: string | null = null

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const date = addDays(context.today, dayOffset)
    const template = context.availability.find((item) => item.weekday === weekday(date))
    const sessionMinutes = template?.sessionMinutes ?? context.defaultSessionMinutes
    const exception = exceptionFor(date, context.exceptions)
    let minutes = exception ? exception.availableMinutes : template?.availableMinutes ?? 0
    const existingToday = output.filter((session) => dateOnly(session.scheduledAt) === date)
    minutes -= existingToday.reduce((total, session) => total + session.plannedMinutes, 0)

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
        plannedMinutes: tutor.durationMinutes,
        sessionType: 'Tutor session',
        status: 'tutor',
        plannerReason: 'Recurring tutor session',
        source: 'tutor',
        locked: true,
        reviewItems: [],
      })
      plannedBySubject.set(tutor.subjectId, (plannedBySubject.get(tutor.subjectId) ?? 0) + 1)
      minutes -= tutor.durationMinutes
    }

    if (minutes < sessionMinutes) continue
    const subjectCounts = new Map<string, number>()
    const topicIdsToday = new Set<string>()
    for (const session of output.filter((item) => dateOnly(item.scheduledAt) === date)) {
      subjectCounts.set(session.subjectId, (subjectCounts.get(session.subjectId) ?? 0) + 1)
      if (session.topicId) topicIdsToday.add(session.topicId)
    }
    let slotIndex = 0
    while (minutes >= sessionMinutes) {
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

      const dueReviews = context.topics
        .filter((topic) => topic.active && topic.id !== selected.topic.id && topic.lastRevisedAt && topic.nextReviewAt)
        .filter((topic) => dateOnly(topic.nextReviewAt!) <= date && !topicIdsToday.has(topic.id) && !reviewTopicsScheduled.has(topic.id))
        .sort((left, right) => left.nextReviewAt!.localeCompare(right.nextReviewAt!) ||
          calculateTopicPriority(right, { today: date, exams: context.exams }) - calculateTopicPriority(left, { today: date, exams: context.exams }))
      const reviewTopic = dueReviews[0]
      const primaryIsDueReview = Boolean(selected.topic.lastRevisedAt && selected.topic.nextReviewAt &&
        dateOnly(selected.topic.nextReviewAt) <= date)
      const reviewItems: PlannedReviewItem[] = reviewTopic ? [{
        topicId: reviewTopic.id,
        subjectId: reviewTopic.subjectId,
        subjectName: reviewTopic.subjectName,
        topicName: reviewTopic.name,
        plannedMinutes: Math.min(8, Math.max(5, sessionMinutes - 20)),
        reason: `Spaced retrieval from ${Math.max(1, Math.floor(daysBetween(reviewTopic.lastRevisedAt!, date)))} days ago`,
      }] : []

      let generatedId = `generated-${date}-${slotIndex}`
      while (usedIds.has(generatedId)) generatedId = `${generatedId}-next`
      usedIds.add(generatedId)
      output.push({
        id: generatedId,
        topicId: selected.topic.id,
        subjectId: selected.topic.subjectId,
        subjectName: selected.topic.subjectName,
        topicName: selected.topic.name,
        scheduledAt: sessionTime(date, template?.startTime ?? null, slotIndex, sessionMinutes),
        startedAt: null,
        plannedMinutes: sessionMinutes,
        sessionType: reviewItems.length ? 'Learning + spaced review' : primaryIsDueReview ? 'Spaced retrieval review' : 'Focused learning',
        status: 'planned',
        plannerReason: reviewItems.length
          ? `${explanation(selected.topic, date)} · includes a due memory check`
          : primaryIsDueReview
            ? `Review due now · retrieve what you remember before checking notes`
            : explanation(selected.topic, date),
        source: 'generated',
        locked: false,
        reviewItems,
      })
      workload.set(selected.topic.id, Math.max(0, (workload.get(selected.topic.id) ?? 0) - 1))
      subjectCounts.set(selected.topic.subjectId, (subjectCounts.get(selected.topic.subjectId) ?? 0) + 1)
      topicIdsToday.add(selected.topic.id)
      plannedBySubject.set(selected.topic.subjectId, (plannedBySubject.get(selected.topic.subjectId) ?? 0) + 1)
      plannedByTopic.set(selected.topic.id, (plannedByTopic.get(selected.topic.id) ?? 0) + 1)
      if (reviewTopic) {
        reviewTopicsScheduled.add(reviewTopic.id)
        topicIdsToday.add(reviewTopic.id)
      }
      previousTopicId = selected.topic.id
      previousSubjectId = selected.topic.subjectId
      minutes -= sessionMinutes
      slotIndex += 1
    }
  }
  return output.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
}

export function replanAfterChange(change: string, context: PlannerContext): { sessions: PlannedSession[]; message: string; change: string } {
  return { sessions: generateRevisionPlan(context, 14), message: 'Your plan has been adjusted.', change }
}

export function calculateBurndown(context: PlannerContext, horizonDays = 14): Array<{ date: string; idealRemaining: number }> {
  const total = context.topics.reduce((sum, topic) => sum + calculateRemainingWorkload(topic), 0)
  return Array.from({ length: horizonDays + 1 }, (_, index) => ({
    date: addDays(context.today, index),
    idealRemaining: Math.round(Math.max(0, total * (1 - index / horizonDays)) * 10) / 10,
  }))
}
