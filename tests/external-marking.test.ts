import { describe, expect, it } from 'vitest'
import { buildExternalMarkingPrompt, parseExternalMarkingResult } from '../src/services/externalMarking'
import type { WrittenQuestion } from '../src/types'

const question: WrittenQuestion = {
  id: 'written-1', question: 'Explain why resistance increases.', marks: 4, suggestedMinutes: 6,
  expectedLength: 'One developed paragraph', hint: 'Use a cause-and-effect chain.',
  markingPoints: ['Use accurate scientific knowledge', 'Explain the complete chain'],
  exemplar: 'More collisions transfer more energy, increasing resistance.',
  exemplarAnnotations: [], canUpdateMastery: true,
}

describe('no-key Gemini marking hand-off', () => {
  it('builds a complete prompt for typed or photographed work', () => {
    const typed = buildExternalMarkingPrompt(question, 'My answer')
    expect(typed).toContain('My answer')
    expect(typed).toContain('Return only valid JSON')
    expect(buildExternalMarkingPrompt(question, '')).toContain('attach one or more photographs')
  })

  it('imports and bounds an external estimate conservatively', () => {
    const mark = parseExternalMarkingResult(JSON.stringify({
      estimatedMark: 9, confidence: 'high', transcription: 'Student answer', summary: 'Sound reasoning.',
      strengths: [{ point: 'Accurate cause', evidence: 'collisions' }], improvements: ['Add the final link.'], nextStep: 'Rewrite the final sentence.',
    }), question, '')
    expect(mark.estimatedMark).toBe(4)
    expect(mark.confidence).toBe('medium')
    expect(mark.nextStep).toBe('Rewrite the final sentence.')
  })

  it('rejects a conversational response instead of inventing a mark', () => {
    expect(() => parseExternalMarkingResult('This looks good.', question, '')).toThrow(/complete JSON result/)
  })
})
