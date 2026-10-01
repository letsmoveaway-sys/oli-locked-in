import type { Analytics, ApiError, Confidence, CourseSubject, PlanSession, SessionCompletionInput, SessionUser, SubjectRevisionGuide, TopicDetail, TopicProgress, TopicRevision, WeeklyAvailability, WrittenMark } from '../types'

interface SessionResponse {
  user: SessionUser
}

export const AUTH_EXPIRED_EVENT = 'gcse-auth-expired'

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly retryable = status === 0 || status === 429 || status >= 500) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiRequestError('You appear to be offline. Check your connection and try again.', 0, 'NETWORK_ERROR', true)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null
    if (response.status === 401 && path !== '/api/auth/session' && path !== '/api/auth/login') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    throw new ApiRequestError(body?.error.message ?? 'Something went wrong. Please try again.', response.status, body?.error.code)
  }

  return (await response.json()) as T
}

export function getSession(): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/session')
}

export function signIn(username: string, password: string): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function signOut(): Promise<{ ok: true }> {
  return request<{ ok: true }>('/api/auth/logout', { method: 'POST', body: '{}' })
}

export async function getSubjects(): Promise<CourseSubject[]> {
  return (await request<{ subjects: CourseSubject[] }>('/api/subjects')).subjects
}

export async function updateCourse(input: {
  subjectId: string
  active: boolean
  tier: string
  currentGrade: string | null
  targetGrade: string | null
  options: Record<string, string>
}): Promise<CourseSubject[]> {
  return (await request<{ subjects: CourseSubject[] }>('/api/parent/course-configuration', {
    method: 'PUT',
    body: JSON.stringify(input),
  })).subjects
}

export async function getProgress(): Promise<TopicProgress[]> {
  return (await request<{ topics: TopicProgress[] }>('/api/progress')).topics
}

export async function updateConfidence(topicId: string, confidence: Confidence): Promise<TopicProgress[]> {
  return (await request<{ topics: TopicProgress[] }>('/api/progress/confidence', {
    method: 'PUT',
    body: JSON.stringify({ topicId, confidence }),
  })).topics
}

export async function recordAssessment(
  topicId: string,
  score: number,
  maximumScore: number,
  evidence: {
    assessmentType?: string
    markingSource?: 'auto_marked' | 'ai_estimated' | 'self_reported' | 'teacher_marked'
    markingConfidence?: 'low' | 'medium' | 'high' | null
    feedback?: { summary?: string; nextStep?: string }
    evidenceToken?: string
  } = {},
): Promise<TopicProgress[]> {
  return (await request<{ topics: TopicProgress[] }>('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({ topicId, score, maximumScore, assessmentType: evidence.assessmentType ?? 'Practice assessment', markingSource: evidence.markingSource ?? 'self_reported', markingConfidence: evidence.markingConfidence ?? null, feedback: evidence.feedback ?? null, evidenceToken: evidence.evidenceToken ?? null }),
  })).topics
}

export async function recordKnowledgeCheck(topicId: string, answers: Record<string, number>): Promise<{ topics: TopicProgress[]; score: number; maximumScore: number }> {
  return request<{ topics: TopicProgress[]; score: number; maximumScore: number }>('/api/assessments/knowledge-check', {
    method: 'POST', body: JSON.stringify({ topicId, answers }),
  })
}

export async function getPlan(): Promise<PlanSession[]> {
  return (await request<{ sessions: PlanSession[] }>('/api/planner')).sessions
}

export async function generatePlan(): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/planner', { method: 'POST', body: '{}' })
}

export async function replan(change: string): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/planner/replan', { method: 'POST', body: JSON.stringify({ change }) })
}

export async function setSessionStatus(
  sessionId: string,
  status: 'completed' | 'partially_completed' | 'skipped' | 'rescheduled',
  actualMinutes: number | null,
  reason?: 'busy' | 'unwell' | 'too_difficult' | 'already_covered',
): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/status', {
    method: 'PUT', body: JSON.stringify({ sessionId, status, actualMinutes, reason }),
  })
}

export async function completeSession(input: SessionCompletionInput): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/complete', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function getTopicDetail(topicId: string): Promise<TopicDetail> {
  return (await request<{ topic: TopicDetail }>(`/api/topics/detail?topicId=${encodeURIComponent(topicId)}`)).topic
}

export async function getSubjectRevision(subjectId: string): Promise<SubjectRevisionGuide> {
  return (await request<{ guide: SubjectRevisionGuide }>(`/api/revision/subject?subjectId=${encodeURIComponent(subjectId)}`)).guide
}

export async function getTopicRevision(topicId: string): Promise<TopicRevision> {
  return (await request<{ revision: TopicRevision }>(`/api/revision/topic?topicId=${encodeURIComponent(topicId)}`)).revision
}

export async function markWrittenResponse(input: {
  topicId: string
  questionId: string
  answerText: string
  imageDataUrls: string[]
}): Promise<WrittenMark> {
  return (await request<{ mark: WrittenMark }>('/api/marking/written', {
    method: 'POST', body: JSON.stringify(input),
  })).mark
}

export function resetPocProgress(confirmation: string): Promise<{ ok: true; message: string }> {
  return request<{ ok: true; message: string }>('/api/parent/reset-progress', {
    method: 'POST', body: JSON.stringify({ confirmation }),
  })
}

export async function exportStudentData(): Promise<Record<string, unknown>> {
  return (await request<{ data: Record<string, unknown> }>('/api/parent/export')).data
}

export function saveExam(input: {
  id?: string
  subjectId: string
  component: string
  examDatetime: string
  durationMinutes: number
  eventKind: 'final' | 'mock' | 'school_assessment'
  confirmed: boolean
  source: string
}): Promise<{ analytics: Analytics; sessions: PlanSession[]; message: string }> {
  return request<{ analytics: Analytics; sessions: PlanSession[]; message: string }>('/api/parent/exams', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export function setAiMarkingPreference(enabled: boolean): Promise<{ analytics: Analytics; message: string }> {
  return request<{ analytics: Analytics; message: string }>('/api/parent/ai-marking', {
    method: 'PUT', body: JSON.stringify({ enabled }),
  })
}

export async function startSession(sessionId: string): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/start', {
    method: 'POST', body: JSON.stringify({ sessionId }),
  })
}

export async function reviseNow(topicId: string, plannedMinutes = 10): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/revise-now', {
    method: 'POST', body: JSON.stringify({ topicId, plannedMinutes }),
  })
}

export async function getAnalytics(): Promise<Analytics> {
  return (await request<{ analytics: Analytics }>('/api/analytics')).analytics
}

export async function setWeeklyGoal(minutes: number): Promise<{ analytics: Analytics; message: string }> {
  return request<{ analytics: Analytics; message: string }>('/api/gamification/weekly-goal', {
    method: 'PUT', body: JSON.stringify({ minutes }),
  })
}

export async function addAvailabilityException(input: {
  startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectStreak: boolean
}): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/availability/exceptions', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function getAvailability(): Promise<WeeklyAvailability[]> {
  return (await request<{ availability: WeeklyAvailability[] }>('/api/availability')).availability
}

export async function saveAvailability(availability: WeeklyAvailability[]): Promise<WeeklyAvailability[]> {
  return (await request<{ availability: WeeklyAvailability[] }>('/api/availability', {
    method: 'PUT', body: JSON.stringify({ availability }),
  })).availability
}
