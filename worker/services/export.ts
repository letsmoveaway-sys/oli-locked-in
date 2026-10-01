import type { Env, SessionUser } from '../types'

export async function exportStudentData(user: SessionUser, env: Env): Promise<Record<string, unknown> | null> {
  if (user.role !== 'parent') return null
  const student = await env.DB.prepare('SELECT user_id, xp, level, weekly_goal_minutes, ai_marking_enabled, created_at, updated_at FROM student_profiles ORDER BY created_at LIMIT 1')
    .first<Record<string, unknown>>()
  if (!student || typeof student.user_id !== 'string') return null
  const studentId = student.user_id
  const [courses, progress, sessions, assessments, masteryHistory, xpEvents, availability, exceptions, tutors, exams] = await Promise.all([
    env.DB.prepare(`SELECT s.name, s.exam_board, s.specification_code, ss.active, ss.tier, ss.current_grade, ss.target_grade, ss.options_json
      FROM student_subjects ss JOIN subjects s ON s.id = ss.subject_id WHERE ss.student_id = ? ORDER BY s.name`).bind(studentId).all(),
    env.DB.prepare(`SELECT t.name AS topic_name, s.name AS subject_name, tp.mastery_score, tp.confidence, tp.rag_status, tp.total_sessions, tp.total_minutes, tp.last_revised_at, tp.next_review_at, tp.notes
      FROM topic_progress tp JOIN topics t ON t.id = tp.topic_id JOIN subjects s ON s.id = t.subject_id WHERE tp.student_id = ? ORDER BY s.name, t.name`).bind(studentId).all(),
    env.DB.prepare(`SELECT id, topic_id, subject_id, scheduled_at, started_at, planned_minutes, actual_minutes, session_type, status, confidence_after, planner_reason, source, notes, updated_at
      FROM revision_sessions WHERE student_id = ? ORDER BY scheduled_at`).bind(studentId).all(),
    env.DB.prepare(`SELECT topic_id, score, maximum_score, percentage, assessment_type, marking_source, marking_confidence, feedback_json, marking_model, rubric_version, completed_at
      FROM assessments WHERE student_id = ? ORDER BY completed_at`).bind(studentId).all(),
    env.DB.prepare('SELECT topic_id, score, recorded_at, reason, operation_key FROM mastery_history WHERE student_id = ? ORDER BY recorded_at').bind(studentId).all(),
    env.DB.prepare('SELECT event_type, points, created_at, related_session_id FROM xp_events WHERE student_id = ? ORDER BY created_at').bind(studentId).all(),
    env.DB.prepare('SELECT weekday, available_minutes, session_minutes, start_time, active FROM weekly_availability WHERE student_id = ? ORDER BY weekday').bind(studentId).all(),
    env.DB.prepare('SELECT start_datetime, end_datetime, reason, available_minutes, protect_streak FROM availability_exceptions WHERE student_id = ? ORDER BY start_datetime').bind(studentId).all(),
    env.DB.prepare('SELECT subject_id, recurrence_rule, weekday, start_date, start_time, duration_minutes, notes, active FROM tutor_sessions WHERE student_id = ? ORDER BY weekday, start_time').bind(studentId).all(),
    env.DB.prepare('SELECT subject_id, name, exam_board, exam_date, duration_minutes, source, is_verified, event_kind, created_at, updated_at FROM exam_dates ORDER BY exam_date').all(),
  ])
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    profile: student,
    courses: courses.results,
    progress: progress.results,
    sessions: sessions.results,
    assessments: assessments.results,
    masteryHistory: masteryHistory.results,
    xpEvents: xpEvents.results,
    availability: availability.results,
    exceptions: exceptions.results,
    tutors: tutors.results,
    exams: exams.results,
  }
}
