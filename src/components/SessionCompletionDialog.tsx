import { type FormEvent, useState } from 'react'
import type { PlanSession, SessionCompletionInput, TopicProgress } from '../types'
import { AccessibleDialog } from './AccessibleDialog'

interface Props {
  session: PlanSession
  topic?: TopicProgress
  onClose: () => void
  onComplete: (input: SessionCompletionInput) => Promise<void>
}

export function SessionCompletionDialog({ session, topic, onClose, onComplete }: Props) {
  const availableItems = (topic?.coverageItems ?? []).filter((item) => !item.completed)
  const [coveredItemIds, setCoveredItemIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  function toggle(itemId: string, checked: boolean) {
    setCoveredItemIds((current) => checked ? [...current, itemId] : current.filter((id) => id !== itemId))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await onComplete({ sessionId: session.id, coveredItemIds, notes })
      onClose()
    } catch {
      // The owning screen presents the API error and the form remains available.
    } finally { setBusy(false) }
  }

  return (
    <AccessibleDialog busy={busy} className="assessment-modal card" onClose={onClose} titleId="completion-heading">
      <form className="completion-form" onSubmit={submit}>
        <p className="eyebrow">Complete revision slot</p><h2 id="completion-heading">{session.topicName}</h2>
        <fieldset className="coverage-checklist"><legend>What did you cover in this session?</legend>
          <p>Select every part you covered properly. Anything left unticked remains open and the scheduler will arrange a follow-up.</p>
          {availableItems.map((item) => <label className="coverage-check" key={item.id}><input checked={coveredItemIds.includes(item.id)} onChange={(event) => toggle(item.id, event.target.checked)} type="checkbox" /><span>{item.name}</span></label>)}
          {!availableItems.length ? <p className="success">All listed parts of this topic are already covered. Save this slot as additional revision.</p> : null}
        </fieldset>
        {availableItems.length > 0 && !coveredItemIds.length ? <p className="assessment-hint">No coverage points selected. The topic will stay in the schedule for a follow-up.</p> : null}
        <label>Session notes <span className="optional">optional</span><textarea maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Resources used, questions attempted, or what to continue next time" value={notes} /></label>
        <div className="modal-actions"><button className="secondary" disabled={busy} onClick={onClose} type="button">Cancel</button><button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save coverage'}</button></div>
      </form>
    </AccessibleDialog>
  )
}
