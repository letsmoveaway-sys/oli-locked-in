import type { Env } from '../types'
import type { WrittenQuestion } from './revision'

export interface WrittenMark {
  estimatedMark: number
  maximumMark: number
  confidence: 'low' | 'medium' | 'high'
  transcription: string
  summary: string
  strengths: Array<{ point: string; evidence: string }>
  improvements: string[]
  nextStep: string
  modelVersion: string
  rubricVersion: string
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  error?: { message?: string }
}

function imagePart(dataUrl: string): { inlineData: { mimeType: string; data: string } } | null {
  const match = /^data:(image\/(?:png|jpeg|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  const mimeType = match?.[1]
  const data = match?.[2]
  if (!mimeType || !data || data.length > 10_500_000) return null
  return { inlineData: { mimeType, data } }
}

function markingPrompt(question: WrittenQuestion, answerText: string): string {
  return `You are a cautious formative GCSE marker. Mark only what the student has actually written.

Question (${question.marks} marks):
${question.question}

Expected response size: ${question.expectedLength}

Marking requirements:
${question.markingPoints.map((point) => `- ${point}`).join('\n')}

${answerText ? `Typed or student-confirmed answer:\n${answerText}` : 'The answer is in the attached photographs. Transcribe it exactly before marking. Use [unclear] for anything you cannot confidently read.'}

Apply these rules:
- Reward accurate, relevant work and valid alternative methods or interpretations.
- Do not invent missing content or complete unclear handwriting.
- Do not award credit merely for naming a technique without explaining it.
- Select a mark supported by evidence from this exact response.
- Treat the mark as a formative estimate, not an official examiner grade.
- Give concise, encouraging feedback and one specific next step.
- The transcription must contain only the student's answer, not the question or your feedback.`
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    estimatedMark: { type: 'INTEGER' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    transcription: { type: 'STRING' },
    summary: { type: 'STRING' },
    strengths: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { point: { type: 'STRING' }, evidence: { type: 'STRING' } },
        required: ['point', 'evidence'],
      },
    },
    improvements: { type: 'ARRAY', items: { type: 'STRING' } },
    nextStep: { type: 'STRING' },
  },
  required: ['estimatedMark', 'confidence', 'transcription', 'summary', 'strengths', 'improvements', 'nextStep'],
}

export async function markWrittenAnswer(
  question: WrittenQuestion,
  answerText: string,
  imageDataUrls: string[],
  env: Env,
): Promise<WrittenMark> {
  if (!env.GEMINI_API_KEY) throw new Error('AI_MARKING_NOT_CONFIGURED')
  const rawImages = imageDataUrls.map(imagePart)
  if (rawImages.some((part) => part === null)) throw new Error('INVALID_IMAGE')
  const images = rawImages.filter((part): part is NonNullable<typeof part> => part !== null)
  if (!answerText && images.length === 0) throw new Error('EMPTY_ANSWER')

  const model = env.GEMINI_MODEL && /^[A-Za-z0-9._-]+$/.test(env.GEMINI_MODEL) ? env.GEMINI_MODEL : 'gemini-2.5-flash'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: markingPrompt(question, answerText) }, ...images] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  })
  const body = await response.json() as GeminiResponse
  if (!response.ok) throw new Error(body.error?.message ?? 'AI_MARKING_FAILED')
  const text = body.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text
  if (!text) throw new Error('AI_MARKING_FAILED')
  const parsed = JSON.parse(text) as Partial<WrittenMark>
  const estimatedMark = Math.max(0, Math.min(question.marks, Math.round(Number(parsed.estimatedMark))))
  const confidence = parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low'
  return {
    estimatedMark,
    maximumMark: question.marks,
    confidence,
    transcription: typeof parsed.transcription === 'string' ? parsed.transcription.slice(0, 20_000) : answerText,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1_000) : 'Review the detailed feedback below.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).filter((item): item is { point: string; evidence: string } => Boolean(item && typeof item.point === 'string' && typeof item.evidence === 'string')) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5).filter((item): item is string => typeof item === 'string') : [],
    nextStep: typeof parsed.nextStep === 'string' ? parsed.nextStep.slice(0, 1_000) : 'Use the marking points to improve one part of the answer.',
    modelVersion: model,
    rubricVersion: 'gcse-formative-v1',
  }
}
