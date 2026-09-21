import type { Env } from '../types'

const XP = { plannedSession: 10, practiceQuiz: 5, redToAmber: 20, amberToGreen: 30, weeklyGoal: 50 }

export async function awardXp(studentId: string, eventType: string, points: number, env: Env, relatedSessionId: string | null = null): Promise<boolean> {
  if (relatedSessionId) {
    const existing = await env.DB.prepare('SELECT id FROM xp_events WHERE student_id = ? AND event_type = ? AND related_session_id = ?')
      .bind(studentId, eventType, relatedSessionId).first<{ id: string }>()
    if (existing) return false
  } else {
    const existing = await env.DB.prepare('SELECT id FROM xp_events WHERE student_id = ? AND event_type = ? LIMIT 1')
      .bind(studentId, eventType).first<{ id: string }>()
    if (existing) return false
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO xp_events (id, student_id, event_type, points, created_at, related_session_id) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)')
      .bind(crypto.randomUUID(), studentId, eventType, points, relatedSessionId),
    env.DB.prepare('UPDATE student_profiles SET xp = xp + ?, level = CAST((xp + ?) / 100 AS INTEGER) + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .bind(points, points, studentId),
  ])
  return true
}

export async function awardSessionXp(studentId: string, sessionId: string, env: Env): Promise<void> {
  await awardXp(studentId, 'planned_session', XP.plannedSession, env, sessionId)
}

export async function awardQuizXp(studentId: string, assessmentId: string, env: Env): Promise<void> {
  await awardXp(studentId, `practice_quiz:${assessmentId}`, XP.practiceQuiz, env)
}

export async function awardRagTransitionXp(studentId: string, topicId: string, from: string | null, to: string, env: Env): Promise<void> {
  const key = `${topicId}:${from ?? 'none'}:${to}:${new Date().toISOString().slice(0, 10)}`
  if (from === 'red' && to === 'amber') await awardXp(studentId, `red_to_amber:${key}`, XP.redToAmber, env)
  if (from === 'amber' && to === 'green') await awardXp(studentId, `amber_to_green:${key}`, XP.amberToGreen, env)
}

function mondayFor(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7))
  return result
}

export async function checkWeeklyGoal(studentId: string, env: Env, now = new Date()): Promise<void> {
  const start = mondayFor(now)
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7)
  const profile = await env.DB.prepare('SELECT weekly_goal_minutes FROM student_profiles WHERE user_id = ?')
    .bind(studentId).first<{ weekly_goal_minutes: number }>()
  if (!profile) return
  const total = await env.DB.prepare(`SELECT COALESCE(SUM(actual_minutes), 0) AS minutes FROM revision_sessions
    WHERE student_id = ? AND status IN ('completed', 'partially_completed') AND scheduled_at >= ? AND scheduled_at < ?`)
    .bind(studentId, start.toISOString(), end.toISOString()).first<{ minutes: number }>()
  if ((total?.minutes ?? 0) < profile.weekly_goal_minutes) return
  const weekKey = start.toISOString().slice(0, 10)
  const existing = await env.DB.prepare('SELECT id FROM xp_events WHERE student_id = ? AND event_type = ? LIMIT 1')
    .bind(studentId, `weekly_goal:${weekKey}`).first<{ id: string }>()
  if (!existing) await awardXp(studentId, `weekly_goal:${weekKey}`, XP.weeklyGoal, env)
}

export { XP }

export async function updateWeeklyGoal(studentId: string, minutes: number, env: Env): Promise<boolean> {
  const result = await env.DB.prepare('UPDATE student_profiles SET weekly_goal_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .bind(minutes, studentId).run()
  return result.success && (result.meta.changes ?? 0) > 0
}
