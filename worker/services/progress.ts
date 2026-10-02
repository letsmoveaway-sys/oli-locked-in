import type { Env, SessionUser } from '../types'
import { calculateMastery, type Confidence, type MasteryEvidence, type RagStatus } from './planner/mastery'
import { awardQuizXp, awardRagTransitionXp } from './gamification'
import { buildCoverageItems } from '../content/coverage'

interface ProgressRow {
  topic_id: string
  topic_name: string
  description: string
  subject_id: string
  subject_name: string
  component: string | null
  mastery_score: number | null
  confidence: Confidence | null
  rag_status: RagStatus | null
  last_revised_at: string | null
  total_sessions: number | null
  total_minutes: number | null
  next_review_at: string | null
  assessment_percentage: number | null
  target_sessions: number | null
}

interface EvidenceRow {
  confidence: Confidence | null
  total_sessions: number | null
  total_minutes: number | null
  last_revised_at: string | null
  assessment_percentage: number | null
  rag_status: RagStatus | null
}

export interface TopicProgressView {
  topicId: string
  topicName: string
  description: string
  subjectId: string
  subjectName: string
  component: string | null
  masteryScore: number | null
  confidence: Confidence | null
  ragStatus: RagStatus
  lastRevisedAt: string | null
  totalSessions: number
  totalMinutes: number
  nextReviewAt: string | null
  latestAssessment: number | null
  targetSessions: number
  remainingSessions: number
  coverageItems: Array<{ id: string; name: string; completed: boolean }>
}

export interface TopicDetailView extends TopicProgressView {
  notes: string
  masteryHistory: Array<{ score: number; recordedAt: string; reason: string }>
  assessments: Array<{ percentage: number; assessmentType: string; completedAt: string }>
  sessions: Array<{
    id: string
    scheduledAt: string
    plannedMinutes: number
    actualMinutes: number | null
    status: string
    sessionType: string
    confidenceAfter: Confidence | null
    notes: string
  }>
}

async function studentIdFor(user: SessionUser, env: Env): Promise<string | null> {
  if (user.role === 'student') return user.id
  const row = await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1')
    .first<{ user_id: string }>()
  return row?.user_id ?? null
}

export async function getProgress(user: SessionUser, env: Env): Promise<TopicProgressView[]> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return []
  const [result, coverage] = await Promise.all([env.DB.prepare(
    `SELECT t.id AS topic_id, t.name AS topic_name, t.description, t.subject_id,
            s.name AS subject_name, t.component, tp.mastery_score, tp.confidence,
            tp.rag_status, tp.last_revised_at, tp.total_sessions, tp.total_minutes,
            tp.next_review_at, tst.target_sessions,
            (SELECT a.percentage FROM assessments a
             WHERE a.student_id = ? AND a.topic_id = t.id
             ORDER BY a.completed_at DESC LIMIT 1) AS assessment_percentage
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     JOIN student_subjects ss ON ss.subject_id = t.subject_id AND ss.student_id = ?
     LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.student_id = ?
     LEFT JOIN topic_schedule_targets tst ON tst.topic_id = t.id AND tst.student_id = ?
     WHERE t.active = 1 AND ss.active = 1
       AND (t.applicability = 'common'
         OR (t.subject_id = 'subject-geography' AND (
           t.id = json_extract(ss.options_json, '$.livingWorldOption')
           OR t.id = json_extract(ss.options_json, '$.resourceOption')
           OR instr(COALESCE(json_extract(ss.options_json, '$.ukLandscapeOptions'), ''), t.id) > 0
         ))
         OR (t.subject_id = 'subject-design-technology'
           AND COALESCE(json_extract(ss.options_json, '$.specialistMaterial'), 'TBC') <> 'TBC'))
       AND (t.tier = 'both' OR t.tier = ss.tier)
       AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)
     ORDER BY s.name, t.name`,
  ).bind(studentId, studentId, studentId, studentId).all<ProgressRow>(),
  env.DB.prepare('SELECT topic_id, coverage_item_id FROM topic_coverage_progress WHERE student_id = ?')
    .bind(studentId).all<{ topic_id: string; coverage_item_id: string }>(),
  ])

  const completed = new Set(coverage.results.map((item) => `${item.topic_id}:${item.coverage_item_id}`))

  return result.results.map((row) => {
    const coverageItems = buildCoverageItems({ id: row.topic_id, name: row.topic_name, description: row.description })
      .map((item) => ({ ...item, completed: completed.has(`${row.topic_id}:${item.id}`) }))
    const targetSessions = row.target_sessions ?? 1
    const remainingCoverage = coverageItems.some((item) => !item.completed)
    return ({
    topicId: row.topic_id,
    topicName: row.topic_name,
    description: row.description,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    component: row.component,
    masteryScore: row.mastery_score,
    confidence: row.confidence,
    ragStatus: row.rag_status ?? 'grey',
    lastRevisedAt: row.last_revised_at,
    totalSessions: row.total_sessions ?? 0,
    totalMinutes: row.total_minutes ?? 0,
    nextReviewAt: row.next_review_at,
    latestAssessment: row.assessment_percentage,
    targetSessions,
    remainingSessions: Math.max(remainingCoverage ? 1 : 0, targetSessions - (row.total_sessions ?? 0)),
    coverageItems,
  })})
}

export async function setTopicScheduleTarget(user: SessionUser, topicId: string, targetSessions: number, env: Env): Promise<boolean> {
  const studentId = await studentIdFor(user, env)
  if (!studentId || !(await topicAvailable(studentId, topicId, env))) return false
  const result = await env.DB.prepare(
    `INSERT INTO topic_schedule_targets (student_id, topic_id, target_sessions, created_at, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, topic_id) DO UPDATE SET target_sessions = excluded.target_sessions, updated_at = CURRENT_TIMESTAMP`,
  ).bind(studentId, topicId, targetSessions).run()
  return result.success
}

export async function getTopicDetail(user: SessionUser, topicId: string, env: Env): Promise<TopicDetailView | null> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return null
  const topic = (await getProgress(user, env)).find((item) => item.topicId === topicId)
  if (!topic) return null

  const [progress, history, assessments, sessions] = await Promise.all([
    env.DB.prepare('SELECT notes FROM topic_progress WHERE student_id = ? AND topic_id = ?')
      .bind(studentId, topicId).first<{ notes: string | null }>(),
    env.DB.prepare('SELECT score, recorded_at, reason FROM mastery_history WHERE student_id = ? AND topic_id = ? ORDER BY recorded_at DESC LIMIT 20')
      .bind(studentId, topicId).all<{ score: number; recorded_at: string; reason: string }>(),
    env.DB.prepare('SELECT percentage, assessment_type, marking_source, marking_confidence, feedback_json, marking_model, rubric_version, completed_at FROM assessments WHERE student_id = ? AND topic_id = ? ORDER BY completed_at DESC LIMIT 20')
      .bind(studentId, topicId).all<{ percentage: number; assessment_type: string; marking_source: 'auto_marked' | 'ai_estimated' | 'self_reported' | 'teacher_marked'; marking_confidence: 'low' | 'medium' | 'high' | null; feedback_json: string | null; marking_model: string | null; rubric_version: string | null; completed_at: string }>(),
    env.DB.prepare(`SELECT id, scheduled_at, planned_minutes, actual_minutes, status, session_type, confidence_after, notes
                    FROM revision_sessions WHERE student_id = ? AND topic_id = ?
                    ORDER BY scheduled_at DESC LIMIT 20`)
      .bind(studentId, topicId).all<{ id: string; scheduled_at: string; planned_minutes: number; actual_minutes: number | null; status: string; session_type: string; confidence_after: Confidence | null; notes: string | null }>(),
  ])

  return {
    ...topic,
    notes: progress?.notes ?? '',
    masteryHistory: history.results.map((item) => ({ score: item.score, recordedAt: item.recorded_at, reason: item.reason })),
    assessments: assessments.results.map((item) => ({ percentage: item.percentage, assessmentType: item.assessment_type, markingSource: item.marking_source, markingConfidence: item.marking_confidence, feedback: item.feedback_json ? JSON.parse(item.feedback_json) as { summary?: string; nextStep?: string } : null, markingModel: item.marking_model, rubricVersion: item.rubric_version, completedAt: item.completed_at })),
    sessions: sessions.results.map((item) => ({
      id: item.id,
      scheduledAt: item.scheduled_at,
      plannedMinutes: item.planned_minutes,
      actualMinutes: item.actual_minutes,
      status: item.status,
      sessionType: item.session_type,
      confidenceAfter: item.confidence_after,
      notes: item.notes ?? '',
    })),
  }
}

async function topicAvailable(studentId: string, topicId: string, env: Env): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT t.id FROM topics t
     JOIN student_subjects ss ON ss.subject_id = t.subject_id AND ss.student_id = ?
     WHERE t.id = ? AND t.active = 1 AND ss.active = 1
       AND (t.applicability = 'common'
         OR (t.subject_id = 'subject-geography' AND (
           t.id = json_extract(ss.options_json, '$.livingWorldOption')
           OR t.id = json_extract(ss.options_json, '$.resourceOption')
           OR instr(COALESCE(json_extract(ss.options_json, '$.ukLandscapeOptions'), ''), t.id) > 0
         ))
         OR (t.subject_id = 'subject-design-technology'
           AND COALESCE(json_extract(ss.options_json, '$.specialistMaterial'), 'TBC') <> 'TBC'))
       AND (t.tier = 'both' OR t.tier = ss.tier)
       AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)`,
  ).bind(studentId, topicId).first<{ id: string }>()
  return Boolean(row)
}

export async function recalculateTopicMastery(studentId: string, topicId: string, reason: string, env: Env, operationKey: string | null = null): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT tp.confidence, tp.total_sessions, tp.total_minutes, tp.last_revised_at, tp.rag_status,
            (SELECT a.percentage FROM assessments a
             WHERE a.student_id = ? AND a.topic_id = ?
             ORDER BY a.completed_at DESC LIMIT 1) AS assessment_percentage
     FROM topics t
     LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.student_id = ?
     WHERE t.id = ?`,
  ).bind(studentId, topicId, studentId, topicId).first<EvidenceRow>()
  if (!row) return false

  const evidence: MasteryEvidence = {
    assessmentPercentage: row.assessment_percentage,
    confidence: row.confidence,
    completedSessions: row.total_sessions ?? 0,
    totalMinutes: row.total_minutes ?? 0,
    lastRevisedAt: row.last_revised_at,
  }
  const mastery = calculateMastery(evidence)
  const reviewDays = mastery.ragStatus === 'red' ? 2 : mastery.ragStatus === 'amber' ? 5 : mastery.ragStatus === 'green' ? 14 : null
  const nextReview = reviewDays === null ? null : new Date(Date.now() + reviewDays * 86_400_000).toISOString()
  const historyId = crypto.randomUUID()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO topic_progress
        (student_id, topic_id, mastery_score, rag_status, next_review_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id, topic_id) DO UPDATE SET
         mastery_score = excluded.mastery_score,
         rag_status = excluded.rag_status,
         next_review_at = excluded.next_review_at,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(studentId, topicId, mastery.score, mastery.ragStatus, nextReview),
    env.DB.prepare(
      `INSERT OR IGNORE INTO mastery_history (id, student_id, topic_id, score, recorded_at, reason, operation_key)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    ).bind(historyId, studentId, topicId, mastery.score ?? 0, reason, operationKey),
  ])
  await awardRagTransitionXp(studentId, topicId, row.rag_status, mastery.ragStatus, env)
  return true
}

export async function setConfidence(
  user: SessionUser,
  topicId: string,
  confidence: Confidence,
  env: Env,
): Promise<boolean> {
  if (!(await topicAvailable(user.id, topicId, env))) return false
  await env.DB.prepare(
    `INSERT INTO topic_progress (student_id, topic_id, confidence, rag_status, created_at, updated_at)
     VALUES (?, ?, ?, 'grey', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(student_id, topic_id) DO UPDATE SET confidence = excluded.confidence, updated_at = CURRENT_TIMESTAMP`,
  ).bind(user.id, topicId, confidence).run()
  return recalculateTopicMastery(user.id, topicId, `Confidence changed to ${confidence}`, env)
}

export async function addAssessment(
  user: SessionUser,
  topicId: string,
  score: number,
  maximumScore: number,
  assessmentType: string,
  env: Env,
  evidence: { markingSource?: 'auto_marked' | 'ai_estimated' | 'self_reported' | 'teacher_marked'; markingConfidence?: 'low' | 'medium' | 'high' | null; feedback?: { summary?: string; nextStep?: string } | null; markingModel?: string | null; rubricVersion?: string | null } = {},
): Promise<boolean> {
  if (!(await topicAvailable(user.id, topicId, env))) return false
  const percentage = Math.round((score / maximumScore) * 1000) / 10
  const assessmentId = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO assessments
      (id, student_id, topic_id, score, maximum_score, percentage, assessment_type, marking_source, marking_confidence, feedback_json, marking_model, rubric_version, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).bind(assessmentId, user.id, topicId, score, maximumScore, percentage, assessmentType, evidence.markingSource ?? 'auto_marked', evidence.markingConfidence ?? null, evidence.feedback ? JSON.stringify(evidence.feedback) : null, evidence.markingModel ?? null, evidence.rubricVersion ?? null).run()
  await awardQuizXp(user.id, assessmentId, env)
  return recalculateTopicMastery(user.id, topicId, `${assessmentType} recorded at ${percentage}%`, env)
}
