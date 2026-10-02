import { useState } from 'react'
import type { PlanSession, SessionCompletionInput, TopicProgress, WeeklyAvailability } from '../types'
import { productDateKey } from '../utils/dateTime'
import { SessionCompletionDialog } from './SessionCompletionDialog'
import { CannotDoDialog, type CannotDoReason } from './CannotDoDialog'

interface PlanDashboardProps {
  sessions: PlanSession[]
  availability: WeeklyAvailability[]
  studentMode: boolean
  onGenerate: () => Promise<void>
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onCannotDo: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
  onAvailability: (values: WeeklyAvailability[]) => Promise<void>
  onViewTopic: (topicId: string) => void
  topics?: TopicProgress[]
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const displayDate = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(date))

export function PlanDashboard({ sessions, topics = [], availability, studentMode, onGenerate, onComplete, onCannotDo, onAvailability, onViewTopic }: PlanDashboardProps) {
  const [busy, setBusy] = useState(false)
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)
  const [slots, setSlots] = useState(() => Object.fromEntries(availability.map((item) => [item.weekday, item.availableSlots ?? 0])))
  const grouped = sessions.reduce<Record<string, PlanSession[]>>((result, session) => {
    const date = productDateKey(new Date(session.scheduledAt))
    return { ...result, [date]: [...(result[date] ?? []), session] }
  }, {})

  async function generate() { setBusy(true); try { await onGenerate() } finally { setBusy(false) } }
  async function saveWeeklyAvailability() {
    setBusy(true)
    try { await onAvailability(dayNames.map((_, index) => ({ weekday: index + 1, availableSlots: Number(slots[index + 1] ?? 0) }))) }
    finally { setBusy(false) }
  }

  return <section aria-labelledby="plan-heading">
    <div className="section-heading"><div><p className="eyebrow">Topics distributed before your exams</p><h2 id="plan-heading">Your next six weeks</h2></div><button disabled={busy} onClick={() => void generate()} type="button">{sessions.length ? 'Rebuild schedule' : 'Build schedule'}</button></div>
    {!studentMode ? <details className="availability-panel card"><summary>Weekly revision capacity</summary><p>Choose how many revision topics can realistically be covered on each day. There are no minute estimates or fixed lesson lengths.</p><div className="availability-grid">{dayNames.map((name, index) => <div className="availability-day" key={name}><strong>{name}</strong><label>Revision slots<input min="0" max="12" onChange={(event) => setSlots({ ...slots, [index + 1]: Number(event.target.value) })} type="number" value={slots[index + 1] ?? 0} /></label></div>)}</div><button disabled={busy} onClick={() => void saveWeeklyAvailability()} type="button">Save capacity and rebuild</button></details> : null}
    {!sessions.length ? <div className="empty-plan card"><h3>No revision schedule yet</h3><p>Set weekly capacity and allocate sessions to topics, then build the schedule.</p></div> : <div className="plan-days">{Object.entries(grouped).map(([date, daySessions]) => <section className="plan-day" key={date}><div className="plan-day__heading"><h3>{displayDate(`${date}T12:00:00Z`)}</h3><span>{daySessions.length} slot{daySessions.length === 1 ? '' : 's'}</span></div><div className="plan-sessions">{daySessions.map((session) => <article className={`plan-session ${session.source === 'tutor' ? 'plan-session--tutor' : ''}`} key={session.id}><div className="session-main"><p>{session.subjectName} · {session.sessionType}</p><h4>{session.topicName}</h4><span>{session.plannerReason}</span></div>{studentMode && session.status === 'planned' ? <div className="session-actions">{session.topicId ? <button className="secondary" onClick={() => onViewTopic(session.topicId!)} type="button">View coverage and resources</button> : null}<button onClick={() => setActiveSession(session)} type="button">Complete slot</button><button className="secondary" onClick={() => setBlockedSession(session)} type="button">Cannot do</button></div> : <div className="session-actions"><span className="session-status">{session.status}</span>{session.topicId ? <button className="secondary" onClick={() => onViewTopic(session.topicId!)} type="button">View topic</button> : null}</div>}</article>)}</div></section>)}</div>}
    {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} topic={topics.find((topic) => topic.topicId === activeSession.topicId)} /> : null}
    {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onCannotDo} session={blockedSession} /> : null}
  </section>
}
