import type { WrittenMark, WrittenQuestion } from '../types'

export function buildExternalMarkingPrompt(question: WrittenQuestion, answerText: string): string {
  return `Act as a cautious formative GCSE marker. Mark only the student's actual work. This is an estimate, not an official examiner grade.

QUESTION (${question.marks} marks)
${question.question}

EXPECTED LENGTH
${question.expectedLength}

MARKING REQUIREMENTS
${question.markingPoints.map((point) => `- ${point}`).join('\n')}

REFERENCE EXEMPLAR
${question.exemplar}

${answerText.trim() ? `STUDENT ANSWER\n${answerText.trim()}` : 'STUDENT ANSWER\nThe student will attach one or more photographs. Transcribe only what is visible and use [unclear] where handwriting cannot be read.'}

Apply these rules:
- Reward accurate, relevant work and valid alternative methods or interpretations.
- Do not invent missing content or complete unclear handwriting.
- Do not award credit merely for naming a technique without explaining it.
- Give a mark from 0 to ${question.marks}, concise strengths, improvements and one specific next step.

Return only valid JSON in exactly this shape, with no markdown before or after it:
{
  "estimatedMark": 0,
  "confidence": "low",
  "transcription": "the student's answer",
  "summary": "one-sentence assessment",
  "strengths": [{ "point": "a strength", "evidence": "a short quotation or working from the answer" }],
  "improvements": ["a precise improvement"],
  "nextStep": "one action the student should take"
}`
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, 20_000) : fallback
}

export function parseExternalMarkingResult(raw: string, question: WrittenQuestion, answerText: string): WrittenMark {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Paste the complete JSON result returned by Gemini.')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    throw new Error('That result is not valid JSON. Ask Gemini to return only the requested JSON, then paste it again.')
  }

  const rawMark = Number(parsed.estimatedMark)
  if (!Number.isFinite(rawMark)) throw new Error('The pasted result does not contain a valid estimatedMark.')
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const point = text(record.point)
    return point ? [{ point, evidence: text(record.evidence) }] : []
  }) : []
  const improvements = Array.isArray(parsed.improvements)
    ? parsed.improvements.slice(0, 5).map((item) => text(item)).filter(Boolean)
    : []

  // Imported feedback cannot be cryptographically verified, so it never receives high confidence.
  const confidence = parsed.confidence === 'low' ? 'low' : 'medium'
  return {
    estimatedMark: Math.max(0, Math.min(question.marks, Math.round(rawMark))),
    maximumMark: question.marks,
    confidence,
    transcription: text(parsed.transcription, answerText.trim() || 'Handwritten answer supplied separately to Gemini.'),
    summary: text(parsed.summary, 'Gemini returned an estimated mark for this answer.'),
    strengths,
    improvements,
    nextStep: text(parsed.nextStep, 'Use the marking requirements to improve one part of the answer.'),
  }
}
