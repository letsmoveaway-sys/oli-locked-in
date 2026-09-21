import { verifyPassword } from '../auth/password'
import {
  createSessionToken,
  expiredSessionCookie,
  requireSession,
  sessionCookie,
} from '../auth/session'
import type { Env, SessionUser, UserRecord } from '../types'
import {
  getCourseOverview,
  updateCourseConfiguration,
  validateCourseConfiguration,
} from '../services/curriculum'
import { addAssessment, getProgress, getTopicDetail, setConfidence } from '../services/progress'
import { generateRevisionPlan, replanAfterChange } from '../services/planner'
import {
  addAvailabilityException,
  completeSession,
  getAvailability,
  getSavedPlan,
  loadPlannerContext,
  savePlan,
  scheduleRevisionNow,
  updateAvailability,
  updateSessionStatus,
} from '../services/planner/repository'
import { apiError, json, readJsonObject } from './responses'
import { getAnalytics } from '../services/analytics'
import { updateWeeklyGoal } from '../services/gamification'
import { getSubjectRevision, getTopicRevision } from '../services/revision'

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  return !origin || origin === new URL(request.url).origin
}

function methodNotAllowed(): Response {
  return apiError('METHOD_NOT_ALLOWED', 'That method is not supported.', 405)
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)

  const body = await readJsonObject(request)
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 254 || password.length > 512) {
    return apiError('INVALID_REQUEST', 'Enter a valid username and password.', 400)
  }

  const user = await env.DB.prepare(
    `SELECT id, email_or_username, display_name, role, active
     FROM users WHERE lower(email_or_username) = ? LIMIT 1`,
  ).bind(username).first<UserRecord>()

  if (!user || user.active !== 1 || (user.role !== 'student' && user.role !== 'parent')) {
    return apiError('INVALID_CREDENTIALS', 'The username or password is incorrect.', 401)
  }

  const storedHash = user.role === 'student' ? env.STUDENT_PASSWORD_HASH : env.PARENT_PASSWORD_HASH
  if (!storedHash || !(await verifyPassword(password, storedHash))) {
    return apiError('INVALID_CREDENTIALS', 'The username or password is incorrect.', 401)
  }

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.email_or_username,
    displayName: user.display_name,
    role: user.role,
  }
  const token = await createSessionToken(sessionUser, env.SESSION_SECRET)
  return json(
    { user: sessionUser },
    200,
    { 'Set-Cookie': sessionCookie(token, env.ENVIRONMENT === 'production') },
  )
}

async function handleSession(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  return user
    ? json({ user })
    : apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  return json(
    { ok: true },
    200,
    { 'Set-Cookie': expiredSessionCookie(env.ENVIRONMENT === 'production') },
  )
}

async function handleProtected(request: Request, env: Env, parentOnly = false): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET, parentOnly ? 'parent' : undefined)
  if (!user) {
    return apiError(
      parentOnly ? 'FORBIDDEN' : 'UNAUTHENTICATED',
      parentOnly ? 'This operation requires a Parent account.' : 'Sign in to continue.',
      parentOnly ? 403 : 401,
    )
  }
  return json({ user, phase: 1, status: 'ready' })
}

async function handleSubjects(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  return json({ subjects: await getCourseOverview(user, env) })
}

async function handleCourseConfiguration(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const input = validateCourseConfiguration(await readJsonObject(request))
  if (!input) return apiError('INVALID_REQUEST', 'The course configuration is invalid.', 400)
  if (!(await updateCourseConfiguration(user, input, env))) {
    return apiError('NOT_FOUND', 'The requested student course was not found.', 404)
  }
  return json({ subjects: await getCourseOverview(user, env) })
}

async function handleProgress(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  return json({ topics: await getProgress(user, env) })
}

async function handleAnalytics(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const analytics = await getAnalytics(user, env)
  return analytics ? json({ analytics }) : apiError('NOT_FOUND', 'Student analytics profile not found.', 404)
}

async function handleWeeklyGoal(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const body = await readJsonObject(request)
  const minutes = Number(body?.minutes)
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 1200) return apiError('INVALID_REQUEST', 'Weekly goal must be between 30 and 1200 minutes.', 400)
  const studentId = user.role === 'student' ? user.id : (await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1').first<{ user_id: string }>())?.user_id
  if (!studentId || !(await updateWeeklyGoal(studentId, minutes, env))) return apiError('NOT_FOUND', 'Student profile not found.', 404)
  return json({ analytics: await getAnalytics(user, env), message: 'Weekly goal updated.' })
}

async function handleTopicDetail(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const topicId = new URL(request.url).searchParams.get('topicId') ?? ''
  if (!topicId) return apiError('INVALID_REQUEST', 'Choose a topic.', 400)
  const topic = await getTopicDetail(user, topicId, env)
  return topic ? json({ topic }) : apiError('NOT_FOUND', 'Topic not found.', 404)
}

async function handleSubjectRevision(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const subjectId = new URL(request.url).searchParams.get('subjectId') ?? ''
  if (!subjectId) return apiError('INVALID_REQUEST', 'Choose a subject.', 400)
  const guide = await getSubjectRevision(user, subjectId, env)
  return guide ? json({ guide }) : apiError('NOT_FOUND', 'Revision guide not found.', 404)
}

async function handleTopicRevision(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const topicId = new URL(request.url).searchParams.get('topicId') ?? ''
  if (!topicId) return apiError('INVALID_REQUEST', 'Choose a topic.', 400)
  const revision = await getTopicRevision(user, topicId, env)
  return revision ? json({ revision }) : apiError('NOT_FOUND', 'Revision content not found.', 404)
}

async function handleConfidence(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const confidenceValues = ['unknown', 'struggling', 'ok', 'confident'] as const
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const confidence = typeof body?.confidence === 'string' ? body.confidence : ''
  if (!topicId || !confidenceValues.some((value) => value === confidence)) {
    return apiError('INVALID_REQUEST', 'Choose a valid topic and confidence.', 400)
  }
  if (!(await setConfidence(user, topicId, confidence as typeof confidenceValues[number], env))) {
    return apiError('NOT_FOUND', 'That topic is not currently available for assessment.', 404)
  }
  return json({ topics: await getProgress(user, env) })
}

async function handleAssessment(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const score = typeof body?.score === 'number' ? body.score : Number.NaN
  const maximumScore = typeof body?.maximumScore === 'number' ? body.maximumScore : Number.NaN
  const assessmentType = typeof body?.assessmentType === 'string' ? body.assessmentType.trim() : ''
  if (
    !topicId || !Number.isFinite(score) || !Number.isFinite(maximumScore) ||
    score < 0 || maximumScore <= 0 || score > maximumScore ||
    !assessmentType || assessmentType.length > 50
  ) return apiError('INVALID_REQUEST', 'Enter a valid assessment score.', 400)
  if (!(await addAssessment(user, topicId, score, maximumScore, assessmentType, env))) {
    return apiError('NOT_FOUND', 'That topic is not currently available for assessment.', 404)
  }
  return json({ topics: await getProgress(user, env) }, 201)
}

async function handlePlanner(request: Request, env: Env): Promise<Response> {
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  if (request.method === 'GET') return json({ sessions: await getSavedPlan(user, env) })
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const sessions = generateRevisionPlan(context, 14)
  await savePlan(user, sessions, env, context.today)
  return json({ sessions, message: 'Your 14-day plan is ready.' }, 201)
}

async function handleReplan(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const body = await readJsonObject(request)
  const change = typeof body?.change === 'string' ? body.change.slice(0, 100) : 'Manual replan'
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange(change, context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ sessions: result.sessions, message: result.message })
}

async function handleAvailability(request: Request, env: Env): Promise<Response> {
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  if (request.method === 'GET') return json({ availability: await getAvailability(user, env) })
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  if (user.role !== 'parent') return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  const raw = body?.availability
  if (!Array.isArray(raw) || raw.length !== 7) return apiError('INVALID_REQUEST', 'Provide all seven availability days.', 400)
  const values = raw.map((item): { weekday: number; availableMinutes: number; startTime: string | null } | null => {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    if (!Number.isInteger(row.weekday) || Number(row.weekday) < 1 || Number(row.weekday) > 7 || !Number.isInteger(row.availableMinutes) || Number(row.availableMinutes) < 0 || Number(row.availableMinutes) > 360) return null
    const startTime = typeof row.startTime === 'string' && /^\d{2}:\d{2}$/.test(row.startTime) ? row.startTime : null
    return { weekday: Number(row.weekday), availableMinutes: Number(row.availableMinutes), startTime }
  })
  if (values.some((value) => value === null)) return apiError('INVALID_REQUEST', 'Availability values are invalid.', 400)
  await updateAvailability(user, values as Array<{ weekday: number; availableMinutes: number; startTime: string | null }>, env)
  return json({ availability: await getAvailability(user, env) })
}

async function handleAvailabilityException(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET)
  if (!user) return apiError('UNAUTHENTICATED', 'Sign in to continue.', 401)
  const body = await readJsonObject(request)
  const startDatetime = typeof body?.startDatetime === 'string' ? body.startDatetime : ''
  const endDatetime = typeof body?.endDatetime === 'string' ? body.endDatetime : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  const availableMinutes = typeof body?.availableMinutes === 'number' ? body.availableMinutes : Number.NaN
  const protectStreak = body?.protectStreak === true
  if (!startDatetime || !endDatetime || endDatetime <= startDatetime || !reason || reason.length > 100 || !Number.isInteger(availableMinutes) || availableMinutes < 0 || availableMinutes > 360) {
    return apiError('INVALID_REQUEST', 'Availability exception is invalid.', 400)
  }
  await addAvailabilityException(user, { startDatetime, endDatetime, reason, availableMinutes, protectStreak }, env)
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange('Availability changed', context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ sessions: result.sessions, message: result.message }, 201)
}

async function handleSessionStatus(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const statuses = ['completed', 'partially_completed', 'skipped', 'rescheduled'] as const
  const status = typeof body?.status === 'string' ? body.status : ''
  const actualMinutes = body?.actualMinutes === null || body?.actualMinutes === undefined ? null : Number(body.actualMinutes)
  if (!sessionId || !statuses.some((value) => value === status) || (actualMinutes !== null && (!Number.isInteger(actualMinutes) || actualMinutes < 0 || actualMinutes > 360))) {
    return apiError('INVALID_REQUEST', 'Session status is invalid.', 400)
  }
  if (!(await updateSessionStatus(user, sessionId, status as typeof statuses[number], actualMinutes, env))) {
    return apiError('NOT_FOUND', 'Planned session not found.', 404)
  }
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange(`Session ${status}`, context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ sessions: result.sessions, message: result.message })
}

async function handleSessionComplete(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const actualMinutes = Number(body?.actualMinutes)
  const confidenceValues = ['unknown', 'struggling', 'ok', 'confident'] as const
  const confidenceAfter = typeof body?.confidenceAfter === 'string' ? body.confidenceAfter : ''
  const assessmentPercentage = body?.assessmentPercentage === null || body?.assessmentPercentage === undefined
    ? null : Number(body.assessmentPercentage)
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''
  if (
    !sessionId || !Number.isInteger(actualMinutes) || actualMinutes < 1 || actualMinutes > 360 ||
    !confidenceValues.some((value) => value === confidenceAfter) ||
    (assessmentPercentage !== null && (!Number.isFinite(assessmentPercentage) || assessmentPercentage < 0 || assessmentPercentage > 100)) ||
    notes.length > 1000
  ) return apiError('INVALID_REQUEST', 'Enter valid completion details.', 400)

  const saved = await completeSession(user, {
    sessionId,
    actualMinutes,
    confidenceAfter: confidenceAfter as typeof confidenceValues[number],
    assessmentPercentage,
    notes,
  }, env)
  if (!saved) return apiError('NOT_FOUND', 'Planned revision session not found.', 404)
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange('Revision session completed', context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ sessions: result.sessions, message: 'Session completed. Progress and the remaining plan have been updated.' })
}

async function handleReviseNow(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  if (!topicId || !(await scheduleRevisionNow(user, topicId, env))) return apiError('NOT_FOUND', 'Topic not found.', 404)
  return json({ sessions: await getSavedPlan(user, env), message: 'Revision session added to Today.' }, 201)
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, '') || '/'

  if (path === '/api/health') return json({ ok: true, service: 'gcse-revision-api' })
  if (path === '/api/auth/login') return handleLogin(request, env)
  if (path === '/api/auth/session') return handleSession(request, env)
  if (path === '/api/auth/logout') return handleLogout(request, env)
  if (path === '/api/dashboard') return handleProtected(request, env)
  if (path === '/api/subjects') return handleSubjects(request, env)
  if (path === '/api/parent/course-configuration') return handleCourseConfiguration(request, env)
  if (path === '/api/progress') return handleProgress(request, env)
  if (path === '/api/analytics') return handleAnalytics(request, env)
  if (path === '/api/gamification/weekly-goal') return handleWeeklyGoal(request, env)
  if (path === '/api/topics/detail') return handleTopicDetail(request, env)
  if (path === '/api/revision/subject') return handleSubjectRevision(request, env)
  if (path === '/api/revision/topic') return handleTopicRevision(request, env)
  if (path === '/api/progress/confidence') return handleConfidence(request, env)
  if (path === '/api/assessments') return handleAssessment(request, env)
  if (path === '/api/planner') return handlePlanner(request, env)
  if (path === '/api/planner/replan') return handleReplan(request, env)
  if (path === '/api/availability') return handleAvailability(request, env)
  if (path === '/api/availability/exceptions') return handleAvailabilityException(request, env)
  if (path === '/api/sessions/status') return handleSessionStatus(request, env)
  if (path === '/api/sessions/complete') return handleSessionComplete(request, env)
  if (path === '/api/sessions/revise-now') return handleReviseNow(request, env)
  if (path === '/api/parent') return handleProtected(request, env, true)
  return apiError('NOT_FOUND', 'API route not found.', 404)
}
