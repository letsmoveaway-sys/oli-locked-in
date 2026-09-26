import type { Analytics, ApiError, Confidence, CourseSubject, PlanSession, SessionCompletionInput, SessionUser, SubjectRevisionGuide, TopicDetail, TopicProgress, TopicRevision, WeeklyAvailability, WrittenMark } from '../types'

interface SessionResponse {
  user: SessionUser
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(body?.error.message ?? 'Something went wrong. Please try again.')
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
  } = {},
): Promise<TopicProgress[]> {
  return (await request<{ topics: TopicProgress[] }>('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({ topicId, score, maximumScore, assessmentType: evidence.assessmentType ?? 'Practice assessment', markingSource: evidence.markingSource ?? 'self_reported', markingConfidence: evidence.markingConfidence ?? null, feedback: evidence.feedback ?? null }),
  })).topics
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
): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/status', {
    method: 'PUT', body: JSON.stringify({ sessionId, status, actualMinutes }),
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

export async function reviseNow(topicId: string): Promise<{ sessions: PlanSession[]; message: string }> {
  return request<{ sessions: PlanSession[]; message: string }>('/api/sessions/revise-now', {
    method: 'POST', body: JSON.stringify({ topicId }),
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
