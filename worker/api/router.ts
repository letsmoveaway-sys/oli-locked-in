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
import { addAssessment, getProgress, getTopicDetail, setConfidence, setTopicScheduleTarget } from '../services/progress'
import { generateRevisionPlan, replanAfterChange } from '../services/planner'
import {
  addAvailabilityException,
  completeSession,
  getAvailability,
  getSavedPlan,
  loadPlannerContext,
  savePlan,
  scheduleRevisionNow,
  startRevisionSession,
  updateAvailability,
  updateSessionStatus,
} from '../services/planner/repository'
import { apiError, json, readJsonObject } from './responses'
import { getAnalytics } from '../services/analytics'
import { updateWeeklyGoal } from '../services/gamification'
import { createAutoTest, getSubjectRevision, getTopicRevision } from '../services/revision'
import { markWrittenAnswer } from '../services/marking'
import { resetPocProgress } from '../services/reset'
import { exportStudentData } from '../services/export'
import { createEvidenceToken, readEvidenceToken } from '../auth/evidence'
import { saveExam, type ExamEventKind } from '../services/exams'

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

  if (env.LOGIN_RATE_LIMITER) {
    const { success } = await env.LOGIN_RATE_LIMITER.limit({ key: username })
    if (!success) return apiError('RATE_LIMITED', 'Too many sign-in attempts. Try again in a minute.', 429)
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

async function handleTopicScheduleTarget(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const targetSessions = Number(body?.targetSessions)
  if (!topicId || !Number.isInteger(targetSessions) || targetSessions < 0 || targetSessions > 100) {
    return apiError('INVALID_REQUEST', 'Choose between 0 and 100 sessions for this topic.', 400)
  }
  if (!(await setTopicScheduleTarget(user, topicId, targetSessions, env))) return apiError('NOT_FOUND', 'Topic not found.', 404)
  const context = await loadPlannerContext(user, env)
  if (context) await savePlan(user, generateRevisionPlan(context, 14), env, context.today)
  return json({ topics: await getProgress(user, env), sessions: await getSavedPlan(user, env), message: 'Topic allocation updated.' })
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

async function handleWrittenMarking(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  if (!env.GEMINI_API_KEY) return apiError('AI_MARKING_UNAVAILABLE', 'Photo and written-answer marking has not been configured yet.', 503)
  const aiPreference = await env.DB.prepare('SELECT ai_marking_enabled FROM student_profiles WHERE user_id = ?')
    .bind(user.id).first<{ ai_marking_enabled: number }>()
  if (aiPreference?.ai_marking_enabled !== 1) return apiError('AI_MARKING_DISABLED', 'A Parent account must enable optional AI marking first.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const questionId = typeof body?.questionId === 'string' ? body.questionId : ''
  const answerText = typeof body?.answerText === 'string' ? body.answerText.trim() : ''
  const imageDataUrls = Array.isArray(body?.imageDataUrls)
    ? body.imageDataUrls.filter((item): item is string => typeof item === 'string')
    : []
  if (!topicId || !questionId || answerText.length > 20_000 || imageDataUrls.length > 4 || (!answerText && imageDataUrls.length === 0)) {
    return apiError('INVALID_REQUEST', 'Add a written answer or up to four clear answer photographs.', 400)
  }
  const revision = await getTopicRevision(user, topicId, env)
  const question = revision?.writtenQuestions.find((item) => item.id === questionId)
  if (!question) return apiError('NOT_FOUND', 'That written question is not available.', 404)
  try {
    const mark = await markWrittenAnswer(question, answerText, imageDataUrls, env)
    const evidenceToken = mark.confidence === 'low' ? undefined : await createEvidenceToken({
      studentId: user.id, topicId, questionId, score: mark.estimatedMark, maximumScore: mark.maximumMark,
      confidence: mark.confidence, summary: mark.summary, nextStep: mark.nextStep,
      modelVersion: mark.modelVersion, rubricVersion: mark.rubricVersion,
    }, env.SESSION_SECRET)
    return json({ mark: { ...mark, evidenceToken } })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : ''
    if (message === 'INVALID_IMAGE') return apiError('INVALID_IMAGE', 'Use a clear JPEG, PNG, WebP, HEIC or HEIF image smaller than 8 MB.', 400)
    if (message === 'EMPTY_ANSWER') return apiError('INVALID_REQUEST', 'Add an answer before asking for feedback.', 400)
    return apiError('AI_MARKING_FAILED', 'The answer could not be marked just now. Your work has not been lost; please try again.', 502)
  }
}

async function handleProgressReset(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  if (body?.confirmation !== 'RESET PROGRESS') return apiError('INVALID_REQUEST', 'Type RESET PROGRESS to confirm.', 400)
  if (!(await resetPocProgress(user, env))) return apiError('NOT_FOUND', 'Student profile not found.', 404)
  return json({ ok: true, message: 'POC revision activity was cleared and a fresh plan was generated.' })
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
  const evidenceToken = typeof body?.evidenceToken === 'string' ? body.evidenceToken : ''
  const trustedEvidence = evidenceToken ? await readEvidenceToken(evidenceToken, env.SESSION_SECRET) : null
  const trustedAi = Boolean(trustedEvidence && trustedEvidence.studentId === user.id && trustedEvidence.topicId === topicId && trustedEvidence.score === score && trustedEvidence.maximumScore === maximumScore)
  if (body?.markingSource && body.markingSource !== 'self_reported' && !trustedAi) return apiError('UNTRUSTED_EVIDENCE', 'Only verified in-app marking or a self-reported result can update progress.', 400)
  const feedbackValue = body?.feedback && typeof body.feedback === 'object' && !Array.isArray(body.feedback) ? body.feedback as Record<string, unknown> : null
  const feedback = feedbackValue ? {
    summary: typeof feedbackValue.summary === 'string' ? feedbackValue.summary.slice(0, 1000) : undefined,
    nextStep: typeof feedbackValue.nextStep === 'string' ? feedbackValue.nextStep.slice(0, 1000) : undefined,
  } : null
  if (
    !topicId || !Number.isFinite(score) || !Number.isFinite(maximumScore) ||
    score < 0 || maximumScore <= 0 || score > maximumScore ||
    !assessmentType || assessmentType.length > 50
  ) return apiError('INVALID_REQUEST', 'Enter a valid assessment score.', 400)
  if (!(await addAssessment(user, topicId, score, maximumScore, assessmentType, env, {
    markingSource: trustedAi ? 'ai_estimated' : 'self_reported',
    markingConfidence: trustedAi ? trustedEvidence!.confidence : null,
    feedback: trustedAi ? { summary: trustedEvidence!.summary, nextStep: trustedEvidence!.nextStep } : feedback,
    markingModel: trustedAi ? trustedEvidence!.modelVersion : null,
    rubricVersion: trustedAi ? trustedEvidence!.rubricVersion : null,
  }))) {
    return apiError('NOT_FOUND', 'That topic is not currently available for assessment.', 404)
  }
  return json({ topics: await getProgress(user, env) }, 201)
}

async function handleKnowledgeCheck(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const answers = body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : null
  const questions = createAutoTest(topicId)
  if (!topicId || !answers || !questions.length || questions.some((question) => !Number.isInteger(answers[question.id]))) {
    return apiError('INVALID_REQUEST', 'Answer every in-app knowledge-check question.', 400)
  }
  const maximumScore = questions.reduce((sum, question) => sum + question.marks, 0)
  const score = questions.reduce((sum, question) => sum + (answers[question.id] === question.correctOption ? question.marks : 0), 0)
  if (!(await addAssessment(user, topicId, score, maximumScore, 'In-app knowledge check', env, { markingSource: 'auto_marked', markingConfidence: 'high' }))) {
    return apiError('NOT_FOUND', 'That knowledge check is not available.', 404)
  }
  return json({ topics: await getProgress(user, env), score, maximumScore }, 201)
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
  const values = raw.map((item): { weekday: number; availableSlots: number; startTime: string | null } | null => {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    if (!Number.isInteger(row.weekday) || Number(row.weekday) < 1 || Number(row.weekday) > 7 || !Number.isInteger(row.availableSlots) || Number(row.availableSlots) < 0 || Number(row.availableSlots) > 12) return null
    const startTime = typeof row.startTime === 'string' && /^\d{2}:\d{2}$/.test(row.startTime) ? row.startTime : null
    return { weekday: Number(row.weekday), availableSlots: Number(row.availableSlots), startTime }
  })
  if (values.some((value) => value === null)) return apiError('INVALID_REQUEST', 'Availability values are invalid.', 400)
  await updateAvailability(user, values as Array<{ weekday: number; availableSlots: number; startTime: string | null }>, env)
  return json({ availability: await getAvailability(user, env) })
}

async function handleAvailabilityException(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  const startDatetime = typeof body?.startDatetime === 'string' ? body.startDatetime : ''
  const endDatetime = typeof body?.endDatetime === 'string' ? body.endDatetime : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  const availableSlots = typeof body?.availableSlots === 'number' ? body.availableSlots : Number.NaN
  const protectStreak = body?.protectStreak === true
  if (!startDatetime || !endDatetime || endDatetime <= startDatetime || !reason || reason.length > 100 || !Number.isInteger(availableSlots) || availableSlots < 0 || availableSlots > 12) {
    return apiError('INVALID_REQUEST', 'Availability exception is invalid.', 400)
  }
  await addAvailabilityException(user, { startDatetime, endDatetime, reason, availableSlots, protectStreak }, env)
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
  const reasons = ['busy', 'unwell', 'too_difficult', 'already_covered'] as const
  const reason = typeof body?.reason === 'string' && reasons.some((value) => value === body.reason) ? body.reason : null
  const actualMinutes = body?.actualMinutes === null || body?.actualMinutes === undefined ? null : Number(body.actualMinutes)
  if (!sessionId || !statuses.some((value) => value === status) || (actualMinutes !== null && (!Number.isInteger(actualMinutes) || actualMinutes < 0 || actualMinutes > 360))) {
    return apiError('INVALID_REQUEST', 'Session status is invalid.', 400)
  }
  const before = await getSavedPlan(user, env)
  const original = before.find((session) => session.id === sessionId)
  if (!(await updateSessionStatus(user, sessionId, status as typeof statuses[number], actualMinutes, env, reason))) {
    return apiError('NOT_FOUND', 'Planned session not found.', 404)
  }
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange(`Session ${status}`, context)
  await savePlan(user, result.sessions, env, context.today)
  const replacement = status === 'rescheduled' && original?.topicId
    ? result.sessions.find((session) => session.id !== sessionId && session.topicId === original.topicId && session.status === 'planned')
    : null
  const message = status === 'skipped'
    ? 'Session skipped. No score or mastery was changed; the topic can return if later evidence shows it needs work.'
    : replacement
      ? `Moved to ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(replacement.scheduledAt))}.`
      : 'This session was released. The planner will use the next suitable space when capacity is available.'
  return json({ sessions: result.sessions, message })
}

async function handleSessionComplete(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''
  const coveredItemIds = Array.isArray(body?.coveredItemIds)
    ? [...new Set(body.coveredItemIds.filter((item): item is string => typeof item === 'string' && item.length <= 160))]
    : []
  if (!sessionId || notes.length > 1000 || coveredItemIds.length > 100) return apiError('INVALID_REQUEST', 'Enter valid completion details.', 400)

  const saved = await completeSession(user, {
    sessionId,
    coveredItemIds,
    notes,
  }, env)
  if (!saved) return apiError('NOT_FOUND', 'Planned revision session not found.', 404)
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange('Revision session completed', context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ sessions: result.sessions, message: 'Session completed. Progress and the remaining plan have been updated.' })
}

async function handleSessionStart(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  if (!sessionId || !(await startRevisionSession(user, sessionId, env))) return apiError('NOT_FOUND', 'Planned revision session not found.', 404)
  return json({ sessions: await getSavedPlan(user, env), message: 'Session started. Your place is saved.' })
}

async function handleReviseNow(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'student')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Student account.', 403)
  const body = await readJsonObject(request)
  const topicId = typeof body?.topicId === 'string' ? body.topicId : ''
  const plannedMinutes = Number(body?.plannedMinutes ?? 10)
  if (!topicId || ![5, 10, 20, 35].includes(plannedMinutes)) return apiError('INVALID_REQUEST', 'Choose a 5, 10, 20 or 35 minute revision session.', 400)
  if (!(await scheduleRevisionNow(user, topicId, plannedMinutes, env))) return apiError('NOT_FOUND', 'Topic not found.', 404)
  return json({ sessions: await getSavedPlan(user, env), message: `${plannedMinutes}-minute revision added and ready to start.` }, 201)
}

async function handleParentExport(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed()
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const data = await exportStudentData(user, env)
  if (!data) return apiError('NOT_FOUND', 'Student profile not found.', 404)
  return json({ data })
}

async function handleParentExam(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  const id = typeof body?.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(body.id) ? body.id : undefined
  const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : ''
  const component = typeof body?.component === 'string' ? body.component.trim() : ''
  const examDatetime = typeof body?.examDatetime === 'string' ? body.examDatetime : ''
  const durationMinutes = Number(body?.durationMinutes)
  const eventKinds: ExamEventKind[] = ['final', 'mock', 'school_assessment']
  const eventKind = typeof body?.eventKind === 'string' && eventKinds.includes(body.eventKind as ExamEventKind)
    ? body.eventKind as ExamEventKind : null
  const confirmed = body?.confirmed === true
  const source = typeof body?.source === 'string' ? body.source.trim() : ''
  if (
    !/^[a-z0-9-]{1,100}$/.test(subjectId) || !component || component.length > 150 ||
    !examDatetime || Number.isNaN(Date.parse(examDatetime)) || !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 || durationMinutes > 360 || !eventKind || !source || source.length > 500
  ) return apiError('INVALID_REQUEST', 'Enter a valid subject, paper, date, duration and source.', 400)
  if (!(await saveExam(user, { id, subjectId, component, examDatetime, durationMinutes, eventKind, confirmed, source }, env))) {
    return apiError('NOT_FOUND', 'That active course could not be found.', 404)
  }
  const context = await loadPlannerContext(user, env)
  if (!context) return apiError('NOT_FOUND', 'Student planning profile not found.', 404)
  const result = replanAfterChange(`${eventKind === 'final' ? 'Final exam' : 'Assessment'} calendar updated`, context)
  await savePlan(user, result.sessions, env, context.today)
  return json({ analytics: await getAnalytics(user, env), sessions: result.sessions, message: 'Calendar saved and the revision plan updated.' }, 201)
}

async function handleAiMarkingPreference(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'PUT') return methodNotAllowed()
  if (!sameOrigin(request)) return apiError('INVALID_ORIGIN', 'The request origin was rejected.', 403)
  const user = await requireSession(request, env.SESSION_SECRET, 'parent')
  if (!user) return apiError('FORBIDDEN', 'This operation requires a Parent account.', 403)
  const body = await readJsonObject(request)
  if (typeof body?.enabled !== 'boolean') return apiError('INVALID_REQUEST', 'Choose whether optional AI marking is enabled.', 400)
  const profile = await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1').first<{ user_id: string }>()
  if (!profile) return apiError('NOT_FOUND', 'Student profile not found.', 404)
  await env.DB.prepare('UPDATE student_profiles SET ai_marking_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .bind(body.enabled ? 1 : 0, profile.user_id).run()
  return json({ analytics: await getAnalytics(user, env), message: body.enabled ? 'Optional AI marking enabled.' : 'Optional AI marking disabled.' })
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
  if (path === '/api/scheduling/topic-target') return handleTopicScheduleTarget(request, env)
  if (path === '/api/analytics') return handleAnalytics(request, env)
  if (path === '/api/gamification/weekly-goal') return handleWeeklyGoal(request, env)
  if (path === '/api/topics/detail') return handleTopicDetail(request, env)
  if (path === '/api/revision/subject') return handleSubjectRevision(request, env)
  if (path === '/api/revision/topic') return handleTopicRevision(request, env)
  if (path === '/api/marking/written') return handleWrittenMarking(request, env)
  if (path === '/api/parent/reset-progress') return handleProgressReset(request, env)
  if (path === '/api/parent/export') return handleParentExport(request, env)
  if (path === '/api/parent/exams') return handleParentExam(request, env)
  if (path === '/api/parent/ai-marking') return handleAiMarkingPreference(request, env)
  if (path === '/api/progress/confidence') return handleConfidence(request, env)
  if (path === '/api/assessments') return handleAssessment(request, env)
  if (path === '/api/assessments/knowledge-check') return handleKnowledgeCheck(request, env)
  if (path === '/api/planner') return handlePlanner(request, env)
  if (path === '/api/planner/replan') return handleReplan(request, env)
  if (path === '/api/availability') return handleAvailability(request, env)
  if (path === '/api/availability/exceptions') return handleAvailabilityException(request, env)
  if (path === '/api/sessions/status') return handleSessionStatus(request, env)
  if (path === '/api/sessions/complete') return handleSessionComplete(request, env)
  if (path === '/api/sessions/start') return handleSessionStart(request, env)
  if (path === '/api/sessions/revise-now') return handleReviseNow(request, env)
  if (path === '/api/parent') return handleProtected(request, env, true)
  return apiError('NOT_FOUND', 'API route not found.', 404)
}
