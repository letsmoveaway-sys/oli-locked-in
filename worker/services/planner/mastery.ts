export type Confidence = 'unknown' | 'struggling' | 'ok' | 'confident'
export type RagStatus = 'grey' | 'red' | 'amber' | 'green'

export interface MasteryEvidence {
  assessmentPercentage: number | null
  confidence: Confidence | null
  completedSessions: number
  totalMinutes: number
  lastRevisedAt: string | null
}

export interface MasteryResult {
  score: number | null
  ragStatus: RagStatus
  inputs: string[]
}

const confidenceScores: Record<Confidence, number> = {
  unknown: 10,
  struggling: 30,
  ok: 60,
  confident: 85,
}

function recencyScore(lastRevisedAt: string, now: Date): number | null {
  const revised = new Date(lastRevisedAt)
  if (Number.isNaN(revised.getTime())) return null
  const days = Math.max(0, (now.getTime() - revised.getTime()) / 86_400_000)
  return Math.max(0, 100 - days * 2)
}

export function ragFromMastery(score: number | null): RagStatus {
  if (score === null) return 'grey'
  if (score <= 49) return 'red'
  if (score <= 74) return 'amber'
  return 'green'
}

export function calculateMastery(evidence: MasteryEvidence, now = new Date()): MasteryResult {
  const signals: Array<{ name: string; score: number; weight: number }> = []
  if (evidence.assessmentPercentage !== null) {
    signals.push({ name: 'assessment', score: evidence.assessmentPercentage, weight: 0.4 })
  }
  if (evidence.confidence !== null) {
    signals.push({ name: 'confidence', score: confidenceScores[evidence.confidence], weight: 0.25 })
  }
  if (evidence.completedSessions > 0) {
    // Revision participation is deliberately capped below Green: attendance alone is not mastery.
    const sessionScore = Math.min(70, 25 + evidence.completedSessions * 10 + evidence.totalMinutes / 7)
    signals.push({ name: 'session', score: sessionScore, weight: 0.2 })
  }
  if (evidence.lastRevisedAt) {
    const score = recencyScore(evidence.lastRevisedAt, now)
    if (score !== null) signals.push({ name: 'recency', score, weight: 0.15 })
  }
  if (!signals.length) return { score: null, ragStatus: 'grey', inputs: [] }

  const availableWeight = signals.reduce((total, signal) => total + signal.weight, 0)
  const score = Math.round(
    signals.reduce((total, signal) => total + signal.score * signal.weight, 0) / availableWeight,
  )
  return { score, ragStatus: ragFromMastery(score), inputs: signals.map((signal) => signal.name) }
}
