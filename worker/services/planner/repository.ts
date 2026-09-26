import type { Env, SessionUser } from '../../types'
import { recalculateTopicMastery } from '../progress'
import { awardQuizXp, awardSessionXp, checkWeeklyGoal } from '../gamification'
import type {
  PlannedSession,
  PlannedReviewItem,
  PlannerAvailability,
  PlannerContext,
  PlannerExam,
  PlannerException,
  PlannerTopic,
  TutorOccurrence,
} from './planner'

interface ProfileRow { user_id: string; default_session_minutes: number }
interface AvailabilityRow { weekday: number; available_minutes: number; start_time: string | null }
interface ExceptionRow { start_datetime: string; end_datetime: string; available_minutes: number | null; protect_streak: number; reason: string }
interface TutorRow { id: string; subject_id: string; subject_name: string; weekday: number; start_date: string; start_time: string; duration_minutes: number; recurrence_rule: string }
interface ExamRow { subject_id: string; exam_datetime: string }
interface TopicRow { id: string; subject_id: string; subject_name: string; name: string; active: number; mastery_score: number | null; rag_status: PlannerTopic['ragStatus'] | null; assessment_percentage: number | null; last_revised_at: string | null; next_review_at: string | null; estimated_effort: number; importance: number; manual_priority: number | null }
interface SessionRow { id: string; topic_id: string | null; subject_id: string; subject_name: string; topic_name: string | null; scheduled_at: string; planned_minutes: number; session_type: string; status: string; planner_reason: string | null; source: PlannedSession['source']; locked: number; review_items_json: string }

function parseReviewItems(value: string): PlannedReviewItem[] {
  try {
    const items: unknown = JSON.parse(value)
    if (!Array.isArray(items)) return []
    return items.filter((item): item is PlannedReviewItem => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false
      const value = item as Record<string, unknown>
      return typeof value.topicId === 'string' && typeof value.subjectId === 'string' &&
        typeof value.subjectName === 'string' && typeof value.topicName === 'string' &&
        typeof value.plannedMinutes === 'number' && typeof value.reason === 'string'
    })
  } catch { return [] }
}

function dateOnly(value: string): string { return value.slice(0, 10) }
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
function daysBetween(from: string, to: string): number {
  return Math.floor((new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / 86_400_000)
}
function weekday(date: string): number { return ((new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7) + 1 }

async function profileFor(user: SessionUser, env: Env): Promise<ProfileRow | null> {
  if (user.role === 'student') {
    return env.DB.prepare('SELECT user_id, default_session_minutes FROM student_profiles WHERE user_id = ?')
      .bind(user.id).first<ProfileRow>()
  }
  return env.DB.prepare('SELECT user_id, default_session_minutes FROM student_profiles ORDER BY created_at LIMIT 1')
    .first<ProfileRow>()
}

function tutorOccurrences(rows: TutorRow[], from: string, horizonDays: number): TutorOccurrence[] {
  const output: TutorOccurrence[] = []
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addDays(from, offset)
    for (const row of rows) {
      if (date < dateOnly(row.start_date) || weekday(date) !== row.weekday) continue
      const interval = row.recurrence_rule.includes('INTERVAL=2') ? 2 : 1
      const weeks = Math.floor(daysBetween(dateOnly(row.start_date), date) / 7)
      if (weeks % interval !== 0) continue
      output.push({ id: row.id, date, subjectId: row.subject_id, subjectName: row.subject_name, startTime: row.start_time, durationMinutes: row.duration_minutes })
    }
  }
  return output
}

export async function loadPlannerContext(user: SessionUser, env: Env, today = new Date().toISOString().slice(0, 10)): Promise<PlannerContext | null> {
  const profile = await profileFor(user, env)
  if (!profile) return null
  const end = `${addDays(today, 13)}T23:59:59.999Z`
  const [availability, exceptions, tutors, exams, topics, sessions] = await Promise.all([
    env.DB.prepare('SELECT weekday, available_minutes, start_time FROM weekly_availability WHERE student_id = ? AND active = 1 ORDER BY weekday').bind(profile.user_id).all<AvailabilityRow>(),
    env.DB.prepare('SELECT start_datetime, end_datetime, available_minutes, protect_streak, reason FROM availability_exceptions WHERE student_id = ? AND end_datetime >= ? AND start_datetime <= ?').bind(profile.user_id, `${today}T00:00:00.000Z`, end).all<ExceptionRow>(),
    env.DB.prepare(`SELECT ts.id, ts.subject_id, s.name AS subject_name, ts.weekday, ts.start_date, ts.start_time, ts.duration_minutes, ts.recurrence_rule FROM tutor_sessions ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.student_id = ? AND ts.active = 1`).bind(profile.user_id).all<TutorRow>(),
    env.DB.prepare('SELECT subject_id, exam_datetime FROM exams WHERE exam_datetime >= ? ORDER BY exam_datetime').bind(`${today}T00:00:00.000Z`).all<ExamRow>(),
    env.DB.prepare(
      `SELECT t.id, t.subject_id, s.name AS subject_name, t.name, t.active, t.estimated_effort, t.importance,
              tp.mastery_score, tp.rag_status, tp.last_revised_at, tp.next_review_at, tp.manual_priority,
              (SELECT a.percentage FROM assessments a WHERE a.student_id = ? AND a.topic_id = t.id ORDER BY a.completed_at DESC LIMIT 1) AS assessment_percentage
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       JOIN student_subjects ss ON ss.subject_id = t.subject_id AND ss.student_id = ?
       LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.student_id = ?
       WHERE t.active = 1 AND ss.active = 1 AND t.applicability = 'common'
         AND json_extract(ss.options_json, '$.configuration') = 'confirmed'
         AND (t.tier = 'both' OR t.tier = ss.tier)
         AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)`,
    ).bind(profile.user_id, profile.user_id, profile.user_id).all<TopicRow>(),
    env.DB.prepare(
      `SELECT rs.id, rs.topic_id, rs.subject_id, s.name AS subject_name, t.name AS topic_name,
              rs.scheduled_at, rs.planned_minutes, rs.session_type, rs.status, rs.planner_reason, rs.source, rs.locked,
              rs.review_items_json
       FROM revision_sessions rs JOIN subjects s ON s.id = rs.subject_id LEFT JOIN topics t ON t.id = rs.topic_id
       WHERE rs.student_id = ? AND rs.scheduled_at >= ? AND rs.scheduled_at <= ? ORDER BY rs.scheduled_at`,
    ).bind(profile.user_id, `${today}T00:00:00.000Z`, end).all<SessionRow>(),
  ])

  return {
    today,
    defaultSessionMinutes: profile.default_session_minutes,
    availability: availability.results.map((row): PlannerAvailability => ({ weekday: row.weekday, availableMinutes: row.available_minutes, startTime: row.start_time })),
    exceptions: exceptions.results.map((row): PlannerException => ({ startDatetime: row.start_datetime, endDatetime: row.end_datetime, availableMinutes: row.available_minutes ?? 0, protectStreak: row.protect_streak === 1, reason: row.reason })),
    tutors: tutorOccurrences(tutors.results, today, 14),
    exams: exams.results.map((row): PlannerExam => ({ subjectId: row.subject_id, examDatetime: row.exam_datetime })),
    topics: topics.results.map((row): PlannerTopic => ({ id: row.id, subjectId: row.subject_id, subjectName: row.subject_name, name: row.name, active: row.active === 1, masteryScore: row.mastery_score, ragStatus: row.rag_status ?? 'grey', latestAssessment: row.assessment_percentage, lastRevisedAt: row.last_revised_at, nextReviewAt: row.next_review_at, estimatedEffort: row.estimated_effort, importance: row.importance, manualPriority: row.manual_priority, requestedMore: false })),
    existingSessions: sessions.results.map((row): PlannedSession => ({ id: row.id, topicId: row.topic_id, subjectId: row.subject_id, subjectName: row.subject_name, topicName: row.topic_name ?? row.subject_name, scheduledAt: row.scheduled_at, plannedMinutes: row.planned_minutes, sessionType: row.session_type, status: row.status, plannerReason: row.planner_reason ?? '', source: row.source, locked: row.locked === 1, reviewItems: parseReviewItems(row.review_items_json) })),
  }
}

export async function savePlan(user: SessionUser, sessions: PlannedSession[], env: Env, today: string): Promise<void> {
  const profile = await profileFor(user, env)
  if (!profile) return
  await env.DB.prepare(`DELETE FROM revision_sessions WHERE student_id = ? AND scheduled_at >= ? AND source = 'generated' AND locked = 0 AND status = 'planned'`)
    .bind(profile.user_id, `${today}T00:00:00.000Z`).run()
  const planned = sessions.filter((session) =>
    (session.source === 'generated' && session.status === 'planned') ||
    (session.source === 'tutor' && session.status === 'tutor'),
  )
  if (!planned.length) return
  await env.DB.batch(planned.map((session) => env.DB.prepare(
    `INSERT OR REPLACE INTO revision_sessions
      (id, student_id, topic_id, subject_id, scheduled_at, planned_minutes, session_type, status, planner_reason, source, locked, review_items_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  ).bind(session.id, profile.user_id, session.topicId, session.subjectId, session.scheduledAt, session.plannedMinutes, session.sessionType, session.status, session.plannerReason, session.source, session.locked ? 1 : 0, JSON.stringify(session.reviewItems ?? []))))
}

export async function getSavedPlan(user: SessionUser, env: Env, today = new Date().toISOString().slice(0, 10)): Promise<PlannedSession[]> {
  const context = await loadPlannerContext(user, env, today)
  return context?.existingSessions ?? []
}

export async function getAvailability(user: SessionUser, env: Env): Promise<PlannerAvailability[]> {
  const profile = await profileFor(user, env)
  if (!profile) return []
  const result = await env.DB.prepare('SELECT weekday, available_minutes, start_time FROM weekly_availability WHERE student_id = ? AND active = 1 ORDER BY weekday')
    .bind(profile.user_id).all<AvailabilityRow>()
  return result.results.map((row) => ({ weekday: row.weekday, availableMinutes: row.available_minutes, startTime: row.start_time }))
}

export async function updateAvailability(user: SessionUser, values: PlannerAvailability[], env: Env): Promise<boolean> {
  const profile = await profileFor(user, env)
  if (!profile) return false
  await env.DB.batch(values.map((value) => env.DB.prepare(
    `INSERT INTO weekly_availability (id, student_id, weekday, available_minutes, start_time, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, weekday) DO UPDATE SET available_minutes = excluded.available_minutes, start_time = excluded.start_time, active = 1, updated_at = CURRENT_TIMESTAMP`,
  ).bind(`availability-${profile.user_id}-${value.weekday}`, profile.user_id, value.weekday, value.availableMinutes, value.startTime)))
  return true
}

export async function addAvailabilityException(
  user: SessionUser,
  value: { startDatetime: string; endDatetime: string; availableMinutes: number; protectStreak: boolean; reason: string },
  env: Env,
): Promise<boolean> {
  const profile = await profileFor(user, env)
  if (!profile) return false
  const result = await env.DB.prepare(
    `INSERT INTO availability_exceptions
      (id, student_id, start_datetime, end_datetime, reason, available_minutes, protect_streak, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(crypto.randomUUID(), profile.user_id, value.startDatetime, value.endDatetime, value.reason, value.availableMinutes, value.protectStreak ? 1 : 0).run()
  return result.success
}

export async function updateSessionStatus(
  user: SessionUser,
  sessionId: string,
  status: 'completed' | 'partially_completed' | 'skipped' | 'rescheduled',
  actualMinutes: number | null,
  env: Env,
): Promise<boolean> {
  const profile = await profileFor(user, env)
  if (!profile) return false
  const session = await env.DB.prepare(
    `SELECT topic_id, planned_minutes, xp_awarded, review_items_json FROM revision_sessions
     WHERE id = ? AND student_id = ? AND status = 'planned'`,
  ).bind(sessionId, profile.user_id).first<{ topic_id: string | null; planned_minutes: number; xp_awarded: number; review_items_json: string }>()
  if (!session) return false
  const result = await env.DB.prepare(
    `UPDATE revision_sessions SET status = ?, actual_minutes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND student_id = ? AND status = 'planned'`,
  ).bind(status, actualMinutes, sessionId, profile.user_id).run()
  if (!result.success || (result.meta.changes ?? 0) < 1) return false
  if (session.topic_id && (status === 'completed' || status === 'partially_completed')) {
    const minutes = actualMinutes ?? (status === 'completed' ? session.planned_minutes : 0)
    await env.DB.prepare(
      `INSERT INTO topic_progress
        (student_id, topic_id, total_sessions, total_minutes, last_revised_at, rag_status, created_at, updated_at)
       VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP, 'grey', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id, topic_id) DO UPDATE SET
         total_sessions = topic_progress.total_sessions + 1,
         total_minutes = topic_progress.total_minutes + excluded.total_minutes,
         last_revised_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(profile.user_id, session.topic_id, minutes).run()
    await recalculateTopicMastery(profile.user_id, session.topic_id, `Session ${status}`, env)
    if (status === 'completed' && session.xp_awarded === 0) {
      await env.DB.prepare('UPDATE revision_sessions SET xp_awarded = 10 WHERE id = ?').bind(sessionId).run()
      await awardSessionXp(profile.user_id, sessionId, env)
      await checkWeeklyGoal(profile.user_id, env)
    }
  }
  if (status === 'completed' || status === 'partially_completed') {
    for (const item of parseReviewItems(session.review_items_json)) {
      await env.DB.prepare(
        `INSERT INTO topic_progress
          (student_id, topic_id, total_sessions, total_minutes, last_revised_at, rag_status, created_at, updated_at)
         VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP, 'grey', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(student_id, topic_id) DO UPDATE SET
           total_sessions = topic_progress.total_sessions + 1,
           total_minutes = topic_progress.total_minutes + excluded.total_minutes,
           last_revised_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`,
      ).bind(profile.user_id, item.topicId, item.plannedMinutes).run()
      await recalculateTopicMastery(profile.user_id, item.topicId, 'Spaced retrieval completed', env)
    }
  }
  return true
}

export interface SessionCompletion {
  sessionId: string
  actualMinutes: number
  confidenceAfter: 'unknown' | 'struggling' | 'ok' | 'confident'
  assessmentPercentage: number | null
  notes: string
  reviewResults: Array<{ topicId: string; percentage: number | null }>
}

export async function scheduleRevisionNow(user: SessionUser, topicId: string, env: Env): Promise<boolean> {
  const profile = await profileFor(user, env)
  if (!profile) return false
  const topic = await env.DB.prepare(
    `SELECT t.subject_id FROM topics t
     JOIN student_subjects ss ON ss.subject_id = t.subject_id AND ss.student_id = ?
     WHERE t.id = ? AND t.active = 1 AND ss.active = 1
       AND (t.tier = 'both' OR t.tier = ss.tier)
       AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)`,
  ).bind(profile.user_id, topicId).first<{ subject_id: string }>()
  if (!topic) return false
  const result = await env.DB.prepare(
    `INSERT INTO revision_sessions
      (id, student_id, topic_id, subject_id, scheduled_at, planned_minutes, session_type, status, planner_reason, source, locked, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Revision now', 'planned', 'Started by the student from the topic page.', 'manual', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(crypto.randomUUID(), profile.user_id, topicId, topic.subject_id, new Date().toISOString(), profile.default_session_minutes).run()
  return result.success
}

export async function completeSession(user: SessionUser, input: SessionCompletion, env: Env): Promise<boolean> {
  const profile = await profileFor(user, env)
  if (!profile) return false
  const session = await env.DB.prepare(
    `SELECT topic_id, planned_minutes, xp_awarded, review_items_json FROM revision_sessions
     WHERE id = ? AND student_id = ? AND status = 'planned' AND topic_id IS NOT NULL`,
  ).bind(input.sessionId, profile.user_id).first<{ topic_id: string; planned_minutes: number; xp_awarded: number; review_items_json: string }>()
  if (!session) return false

  const result = await env.DB.prepare(
    `UPDATE revision_sessions SET status = 'completed', actual_minutes = ?, confidence_after = ?, notes = ?, xp_awarded = 10, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND student_id = ? AND status = 'planned'`,
  ).bind(input.actualMinutes, input.confidenceAfter, input.notes || null, input.sessionId, profile.user_id).run()
  if (!result.success || (result.meta.changes ?? 0) < 1) return false

  await env.DB.prepare(
    `INSERT INTO topic_progress
      (student_id, topic_id, confidence, total_sessions, total_minutes, last_revised_at, notes, rag_status, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, ?, 'grey', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, topic_id) DO UPDATE SET
       confidence = excluded.confidence,
       total_sessions = topic_progress.total_sessions + 1,
       total_minutes = topic_progress.total_minutes + excluded.total_minutes,
       last_revised_at = CURRENT_TIMESTAMP,
       notes = CASE WHEN excluded.notes IS NULL THEN topic_progress.notes ELSE excluded.notes END,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(profile.user_id, session.topic_id, input.confidenceAfter, input.actualMinutes, input.notes || null).run()

  if (input.assessmentPercentage !== null) {
    const assessmentId = crypto.randomUUID()
    await env.DB.prepare(
      `INSERT INTO assessments
        (id, student_id, topic_id, score, maximum_score, percentage, assessment_type, completed_at, created_at)
       VALUES (?, ?, ?, ?, 100, ?, 'Session check', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ).bind(assessmentId, profile.user_id, session.topic_id, input.assessmentPercentage, input.assessmentPercentage).run()
    await awardQuizXp(profile.user_id, assessmentId, env)
  }
  await recalculateTopicMastery(profile.user_id, session.topic_id, 'Revision session completed', env)
  const reviewItems = parseReviewItems(session.review_items_json)
  for (const item of reviewItems) {
    const submitted = input.reviewResults.find((result) => result.topicId === item.topicId)
    await env.DB.prepare(
      `INSERT INTO topic_progress
        (student_id, topic_id, total_sessions, total_minutes, last_revised_at, rag_status, created_at, updated_at)
       VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP, 'grey', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id, topic_id) DO UPDATE SET
         total_sessions = topic_progress.total_sessions + 1,
         total_minutes = topic_progress.total_minutes + excluded.total_minutes,
         last_revised_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(profile.user_id, item.topicId, item.plannedMinutes).run()
    if (submitted?.percentage !== null && submitted?.percentage !== undefined) {
      const assessmentId = crypto.randomUUID()
      await env.DB.prepare(
        `INSERT INTO assessments
          (id, student_id, topic_id, score, maximum_score, percentage, assessment_type, completed_at, created_at)
         VALUES (?, ?, ?, ?, 100, ?, 'Delayed retrieval check', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      ).bind(assessmentId, profile.user_id, item.topicId, submitted.percentage, submitted.percentage).run()
      await awardQuizXp(profile.user_id, assessmentId, env)
    }
    await recalculateTopicMastery(profile.user_id, item.topicId, 'Spaced retrieval completed', env)
  }
  if (session.xp_awarded === 0) await awardSessionXp(profile.user_id, input.sessionId, env)
  await checkWeeklyGoal(profile.user_id, env)
  return true
}
