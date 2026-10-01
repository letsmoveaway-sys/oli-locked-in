import { useState } from 'react'
import type { PlanSession, SessionCompletionInput, TopicProgress } from '../types'
import { formatProductTime, productDateKey } from '../utils/dateTime'
import { SessionCompletionDialog } from './SessionCompletionDialog'
import { CannotDoDialog, type CannotDoReason } from './CannotDoDialog'

interface WeeklyPlannerProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onMove: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onReplan: () => Promise<void>
  onViewTopic: (topicId: string) => void
  onReviewTopic: (topicId: string) => void
  editable?: boolean
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function WeeklyPlanner({ sessions, topics, onMove, onComplete, onReplan, onViewTopic, onReviewTopic, editable = true }: WeeklyPlannerProps) {
  const todayKey = productDateKey()
  const today = new Date(`${todayKey}T12:00:00Z`)
  const mondayOffset = (today.getUTCDay() + 6) % 7
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - mondayOffset)
  const start = monday.toISOString().slice(0, 10)
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)

  return (
    <section aria-labelledby="week-heading">
      <div className="section-heading"><div><p className="eyebrow">A realistic week at a glance</p><h2 id="week-heading">This week</h2></div>{editable ? <button onClick={() => void onReplan()} type="button">Rebuild my week</button> : null}</div>
      <div className="week-grid">
        {days.map((date) => {
          const items = sessions.filter((session) => productDateKey(new Date(session.scheduledAt)) === date)
          return (
            <section className={`week-day ${date === todayKey ? 'week-day--today' : ''}`} key={date}>
              <header><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${date}T12:00:00Z`))}</span><strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong><small>{items.reduce((sum, item) => sum + item.plannedMinutes, 0)} min</small></header>
              <div className="week-day__sessions">
                {!items.length ? <p className="rest-day">Rest / unavailable</p> : items.map((session) => {
                  const topic = topics.find((item) => item.topicId === session.topicId)
                  return <article className={`week-session week-session--${session.source}`} key={session.id}>
                    <p>{formatProductTime(session.scheduledAt)} · {session.plannedMinutes}m</p><h3>{session.subjectName}</h3><span>{session.topicName}</span>
                    {(session.reviewItems ?? []).map((item) => <small className="session-review" key={item.topicId}>Review: {item.topicName}</small>)}
                    <span className={`rag-dot rag-dot--${topic?.ragStatus ?? 'grey'}`} aria-label={topic?.ragStatus ?? 'not assessed'} />
                    {session.status === 'planned' && session.source !== 'tutor' ? <div><button className="text-button" onClick={() => session.topicId && onViewTopic(session.topicId)} type="button">Open / resume</button>{editable ? <><button className="text-button" onClick={() => setActiveSession(session)} type="button">Complete</button><button className="text-button" onClick={() => setBlockedSession(session)} type="button">Postpone / swap</button></> : null}</div> : <div><small className="session-status">{session.status}</small>{session.topicId ? <button className="text-button" onClick={() => onReviewTopic(session.topicId!)} type="button">Review content</button> : null}</div>}
                  </article>
                })}
              </div>
            </section>
          )
        })}
      </div>
      <p className="planner-note">Postponing a session safely releases its slot and rebuilds the remaining plan around your availability, tutors and current priorities.</p>
      {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} /> : null}
      {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onMove} session={blockedSession} /> : null}
    </section>
  )
}
