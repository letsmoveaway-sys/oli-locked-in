import type { Env, SessionUser } from '../types'
import { generateRevisionPlan } from './planner'
import { loadPlannerContext, savePlan } from './planner/repository'

export async function resetPocProgress(user: SessionUser, env: Env): Promise<boolean> {
  if (user.role !== 'parent') return false
  const student = await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1').first<{ user_id: string }>()
  if (!student?.user_id) return false

  await env.DB.batch([
    env.DB.prepare('DELETE FROM assessments WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('DELETE FROM mastery_history WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('DELETE FROM xp_events WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('DELETE FROM topic_coverage_progress WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('DELETE FROM revision_sessions WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('DELETE FROM topic_progress WHERE student_id = ?').bind(student.user_id),
    env.DB.prepare('UPDATE student_profiles SET xp = 0, level = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').bind(student.user_id),
  ])

  const context = await loadPlannerContext(user, env)
  if (context) await savePlan(user, generateRevisionPlan(context, 14), env, context.today)
  return true
}
