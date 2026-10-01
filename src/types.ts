export type UserRole = 'student' | 'parent'

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: UserRole
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface CourseTopic {
  id: string
  name: string
  description: string
  tier: string
  estimatedEffort: number
  weightingPercent: number | null
  sourceReference: string | null
  applicability: string
  children: CourseTopic[]
}

export interface CourseSubject {
  id: string
  name: string
  examBoard: string
  specificationCode: string | null
  active: boolean
  tier: string
  currentGrade: string | null
  targetGrade: string | null
  options: Record<string, string>
  configurationComplete: boolean
  components: Array<{
    id: string
    name: string
    code: string
    calculatorAllowed: boolean
    durationMinutes: number
    maximumMarks: number
    weightingPercent: number
  }>
  topics: CourseTopic[]
}

export type Confidence = 'unknown' | 'struggling' | 'ok' | 'confident'
export type RagStatus = 'grey' | 'red' | 'amber' | 'green'

export interface TopicProgress {
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
}

export interface PlanSession {
  id: string
  topicId: string | null
  subjectId: string
  subjectName: string
  topicName: string
  scheduledAt: string
  startedAt?: string | null
  plannedMinutes: number
  sessionType: string
  status: string
  plannerReason: string
  source: 'generated' | 'manual' | 'tutor'
  locked: boolean
  reviewItems?: Array<{
    topicId: string
    subjectId: string
    subjectName: string
    topicName: string
    plannedMinutes: number
    reason: string
  }>
}

export interface WeeklyAvailability {
  weekday: number
  availableMinutes: number
  startTime: string | null
  sessionMinutes?: number
}

export interface SessionCompletionInput {
  sessionId: string
  actualMinutes: number
  confidenceAfter: Confidence
  assessmentPercentage: number | null
  notes: string
  reviewResults: Array<{ topicId: string; percentage: number | null }>
}

export interface TopicDetail extends TopicProgress {
  notes: string
  masteryHistory: Array<{
    score: number
    recordedAt: string
    reason: string
  }>
  assessments: Array<{
    percentage: number
    assessmentType: string
    markingSource: 'auto_marked' | 'ai_estimated' | 'self_reported' | 'teacher_marked'
    markingConfidence: 'low' | 'medium' | 'high' | null
    feedback: { summary?: string; nextStep?: string } | null
    markingModel?: string | null
    rubricVersion?: string | null
    completedAt: string
  }>
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

export interface RevisionResource {
  id: string
  title: string
  provider: string
  resourceType: string
  description: string
  url: string
  freeAccess: boolean
}

export interface SubjectRevisionGuide {
  subjectId: string
  examSummary: string
  assessmentObjectives: string[]
  examTips: string[]
  specificationUrl: string
  assessmentResourcesUrl: string
  provisional: boolean
  verifiedAt: string
  resources: RevisionResource[]
}

export interface TopicRevision {
  topicId: string
  summary: string
  learningObjectives: string[]
  keyPoints: string[]
  commonMistakes: string[]
  examUse: string[]
  examTips: string[]
  workedExample: { title: string; prompt: string; steps: string[]; answer: string }
  practiceQuestions: Array<{ question: string; hint: string; answer: string; marks: number; level?: 'retrieval' | 'standard' | 'challenge'; canUpdateMastery?: boolean }>
  testQuestions: Array<{ id: string; question: string; options: string[]; correctOption: number; explanation: string; marks: number }>
  writtenQuestions: WrittenQuestion[]
  assessmentAvailable: boolean
  automaticMarkingAvailable?: boolean
  aiMarkingAllowed: boolean
  resources: RevisionResource[]
  bespoke: boolean
  contentProvenance: {
    version: string
    author: string
    reviewer: string | null
    reviewStatus: 'draft' | 'editorial_checked' | 'subject_expert_checked'
    reviewedAt: string | null
    sourceUrl: string | null
  }
}

export interface WrittenQuestion {
  id: string
  question: string
  marks: number
  suggestedMinutes: number
  expectedLength: string
  hint: string
  markingPoints: string[]
  exemplar: string
  exemplarAnnotations: Array<{ label: string; explanation: string }>
  canUpdateMastery: boolean
  level?: 'retrieval' | 'standard' | 'challenge'
}

export interface WrittenMark {
  estimatedMark: number
  maximumMark: number
  confidence: 'low' | 'medium' | 'high'
  transcription: string
  summary: string
  strengths: Array<{ point: string; evidence: string }>
  improvements: string[]
  nextStep: string
  evidenceToken?: string
  modelVersion?: string
  rubricVersion?: string
}

export interface Analytics {
  generatedAt: string
  aiMarkingEnabled: boolean
  integrity: { ok: boolean; xpMatchesEvents: boolean; stalledCompletions: number; masteryMismatches: number }
  onTrack: 'not_enough_evidence' | 'on_track' | 'slightly_behind' | 'needs_attention'
  overall: {
    coverage: number
    mastery: number | null
    workloadRemaining: number
    consistency: number
    rag: Record<RagStatus, number>
  }
  week: { plannedSessions: number; completedSessions: number; plannedMinutes: number; completedMinutes: number }
  subjects: Array<{
    subjectId: string; subjectName: string; coverage: number; mastery: number | null
    workloadRemaining: number; consistency: number; rag: Record<RagStatus, number>
  }>
  burndown: Array<{ date: string; idealRemaining: number; actualRemaining: number }>
  subjectBurndown: Record<string, Array<{ date: string; idealRemaining: number; actualRemaining: number }>>
  weakTopics: Array<{ topicId: string; topicName: string; subjectName: string; mastery: number | null; ragStatus: RagStatus; workloadRemaining: number }>
  nextSevenDays: Array<{ id: string; subjectName: string; topicName: string; scheduledAt: string; minutes: number; status: string }>
  exams: Array<{
    id: string; subjectId: string; subjectName: string; component: string; examDatetime: string
    durationMinutes: number | null; examBoard: string; confirmed: boolean; source: string | null
    lastVerifiedAt: string | null; eventKind: 'final' | 'mock' | 'school_assessment'
  }>
  exceptions: Array<{ startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectsStreak: boolean }>
  gamification: {
    xp: number; level: number; levelProgress: number; weeklyGoalMinutes: number; weeklyCompletedMinutes: number; streak: number
    achievements: Array<{ id: string; name: string; description: string; unlocked: boolean }>
    recentXp: Array<{ eventType: string; points: number; createdAt: string }>
  }
}
