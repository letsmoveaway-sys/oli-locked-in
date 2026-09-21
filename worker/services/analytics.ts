import type { Env, SessionUser } from '../types'

type Rag = 'grey' | 'red' | 'amber' | 'green'
interface TopicRow { id: string; subject_id: string; subject_name: string; name: string; estimated_effort: number; mastery_score: number | null; rag_status: Rag | null; confidence: string | null; total_sessions: number | null; total_minutes: number | null }
interface HistoryRow { topic_id: string; score: number; recorded_at: string }
interface SessionRow { id: string; subject_id: string; subject_name: string; topic_name: string | null; scheduled_at: string; planned_minutes: number; actual_minutes: number | null; status: string; source: string }

function dateOnly(value: string): string { return value.slice(0, 10) }
function addDays(date: string, days: number): string { const result = new Date(`${date}T00:00:00.000Z`); result.setUTCDate(result.getUTCDate() + days); return dateOnly(result.toISOString()) }
function monday(date: string): string { const result = new Date(`${date}T00:00:00.000Z`); result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7)); return dateOnly(result.toISOString()) }
function workload(effort: number, mastery: number | null): number { const gap = 1 - (mastery ?? 0) / 100; return Math.max((mastery ?? 0) >= 75 ? effort * 0.1 : 0, effort * gap) }
function rounded(value: number): number { return Math.round(value * 10) / 10 }

async function studentIdFor(user: SessionUser, env: Env): Promise<string | null> {
  if (user.role === 'student') return user.id
  const row = await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1').first<{ user_id: string }>()
  return row?.user_id ?? null
}

export async function getAnalytics(user: SessionUser, env: Env, today = new Date().toISOString().slice(0, 10)) {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return null
  const weekStart = monday(today); const weekEnd = addDays(weekStart, 7); const historyStart = addDays(today, -13); const futureEnd = addDays(today, 7)
  const [topicsResult, historyResult, sessionsResult, profile, xpResult, exceptionsResult, examsResult, availabilityResult] = await Promise.all([
    env.DB.prepare(`SELECT t.id, t.subject_id, s.name AS subject_name, t.name, t.estimated_effort,
      tp.mastery_score, tp.rag_status, tp.confidence, tp.total_sessions, tp.total_minutes
      FROM topics t JOIN subjects s ON s.id = t.subject_id
      JOIN student_subjects ss ON ss.subject_id = t.subject_id AND ss.student_id = ?
      LEFT JOIN topic_progress tp ON tp.topic_id = t.id AND tp.student_id = ?
      WHERE t.active = 1 AND ss.active = 1 AND t.applicability = 'common'
        AND (t.tier = 'both' OR t.tier = ss.tier)
        AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)
      ORDER BY s.name, t.name`).bind(studentId, studentId).all<TopicRow>(),
    env.DB.prepare('SELECT topic_id, score, recorded_at FROM mastery_history WHERE student_id = ? AND recorded_at >= ? ORDER BY recorded_at')
      .bind(studentId, `${historyStart}T00:00:00.000Z`).all<HistoryRow>(),
    env.DB.prepare(`SELECT rs.id, rs.subject_id, s.name AS subject_name, t.name AS topic_name, rs.scheduled_at,
      rs.planned_minutes, rs.actual_minutes, rs.status, rs.source FROM revision_sessions rs
      JOIN subjects s ON s.id = rs.subject_id LEFT JOIN topics t ON t.id = rs.topic_id
      WHERE rs.student_id = ? AND rs.scheduled_at >= ? AND rs.scheduled_at < ? ORDER BY rs.scheduled_at`)
      .bind(studentId, `${addDays(today, -365)}T00:00:00.000Z`, `${futureEnd}T23:59:59.999Z`).all<SessionRow>(),
    env.DB.prepare('SELECT xp, level, weekly_goal_minutes FROM student_profiles WHERE user_id = ?').bind(studentId).first<{ xp: number; level: number; weekly_goal_minutes: number }>(),
    env.DB.prepare('SELECT event_type, points, created_at FROM xp_events WHERE student_id = ? ORDER BY created_at DESC LIMIT 12').bind(studentId).all<{ event_type: string; points: number; created_at: string }>(),
    env.DB.prepare('SELECT start_datetime, end_datetime, reason, available_minutes, protect_streak FROM availability_exceptions WHERE student_id = ? AND end_datetime >= ? ORDER BY start_datetime')
      .bind(studentId, `${addDays(today, -365)}T00:00:00.000Z`).all<{ start_datetime: string; end_datetime: string; reason: string; available_minutes: number | null; protect_streak: number }>(),
    env.DB.prepare(`SELECT e.component, e.exam_datetime, e.confirmed, s.name AS subject_name FROM exams e JOIN subjects s ON s.id = e.subject_id
      JOIN student_subjects ss ON ss.subject_id = e.subject_id AND ss.student_id = ? AND ss.active = 1
      WHERE e.exam_datetime >= ? ORDER BY e.exam_datetime LIMIT 12`).bind(studentId, `${today}T00:00:00.000Z`).all<{ component: string; exam_datetime: string; confirmed: number; subject_name: string }>(),
    env.DB.prepare('SELECT weekday, available_minutes FROM weekly_availability WHERE student_id = ? AND active = 1').bind(studentId).all<{ weekday: number; available_minutes: number }>(),
  ])
  const topics = topicsResult.results; const sessions = sessionsResult.results
  const weekSessions = sessions.filter((item) => item.scheduled_at >= `${weekStart}T00:00:00.000Z` && item.scheduled_at < `${weekEnd}T00:00:00.000Z`)
  const plannedWeek = weekSessions.filter((item) => item.status !== 'rescheduled' && item.status !== 'skipped' && item.status !== 'cancelled_unavailable')
  const completedWeek = weekSessions.filter((item) => item.status === 'completed' || item.status === 'partially_completed' || item.status === 'tutor')
  const eligiblePast = sessions.filter((item) => item.scheduled_at.slice(0, 10) <= today && !['rescheduled', 'skipped', 'cancelled_unavailable'].includes(item.status))
  const completedPast = eligiblePast.filter((item) => ['completed', 'partially_completed', 'tutor'].includes(item.status))
  const assessed = topics.filter((item) => item.mastery_score !== null)
  const currentWorkload = topics.reduce((sum, item) => sum + workload(item.estimated_effort, item.mastery_score), 0)

  const subjectMap = new Map<string, { subjectId: string; subjectName: string; topics: TopicRow[] }>()
  for (const topic of topics) {
    const existing = subjectMap.get(topic.subject_id) ?? { subjectId: topic.subject_id, subjectName: topic.subject_name, topics: [] }
    existing.topics.push(topic); subjectMap.set(topic.subject_id, existing)
  }
  const subjects = [...subjectMap.values()].map((entry) => {
    const assessedTopics = entry.topics.filter((item) => item.mastery_score !== null)
    const subjectSessions = weekSessions.filter((item) => item.subject_id === entry.subjectId)
    return {
      subjectId: entry.subjectId, subjectName: entry.subjectName,
      coverage: rounded(100 * entry.topics.filter((item) => (item.total_sessions ?? 0) > 0 || item.confidence !== null || item.mastery_score !== null).length / Math.max(1, entry.topics.length)),
      mastery: assessedTopics.length ? rounded(assessedTopics.reduce((sum, item) => sum + (item.mastery_score ?? 0), 0) / assessedTopics.length) : null,
      workloadRemaining: rounded(entry.topics.reduce((sum, item) => sum + workload(item.estimated_effort, item.mastery_score), 0)),
      consistency: rounded(100 * subjectSessions.filter((item) => ['completed', 'partially_completed', 'tutor'].includes(item.status)).length / Math.max(1, subjectSessions.length)),
      rag: entry.topics.reduce((counts, item) => ({ ...counts, [item.rag_status ?? 'grey']: counts[item.rag_status ?? 'grey'] + 1 }), { grey: 0, red: 0, amber: 0, green: 0 }),
    }
  })

  const historyByTopic = new Map<string, HistoryRow[]>()
  for (const item of historyResult.results) historyByTopic.set(item.topic_id, [...(historyByTopic.get(item.topic_id) ?? []), item])
  const startWorkload = topics.reduce((sum, topic) => sum + workload(topic.estimated_effort, (historyByTopic.get(topic.id) ?? [])[0]?.score ?? null), 0)
  const burndown = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(historyStart, index)
    const actual = topics.reduce((sum, topic) => {
      const evidence = (historyByTopic.get(topic.id) ?? []).filter((item) => dateOnly(item.recorded_at) <= date).at(-1)
      const score = date === today && !evidence ? topic.mastery_score : evidence?.score ?? null
      return sum + workload(topic.estimated_effort, score)
    }, 0)
    return { date, idealRemaining: rounded(startWorkload * (1 - index / 27)), actualRemaining: rounded(actual) }
  })
  const subjectBurndown = Object.fromEntries([...subjectMap.values()].map((entry) => {
    const subjectStart = entry.topics.reduce((sum, topic) => sum + workload(topic.estimated_effort, (historyByTopic.get(topic.id) ?? [])[0]?.score ?? null), 0)
    const points = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(historyStart, index)
      const actual = entry.topics.reduce((sum, topic) => {
        const evidence = (historyByTopic.get(topic.id) ?? []).filter((item) => dateOnly(item.recorded_at) <= date).at(-1)
        const score = date === today && !evidence ? topic.mastery_score : evidence?.score ?? null
        return sum + workload(topic.estimated_effort, score)
      }, 0)
      return { date, idealRemaining: rounded(subjectStart * (1 - index / 27)), actualRemaining: rounded(actual) }
    })
    return [entry.subjectId, points]
  }))

  const activityDates = new Set(sessions.filter((item) => ['completed', 'partially_completed', 'tutor'].includes(item.status) && dateOnly(item.scheduled_at) <= today).map((item) => dateOnly(item.scheduled_at)))
  const protectedDate = (date: string) => exceptionsResult.results.some((item) => item.protect_streak === 1 && date >= dateOnly(item.start_datetime) && date <= dateOnly(item.end_datetime))
  const availabilityByDay = new Map(availabilityResult.results.map((item) => [item.weekday, item.available_minutes]))
  let streak = 0; let cursor = activityDates.has(today) ? today : addDays(today, -1)
  for (let index = 0; index < 365; index += 1) {
    const day = ((new Date(`${cursor}T00:00:00Z`).getUTCDay() + 6) % 7) + 1
    if (activityDates.has(cursor)) streak += 1
    else if (!protectedDate(cursor) && (availabilityByDay.get(day) ?? 0) > 0) break
    cursor = addDays(cursor, -1)
  }
  const completedCount = sessions.filter((item) => item.status === 'completed').length
  const xp = profile?.xp ?? 0; const level = profile?.level ?? 1; const weeklyGoal = profile?.weekly_goal_minutes ?? 180
  const completedMinutes = completedWeek.reduce((sum, item) => sum + (item.actual_minutes ?? item.planned_minutes), 0)
  const achievements = [
    { id: 'first-step', name: 'First step', description: 'Complete a revision session.', unlocked: completedCount >= 1 },
    { id: 'getting-going', name: 'Getting going', description: 'Complete five revision sessions.', unlocked: completedCount >= 5 },
    { id: 'century', name: 'Century', description: 'Earn 100 XP.', unlocked: xp >= 100 },
    { id: 'steady-week', name: 'Steady week', description: 'Build a seven-day activity streak.', unlocked: streak >= 7 },
    { id: 'secure-topic', name: 'Topic secured', description: 'Reach green mastery on a topic.', unlocked: topics.some((item) => item.rag_status === 'green') },
  ]
  const weakTopics = topics.filter((item) => item.rag_status === 'red' || item.rag_status === 'amber').sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0)).slice(0, 5)
  const currentIdeal = burndown.at(-1)?.idealRemaining ?? currentWorkload
  const consistency = rounded(100 * completedPast.length / Math.max(1, eligiblePast.length))
  const onTrack = consistency >= 75 && currentWorkload <= currentIdeal * 1.15 ? 'on_track' : consistency >= 50 ? 'slightly_behind' : 'needs_attention'

  return {
    generatedAt: new Date().toISOString(), onTrack,
    overall: {
      coverage: rounded(100 * topics.filter((item) => (item.total_sessions ?? 0) > 0 || item.confidence !== null || item.mastery_score !== null).length / Math.max(1, topics.length)),
      mastery: assessed.length ? rounded(assessed.reduce((sum, item) => sum + (item.mastery_score ?? 0), 0) / assessed.length) : null,
      workloadRemaining: rounded(currentWorkload), consistency,
      rag: topics.reduce((counts, item) => ({ ...counts, [item.rag_status ?? 'grey']: counts[item.rag_status ?? 'grey'] + 1 }), { grey: 0, red: 0, amber: 0, green: 0 }),
    },
    week: { plannedSessions: plannedWeek.length, completedSessions: completedWeek.length, plannedMinutes: plannedWeek.reduce((sum, item) => sum + item.planned_minutes, 0), completedMinutes },
    subjects, burndown, subjectBurndown,
    weakTopics: weakTopics.map((item) => ({ topicId: item.id, topicName: item.name, subjectName: item.subject_name, mastery: item.mastery_score, ragStatus: item.rag_status ?? 'grey', workloadRemaining: rounded(workload(item.estimated_effort, item.mastery_score)) })),
    nextSevenDays: sessions.filter((item) => dateOnly(item.scheduled_at) >= today && dateOnly(item.scheduled_at) <= futureEnd).map((item) => ({ id: item.id, subjectName: item.subject_name, topicName: item.topic_name ?? `${item.subject_name} tutor`, scheduledAt: item.scheduled_at, minutes: item.planned_minutes, status: item.status })),
    exams: examsResult.results.map((item) => ({ subjectName: item.subject_name, component: item.component, examDatetime: item.exam_datetime, confirmed: item.confirmed === 1 })),
    exceptions: exceptionsResult.results.filter((item) => dateOnly(item.end_datetime) >= today).map((item) => ({ startDatetime: item.start_datetime, endDatetime: item.end_datetime, reason: item.reason, availableMinutes: item.available_minutes ?? 0, protectsStreak: item.protect_streak === 1 })),
    gamification: { xp, level, levelProgress: xp % 100, weeklyGoalMinutes: weeklyGoal, weeklyCompletedMinutes: completedMinutes, streak, achievements, recentXp: xpResult.results.map((item) => ({ eventType: item.event_type, points: item.points, createdAt: item.created_at })) },
  }
}
