import { type FormEvent, useMemo, useState } from 'react'
import type { Analytics, Confidence, PlanSession, SessionCompletionInput, TopicProgress } from '../types'

interface TodayDashboardProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onCannotDo: (sessionId: string) => Promise<void>
  onViewTopic: (topicId: string) => void
  onOpenWeek: () => void
  editable?: boolean
  analytics?: Analytics | null
}

const confidenceOptions: Array<{ value: Confidence; label: string }> = [
  { value: 'struggling', label: 'Struggling' },
  { value: 'ok', label: 'OK' },
  { value: 'confident', label: 'Confident' },
  { value: 'unknown', label: 'Not sure' },
]

function sessionDate(value: string): string { return value.slice(0, 10) }
function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function TodayDashboard({ sessions, topics, onComplete, onCannotDo, onViewTopic, onOpenWeek, editable = true, analytics }: TodayDashboardProps) {
  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter((session) => sessionDate(session.scheduledAt) === today)
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [startedSession, setStartedSession] = useState('')
  const [actualMinutes, setActualMinutes] = useState('')
  const [confidenceAfter, setConfidenceAfter] = useState<Confidence>('ok')
  const [assessment, setAssessment] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const plannedMinutes = todaySessions.filter((item) => item.status === 'planned' || item.status === 'tutor').reduce((sum, item) => sum + item.plannedMinutes, 0)
  const weekSessions = sessions.slice().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 14)
  const completed = weekSessions.filter((item) => item.status === 'completed')
  const assessed = topics.filter((topic) => topic.masteryScore !== null)
  const averageMastery = assessed.length ? Math.round(assessed.reduce((sum, topic) => sum + (topic.masteryScore ?? 0), 0) / assessed.length) : 0
  const weakTopics = useMemo(() => topics.filter((topic) => topic.ragStatus === 'red' || topic.ragStatus === 'amber').sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0)).slice(0, 3), [topics])

  function openCompletion(session: PlanSession) {
    setActiveSession(session)
    setActualMinutes(String(session.plannedMinutes))
    setConfidenceAfter('ok')
    setAssessment('')
    setNotes('')
  }

  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeSession) return
    setBusy(true)
    try {
      await onComplete({
        sessionId: activeSession.id,
        actualMinutes: Number(actualMinutes),
        confidenceAfter,
        assessmentPercentage: assessment === '' ? null : Number(assessment),
        notes,
      })
      setActiveSession(null)
      setStartedSession('')
    } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="today-heading">
      <div className="today-hero card">
        <div><p className="eyebrow">Today · {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h2 id="today-heading">Your revision for today</h2><p>{plannedMinutes ? `${plannedMinutes} minutes planned across ${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}.` : 'Nothing is scheduled today. Use the week view to see what is coming up.'}</p></div>
        <button className="secondary" onClick={onOpenWeek} type="button">View full week</button>
      </div>

      <div className="dashboard-stats">
        <article className="mini-stat"><strong>{averageMastery}%</strong><span>overall mastery</span></article>
        <article className="mini-stat"><strong>{assessed.length}/{topics.length}</strong><span>topics assessed</span></article>
        <article className="mini-stat"><strong>{analytics?.week.completedSessions ?? completed.length}/{analytics?.week.plannedSessions ?? weekSessions.length}</strong><span>sessions this week</span></article>
        <article className="mini-stat"><strong>{analytics?.week.completedMinutes ?? completed.reduce((sum, item) => sum + item.plannedMinutes, 0)}/{analytics?.week.plannedMinutes ?? weekSessions.reduce((sum, item) => sum + item.plannedMinutes, 0)}m</strong><span>minutes this week</span></article>
      </div>

      <div className="today-layout">
        <div>
          <h3 className="subheading">Today’s sessions</h3>
          {!todaySessions.length ? <div className="card empty-plan"><h3>No sessions today</h3><p>Your plan is deliberately spread around your availability.</p></div> : null}
          <div className="today-sessions">
            {todaySessions.map((session) => {
              const topic = topics.find((item) => item.topicId === session.topicId)
              const isTutor = session.source === 'tutor'
              return (
                <article className={`today-session card ${isTutor ? 'today-session--tutor' : ''}`} key={session.id}>
                  <div className="today-session__time"><strong>{formatTime(session.scheduledAt)}</strong><span>{session.plannedMinutes} min</span></div>
                  <div className="today-session__main">
                    <p>{session.subjectName} · {session.sessionType}</p><h3>{session.topicName}</h3>
                    <span className={`rag-label rag--${topic?.ragStatus ?? 'grey'}`}>{topic?.ragStatus ?? (isTutor ? 'Tutor' : 'Not assessed')}</span>
                    <p className="reason">Why this is here: {session.plannerReason}</p>
                    {startedSession === session.id ? <p className="started-note" role="status">Session started — stay focused, then record how it went.</p> : null}
                  </div>
                  {editable && session.status === 'planned' && !isTutor ? (
                    <div className="today-session__actions">
                      <button onClick={() => setStartedSession(session.id)} type="button">Start</button>
                      <button onClick={() => openCompletion(session)} type="button">Complete</button>
                      <button className="secondary" onClick={() => session.topicId && onViewTopic(session.topicId)} type="button">View topic</button>
                      <button className="text-button" onClick={() => void onCannotDo(session.id)} type="button">Cannot do</button>
                    </div>
                  ) : <span className="session-status">{session.status}</span>}
                </article>
              )
            })}
          </div>
        </div>

        <aside>
          <h3 className="subheading">Priority weak areas</h3>
          <div className="weak-list card">
            {weakTopics.length ? weakTopics.map((topic) => (
              <button className="weak-topic" key={topic.topicId} onClick={() => onViewTopic(topic.topicId)} type="button">
                <span className={`rag-dot rag-dot--${topic.ragStatus}`} />
                <span><strong>{topic.topicName}</strong><small>{topic.subjectName} · {topic.masteryScore ?? 0}% mastery</small></span>
              </button>
            )) : <p>No weak areas yet. Complete confidence checks to build the picture.</p>}
          </div>
        </aside>
      </div>

      {activeSession ? (
        <div className="modal-backdrop" role="presentation">
          <form className="assessment-modal card completion-form" onSubmit={submitCompletion}>
            <p className="eyebrow">Finish revision session</p><h2>{activeSession.topicName}</h2>
            <label>Actual time spent (minutes)<input autoFocus min="1" max="360" onChange={(event) => setActualMinutes(event.target.value)} required type="number" value={actualMinutes} /></label>
            <fieldset><legend>How do you feel now?</legend><div className="confidence-buttons">{confidenceOptions.map((option) => <button aria-pressed={confidenceAfter === option.value} key={option.value} onClick={() => setConfidenceAfter(option.value)} type="button">{option.label}</button>)}</div></fieldset>
            <label>Quick-check score % <span className="optional">optional</span><input min="0" max="100" onChange={(event) => setAssessment(event.target.value)} type="number" value={assessment} /></label>
            <label>Notes <span className="optional">optional</span><textarea maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="What went well, or what should you revisit?" value={notes} /></label>
            <div className="modal-actions"><button className="secondary" onClick={() => setActiveSession(null)} type="button">Cancel</button><button disabled={busy} type="submit">Save and finish</button></div>
          </form>
        </div>
      ) : null}
    </section>
  )
}
