import type { RagStatus } from './mastery'

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
  estimatedEffort: number
  importance: number
  manualPriority: number | null
  requestedMore: boolean
}

export interface PlannerExam {
  subjectId: string
  examDatetime: string
}

export interface PlannerAvailability {
  weekday: number
  availableMinutes: number
  startTime: string | null
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
  plannedMinutes: number
  sessionType: string
  status: string
  plannerReason: string
  source: 'generated' | 'manual' | 'tutor'
  locked: boolean
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
  value.setUTCHours(hour, minute + index * duration)
  return value.toISOString()
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
  let previousTopicId: string | null = null
  let previousSubjectId: string | null = null

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const date = addDays(context.today, dayOffset)
    const template = context.availability.find((item) => item.weekday === weekday(date))
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
        scheduledAt: `${date}T${tutor.startTime}:00.000Z`,
        plannedMinutes: tutor.durationMinutes,
        sessionType: 'Tutor session',
        status: 'tutor',
        plannerReason: 'Recurring tutor session',
        source: 'tutor',
        locked: true,
      })
      minutes -= tutor.durationMinutes
    }

    if (minutes < context.defaultSessionMinutes) continue
    const subjectCounts = new Map<string, number>()
    for (const session of output.filter((item) => dateOnly(item.scheduledAt) === date)) {
      subjectCounts.set(session.subjectId, (subjectCounts.get(session.subjectId) ?? 0) + 1)
    }
    let slotIndex = 0
    while (minutes >= context.defaultSessionMinutes) {
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
      const selected = candidates[0]
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
        scheduledAt: sessionTime(date, template?.startTime ?? null, slotIndex, context.defaultSessionMinutes),
        plannedMinutes: context.defaultSessionMinutes,
        sessionType: 'Learn/review',
        status: 'planned',
        plannerReason: explanation(selected.topic, date),
        source: 'generated',
        locked: false,
      })
      workload.set(selected.topic.id, Math.max(0, (workload.get(selected.topic.id) ?? 0) - 1))
      subjectCounts.set(selected.topic.subjectId, (subjectCounts.get(selected.topic.subjectId) ?? 0) + 1)
      previousTopicId = selected.topic.id
      previousSubjectId = selected.topic.subjectId
      minutes -= context.defaultSessionMinutes
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
