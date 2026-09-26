import { useState } from 'react'
import type { PlanSession, WeeklyAvailability } from '../types'

interface PlanDashboardProps {
  sessions: PlanSession[]
  availability: WeeklyAvailability[]
  studentMode: boolean
  onGenerate: () => Promise<void>
  onStatus: (sessionId: string, status: 'completed' | 'rescheduled') => Promise<void>
  onAvailability: (values: WeeklyAvailability[]) => Promise<void>
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function displayDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(date))
}

export function PlanDashboard({ sessions, availability, studentMode, onGenerate, onStatus, onAvailability }: PlanDashboardProps) {
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState(() => Object.fromEntries(availability.map((item) => [item.weekday, item.availableMinutes])))
  const grouped = sessions.reduce<Record<string, PlanSession[]>>((result, session) => {
    const date = session.scheduledAt.slice(0, 10)
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
        startTime: availability.find((item) => item.weekday === index + 1)?.startTime ?? (index < 5 ? '17:00' : '10:00'),
      })))
    } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="plan-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Phase 4 · Adaptive planner</p><h2 id="plan-heading">Your next 14 days</h2></div>
        <button disabled={busy} onClick={() => void generate()} type="button">{sessions.length ? 'Rebuild plan' : 'Generate plan'}</button>
      </div>

      {!studentMode ? (
        <details className="availability-panel card">
          <summary>Weekly availability</summary>
          <div className="availability-grid">
            {dayNames.map((name, index) => (
              <label key={name}>{name}<input min="0" max="360" onChange={(event) => setMinutes({ ...minutes, [index + 1]: Number(event.target.value) })} type="number" value={minutes[index + 1] ?? 0} /><span>minutes</span></label>
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
                    <div className="session-time">{new Date(session.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</div>
                    <div className="session-main">
                      <p>{session.subjectName} · {session.sessionType}</p>
                      <h4>{session.topicName}</h4>
                      <span>{session.plannerReason}</span>
                      {(session.reviewItems ?? []).map((item) => <span className="session-review" key={item.topicId}>↻ {item.plannedMinutes}m memory review: {item.topicName}</span>)}
                    </div>
                    <div className="session-duration">{session.plannedMinutes}m</div>
                    {studentMode && session.status === 'planned' ? (
                      <div className="session-actions">
                        <button onClick={() => void onStatus(session.id, 'completed')} type="button">Complete</button>
                        <button className="secondary" onClick={() => void onStatus(session.id, 'rescheduled')} type="button">Cannot do</button>
                      </div>
                    ) : <span className="session-status">{session.status}</span>}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
