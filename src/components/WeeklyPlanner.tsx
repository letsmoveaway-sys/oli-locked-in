import type { PlanSession, TopicProgress } from '../types'

interface WeeklyPlannerProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onMove: (sessionId: string) => Promise<void>
  onReplan: () => Promise<void>
  onViewTopic: (topicId: string) => void
  editable?: boolean
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function WeeklyPlanner({ sessions, topics, onMove, onReplan, onViewTopic, editable = true }: WeeklyPlannerProps) {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  const start = monday.toISOString().slice(0, 10)
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return (
    <section aria-labelledby="week-heading">
      <div className="section-heading"><div><p className="eyebrow">Phase 5 · Weekly planner</p><h2 id="week-heading">This week</h2></div>{editable ? <button onClick={() => void onReplan()} type="button">Request replan</button> : null}</div>
      <div className="week-grid">
        {days.map((date) => {
          const items = sessions.filter((session) => session.scheduledAt.slice(0, 10) === date)
          return (
            <section className={`week-day ${date === new Date().toISOString().slice(0, 10) ? 'week-day--today' : ''}`} key={date}>
              <header><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${date}T12:00:00Z`))}</span><strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong><small>{items.reduce((sum, item) => sum + item.plannedMinutes, 0)} min</small></header>
              <div className="week-day__sessions">
                {!items.length ? <p className="rest-day">Rest / unavailable</p> : items.map((session) => {
                  const topic = topics.find((item) => item.topicId === session.topicId)
                  return <article className={`week-session week-session--${session.source}`} key={session.id}>
                    <p>{new Date(session.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} · {session.plannedMinutes}m</p><h3>{session.subjectName}</h3><span>{session.topicName}</span>
                    {(session.reviewItems ?? []).map((item) => <small className="session-review" key={item.topicId}>Review: {item.topicName}</small>)}
                    <span className={`rag-dot rag-dot--${topic?.ragStatus ?? 'grey'}`} aria-label={topic?.ragStatus ?? 'not assessed'} />
                    {session.status === 'planned' && session.source !== 'tutor' ? <div><button className="text-button" onClick={() => session.topicId && onViewTopic(session.topicId)} type="button">Topic</button>{editable ? <button className="text-button" onClick={() => void onMove(session.id)} type="button">Postpone / swap</button> : null}</div> : <small className="session-status">{session.status}</small>}
                  </article>
                })}
              </div>
            </section>
          )
        })}
      </div>
      <p className="planner-note">Postponing a session safely releases its slot and rebuilds the remaining plan around your availability, tutors and current priorities.</p>
    </section>
  )
}
