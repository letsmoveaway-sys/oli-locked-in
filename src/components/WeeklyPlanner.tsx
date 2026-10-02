import { useState } from 'react'
import type { PlanSession, SessionCompletionInput, TopicProgress } from '../types'
import { productDateKey } from '../utils/dateTime'
import { SessionCompletionDialog } from './SessionCompletionDialog'
import { CannotDoDialog, type CannotDoReason } from './CannotDoDialog'

interface WeeklyPlannerProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onMove: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onReplan: () => Promise<void>
  onViewTopic: (topicId: string) => void
  editable?: boolean
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function WeeklyPlanner({ sessions, topics, onMove, onComplete, onReplan, onViewTopic, editable = true }: WeeklyPlannerProps) {
  const todayKey = productDateKey()
  const today = new Date(`${todayKey}T12:00:00Z`)
  const mondayOffset = (today.getUTCDay() + 6) % 7
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - mondayOffset)
  const currentWeekStart = monday.toISOString().slice(0, 10)
  const [weekOffset, setWeekOffset] = useState(0)
  const start = addDays(currentWeekStart, weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const end = days.at(-1)!
  const scheduleEnd = addDays(todayKey, 41)
  const canMoveForward = addDays(start, 7) <= scheduleEnd
  const weekHeading = weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : `Week of ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(`${start}T12:00:00Z`))}`
  const weekRange = `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${start}T12:00:00Z`))} â€“ ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${end}T12:00:00Z`))}`
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)

  return (
    <section aria-labelledby="week-heading">
      <div className="section-heading"><div><p className="eyebrow">Six-week revision schedule</p><h2 id="week-heading">{weekHeading}</h2><p className="week-range">{weekRange}</p></div>{editable ? <button onClick={() => void onReplan()} type="button">Rebuild six-week schedule</button> : null}</div>
      <nav aria-label="Choose schedule week" className="week-navigation">
        <button className="secondary" disabled={weekOffset === 0} onClick={() => setWeekOffset((value) => Math.max(0, value - 1))} type="button">â† Previous week</button>
        <button className="secondary" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)} type="button">Current week</button>
        <span>Week {weekOffset + 1}</span>
        <button disabled={!canMoveForward} onClick={() => setWeekOffset((value) => value + 1)} type="button">Next week â†’</button>
      </nav>
      <div className="week-grid">
        {days.map((date) => {
          const items = sessions.filter((session) => productDateKey(new Date(session.scheduledAt)) === date)
          return (
            <section className={`week-day ${date === todayKey ? 'week-day--today' : ''}`} key={date}>
              <header><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${date}T12:00:00Z`))}</span><strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong><small>{items.length} slot{items.length === 1 ? '' : 's'}</small></header>
              <div className="week-day__sessions">
                {!items.length ? <p className="rest-day">Rest / unavailable</p> : items.map((session) => {
                  const topic = topics.find((item) => item.topicId === session.topicId)
                  return <article className={`week-session week-session--${session.source}`} key={session.id}>
                    <p>{session.sessionType}</p><h3>{session.subjectName}</h3><span>{session.topicName}</span>
                    {topic ? <small>{(topic.coverageItems ?? []).filter((item) => item.completed).length}/{topic.coverageItems?.length ?? 0} coverage points</small> : null}
                    {session.status === 'planned' && session.source !== 'tutor' ? <div><button className="text-button" onClick={() => session.topicId && onViewTopic(session.topicId)} type="button">View topic</button>{editable ? <><button className="text-button" onClick={() => setActiveSession(session)} type="button">Complete slot</button><button className="text-button" onClick={() => setBlockedSession(session)} type="button">Postpone / swap</button></> : null}</div> : <div><small className="session-status">{session.status}</small>{session.topicId ? <button className="text-button" onClick={() => onViewTopic(session.topicId!)} type="button">View topic</button> : null}</div>}
                  </article>
                })}
              </div>
            </section>
          )
        })}
      </div>
      <p className="planner-note">Use Previous week and Next week to review the full six-week schedule. Postponing a slot rebuilds the remaining schedule around exam dates, capacity and unfinished coverage.</p>
      {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} topic={topics.find((topic) => topic.topicId === activeSession.topicId)} /> : null}
      {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onMove} session={blockedSession} /> : null}
    </section>
  )
}
