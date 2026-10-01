import { type FormEvent, useState } from 'react'
import type { Confidence, PlanSession, SessionCompletionInput } from '../types'
import { AccessibleDialog } from './AccessibleDialog'

interface Props {
  session: PlanSession
  onClose: () => void
  onComplete: (input: SessionCompletionInput) => Promise<void>
}

const confidenceOptions: Array<{ value: Confidence; label: string }> = [
  { value: 'struggling', label: 'Struggling' },
  { value: 'ok', label: 'OK' },
  { value: 'confident', label: 'Confident' },
  { value: 'unknown', label: 'Not sure' },
]

export function SessionCompletionDialog({ session, onClose, onComplete }: Props) {
  const [actualMinutes, setActualMinutes] = useState(String(session.plannedMinutes))
  const [confidenceAfter, setConfidenceAfter] = useState<Confidence>('ok')
  const [assessment, setAssessment] = useState('')
  const [notes, setNotes] = useState('')
  const [reviewScores, setReviewScores] = useState<Record<string, string>>(
    Object.fromEntries((session.reviewItems ?? []).map((item) => [item.topicId, ''])),
  )
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await onComplete({
        sessionId: session.id,
        actualMinutes: Number(actualMinutes),
        confidenceAfter,
        assessmentPercentage: assessment === '' ? null : Number(assessment),
        notes,
        reviewResults: (session.reviewItems ?? []).map((item) => ({
          topicId: item.topicId,
          percentage: reviewScores[item.topicId] === '' ? null : Number(reviewScores[item.topicId]),
        })),
      })
      onClose()
    } catch {
      // The owning screen presents the API error; keeping this dialog mounted preserves the Student's input.
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccessibleDialog busy={busy} className="assessment-modal card" onClose={onClose} titleId="completion-heading">
      <form className="completion-form" onSubmit={submit}>
        <p className="eyebrow">Finish revision session</p><h2 id="completion-heading">{session.topicName}</h2>
        <label>Actual time spent (minutes)<input autoFocus min="1" max="360" onChange={(event) => setActualMinutes(event.target.value)} required type="number" value={actualMinutes} /></label>
        <fieldset><legend>How do you feel now?</legend><div className="confidence-buttons">{confidenceOptions.map((option) => <button aria-pressed={confidenceAfter === option.value} key={option.value} onClick={() => setConfidenceAfter(option.value)} type="button">{option.label}</button>)}</div></fieldset>
        <label>Quick-check score % <span className="optional">optional</span><input min="0" max="100" onChange={(event) => setAssessment(event.target.value)} type="number" value={assessment} /></label>
        {(session.reviewItems ?? []).length ? <fieldset className="review-results"><legend>Earlier learning: retrieval checks</legend><p>Try to answer from memory before checking notes. Record the score so the next review can be timed properly.</p>{(session.reviewItems ?? []).map((item) => <label key={item.topicId}>{item.topicName} % <span className="optional">optional</span><input min="0" max="100" onChange={(event) => setReviewScores({ ...reviewScores, [item.topicId]: event.target.value })} type="number" value={reviewScores[item.topicId] ?? ''} /></label>)}</fieldset> : null}
        <label>Notes <span className="optional">optional</span><textarea maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="What went well, or what should you revisit?" value={notes} /></label>
        <div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose} type="button">Cancel</button><button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save and finish'}</button></div>
      </form>
    </AccessibleDialog>
  )
}
