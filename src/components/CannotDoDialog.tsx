import { type FormEvent, useState } from 'react'
import type { PlanSession } from '../types'
import { AccessibleDialog } from './AccessibleDialog'

export type CannotDoReason = 'busy' | 'unwell' | 'too_difficult' | 'already_covered'

interface Props {
  session: PlanSession
  onClose: () => void
  onSubmit: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
}

const choices: Array<{ value: CannotDoReason; label: string; help: string }> = [
  { value: 'busy', label: 'I am busy', help: 'Move this revision to the next realistic slot.' },
  { value: 'unwell', label: 'I am ill or exhausted', help: 'Move it without treating today as a failure.' },
  { value: 'too_difficult', label: 'This feels too difficult', help: 'Move it and keep it visible as a priority.' },
  { value: 'already_covered', label: 'I already covered this', help: 'Skip this session. No mastery evidence is invented.' },
]

export function CannotDoDialog({ session, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<CannotDoReason>('busy')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await onSubmit(session.id, reason, reason === 'already_covered' ? 'skipped' : 'rescheduled'); onClose() }
    catch { /* The owning screen displays the error while this choice remains open. */ }
    finally { setBusy(false) }
  }

  return <AccessibleDialog busy={busy} className="assessment-modal card" onClose={onClose} titleId="cannot-do-heading"><form className="obstacle-form" onSubmit={submit}><p className="eyebrow">Adjust this session</p><h2 id="cannot-do-heading">Why can’t you do {session.topicName}?</h2><p>Choose the closest answer. The plan will respond without changing your scores.</p><fieldset>{choices.map((choice, index) => <label className="obstacle-choice" key={choice.value}><input autoFocus={index === 0} checked={reason === choice.value} name="cannot-do-reason" onChange={() => setReason(choice.value)} type="radio" /><span><strong>{choice.label}</strong><small>{choice.help}</small></span></label>)}</fieldset><div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose} type="button">Cancel</button><button disabled={busy} type="submit">{busy ? 'Updating…' : reason === 'already_covered' ? 'Skip this session' : 'Find another slot'}</button></div></form></AccessibleDialog>
}
