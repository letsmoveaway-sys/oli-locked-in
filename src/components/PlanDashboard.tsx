import { useState } from 'react'
import type { PlanSession, SessionCompletionInput, WeeklyAvailability } from '../types'
import { formatProductTime, productDateKey } from '../utils/dateTime'
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
  onReviewTopic: (topicId: string) => void
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function displayDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(date))
}

export function PlanDashboard({ sessions, availability, studentMode, onGenerate, onComplete, onCannotDo, onAvailability, onViewTopic, onReviewTopic }: PlanDashboardProps) {
  const [busy, setBusy] = useState(false)
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)
  const [minutes, setMinutes] = useState(() => Object.fromEntries(availability.map((item) => [item.weekday, item.availableMinutes])))
  const [startTimes, setStartTimes] = useState(() => Object.fromEntries(availability.map((item) => [item.weekday, item.startTime ?? ''])))
  const [sessionMinutes, setSessionMinutes] = useState(() => Object.fromEntries(availability.map((item) => [item.weekday, item.sessionMinutes ?? 35])))
  const grouped = sessions.reduce<Record<string, PlanSession[]>>((result, session) => {
    const date = productDateKey(new Date(session.scheduledAt))
    return { ...result, [date]: [...(result[date] ?? []), session] }
  }, {})

  async function generate() {
    setBusy(true)
    try { await onGenerate() } finally { setBusy(false) }
  }

  async function saveWeeklyAvailability() {
    setBusy(true)
    try {
      await onAvailability(dayNames.map((_, index) => ({
        weekday: index + 1,
        availableMinutes: Number(minutes[index + 1] ?? 0),
        startTime: startTimes[index + 1] || (index < 5 ? '17:00' : '10:00'),
        sessionMinutes: Number(sessionMinutes[index + 1] ?? 35),
      })))
    } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="plan-heading">
      <div className="section-heading">
        <div><p className="eyebrow">A realistic plan around your week</p><h2 id="plan-heading">Your next 14 days</h2></div>
        <button disabled={busy} onClick={() => void generate()} type="button">{sessions.length ? 'Rebuild plan' : 'Generate plan'}</button>
      </div>

      {!studentMode ? (
        <details className="availability-panel card">
          <summary>Weekly availability</summary>
          <p>Choose the total revision time and a realistic block length for each day. The planner leaves a 10-minute break between blocks.</p>
          <div className="availability-grid">
            {dayNames.map((name, index) => (
              <div className="availability-day" key={name}><strong>{name}</strong><label>Total minutes<input min="0" max="360" onChange={(event) => setMinutes({ ...minutes, [index + 1]: Number(event.target.value) })} type="number" value={minutes[index + 1] ?? 0} /></label><label>Block length<select onChange={(event) => setSessionMinutes({ ...sessionMinutes, [index + 1]: Number(event.target.value) })} value={sessionMinutes[index + 1] ?? 35}><option value="10">10 min</option><option value="20">20 min</option><option value="25">25 min</option><option value="35">35 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label><label>Start time<input onChange={(event) => setStartTimes({ ...startTimes, [index + 1]: event.target.value })} type="time" value={startTimes[index + 1] ?? ''} /></label>{(Number(minutes[index + 1] ?? 0) > 120 || String(startTimes[index + 1] ?? '') >= '19:30') ? <small className="workload-warning">Check this is realistic on a school night.</small> : null}</div>
            ))}
          </div>
          <button disabled={busy} onClick={() => void saveWeeklyAvailability()} type="button">Save availability and replan</button>
        </details>
      ) : null}

      {!sessions.length ? (
        <div className="empty-plan card"><h3>No revision plan yet</h3><p>Generate a plan using confirmed topics, availability, mastery and tutor sessions.</p></div>
      ) : (
        <div className="plan-days">
          {Object.entries(grouped).map(([date, daySessions]) => (
            <section className="plan-day" key={date}>
              <div className="plan-day__heading"><h3>{displayDate(`${date}T12:00:00Z`)}</h3><span>{daySessions.reduce((total, session) => total + session.plannedMinutes, 0)} min</span></div>
              <div className="plan-sessions">
                {daySessions.map((session) => (
                  <article className={`plan-session ${session.source === 'tutor' ? 'plan-session--tutor' : ''}`} key={session.id}>
                    <div className="session-time">{formatProductTime(session.scheduledAt)}</div>
                    <div className="session-main">
                      <p>{session.subjectName} · {session.sessionType}</p>
                      <h4>{session.topicName}</h4>
                      <span>{session.plannerReason}</span>
                      {(session.reviewItems ?? []).map((item) => <span className="session-review" key={item.topicId}>↻ {item.plannedMinutes}m memory review: {item.topicName}</span>)}
                    </div>
                    <div className="session-duration">{session.plannedMinutes}m</div>
                    {studentMode && session.status === 'planned' ? (
                      <div className="session-actions">
                        {session.topicId ? <button className="secondary" onClick={() => onViewTopic(session.topicId!)} type="button">Open / resume</button> : null}
                        <button onClick={() => setActiveSession(session)} type="button">Complete</button>
                        <button className="secondary" onClick={() => setBlockedSession(session)} type="button">Cannot do</button>
                      </div>
                    ) : <div className="session-actions"><span className="session-status">{session.status}</span>{session.topicId ? <button className="secondary" onClick={() => onReviewTopic(session.topicId!)} type="button">Review content</button> : null}</div>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} /> : null}
      {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onCannotDo} session={blockedSession} /> : null}
    </section>
  )
}
