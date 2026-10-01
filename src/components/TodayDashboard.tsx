import { useMemo, useState } from 'react'
import type { Analytics, PlanSession, SessionCompletionInput, TopicProgress } from '../types'
import { formatProductDate, formatProductTime, productDateKey } from '../utils/dateTime'
import { SessionCompletionDialog } from './SessionCompletionDialog'
import { CannotDoDialog, type CannotDoReason } from './CannotDoDialog'

interface TodayDashboardProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onCannotDo: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
  onStart: (sessionId: string, topicId: string) => Promise<void>
  onQuickRevision: (topicId: string, minutes: number) => Promise<void>
  onViewTopic: (topicId: string) => void
  onReviewTopic: (topicId: string) => void
  onOpenWeek: () => void
  editable?: boolean
  analytics?: Analytics | null
}

function sessionDate(value: string): string { return productDateKey(new Date(value)) }

export function TodayDashboard({ sessions, topics, onComplete, onCannotDo, onStart, onQuickRevision, onViewTopic, onReviewTopic, onOpenWeek, editable = true, analytics }: TodayDashboardProps) {
  const today = productDateKey()
  const todaySessions = sessions.filter((session) => sessionDate(session.scheduledAt) === today)
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)
  const plannedMinutes = todaySessions.filter((item) => item.status === 'planned' || item.status === 'tutor').reduce((sum, item) => sum + item.plannedMinutes, 0)
  const weekSessions = sessions.slice().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 14)
  const completed = weekSessions.filter((item) => item.status === 'completed')
  const assessed = topics.filter((topic) => topic.masteryScore !== null)
  const averageMastery = assessed.length ? Math.round(assessed.reduce((sum, topic) => sum + (topic.masteryScore ?? 0), 0) / assessed.length) : 0
  const weakTopics = useMemo(() => topics.filter((topic) => topic.ragStatus === 'red' || topic.ragStatus === 'amber').sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0)).slice(0, 3), [topics])
  const quickTopic = weakTopics[0] ?? topics.find((topic) => topic.nextReviewAt && topic.nextReviewAt.slice(0, 10) <= today) ?? topics.find((topic) => topic.ragStatus === 'grey')

  return (
    <section aria-labelledby="today-heading">
      <div className="today-hero card">
        <div><p className="eyebrow">Today · {formatProductDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2 id="today-heading">Your revision for today</h2><p>{plannedMinutes ? `${plannedMinutes} minutes planned across ${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}.` : 'Nothing is scheduled today. Use the week view to see what is coming up.'}</p></div>
        <button className="secondary" onClick={onOpenWeek} type="button">View full week</button>
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
                  <div className="today-session__time"><strong>{formatProductTime(session.scheduledAt)}</strong><span>{session.plannedMinutes} min</span></div>
                  <div className="today-session__main">
                    <p>{session.subjectName} · {session.sessionType}</p><h3>{session.topicName}</h3>
                    <span className={`rag-label rag--${topic?.ragStatus ?? 'grey'}`}>{topic?.ragStatus ?? (isTutor ? 'Tutor' : 'Not assessed')}</span>
                    <p className="reason">Why this is here: {session.plannerReason}</p>
                    {(session.reviewItems ?? []).length ? <div className="review-agenda">
                      <strong>Memory review from earlier learning</strong>
                      <ol><li>Without notes, write or say what you remember.</li><li>Attempt a few questions, quotations or key steps.</li><li>Then check the topic and correct any gaps.</li></ol>
                      {(session.reviewItems ?? []).map((item) => <div className="review-agenda__item" key={item.topicId}><p><span>{item.plannedMinutes} min · {item.subjectName}</span>{item.topicName}<small>{item.reason}</small></p><button className="text-button" onClick={() => onViewTopic(item.topicId)} type="button">Open after recall</button></div>)}
                    </div> : session.sessionType === 'Spaced retrieval review'
                      ? <p className="new-learning-note">Memory review: try the topic from memory before reopening the lesson notes.</p>
                      : <p className="new-learning-note">Main focus: learn or strengthen this topic.</p>}
                    {session.startedAt ? <p className="started-note" role="status">In progress — your start has been saved.</p> : null}
                  </div>
                  {editable && session.status === 'planned' && !isTutor ? (
                    <div className="today-session__actions">
                      <button onClick={() => session.topicId && void onStart(session.id, session.topicId)} type="button">{session.startedAt ? 'Resume revision' : 'Start revision'}</button>
                      <button onClick={() => setActiveSession(session)} type="button">Complete</button>
                      <button className="secondary" onClick={() => session.topicId && onViewTopic(session.topicId)} type="button">Open / resume</button>
                      <button className="text-button" onClick={() => setBlockedSession(session)} type="button">Cannot do</button>
                    </div>
                  ) : <div className="today-session__actions"><span className="session-status">{session.status}</span>{session.topicId ? <button className="secondary" onClick={() => onReviewTopic(session.topicId!)} type="button">Review content</button> : null}</div>}
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
          {editable && quickTopic ? <div className="quick-revision card"><h3>Short on time or energy?</h3><p>Do one focused check on <strong>{quickTopic.topicName}</strong>. A small useful start still counts.</p><div className="quick-revision__actions">{[5, 10, 20].map((minutes) => <button className="secondary" key={minutes} onClick={() => void onQuickRevision(quickTopic.topicId, minutes)} type="button">{minutes === 5 ? 'Low energy · 5 min' : `${minutes} min`}</button>)}</div></div> : null}
        </aside>
      </div>

      <div className="dashboard-stats">
        <article className="mini-stat"><strong>{assessed.length ? `${averageMastery}%` : '—'}</strong><span>{assessed.length ? 'current mastery estimate' : 'not enough evidence yet'}</span></article>
        <article className="mini-stat"><strong>{assessed.length}/{topics.length}</strong><span>topics checked</span></article>
        <article className="mini-stat"><strong>{analytics?.week.completedSessions ?? completed.length}/{analytics?.week.plannedSessions ?? weekSessions.length}</strong><span>sessions this week</span></article>
        <article className="mini-stat"><strong>{analytics?.week.completedMinutes ?? completed.reduce((sum, item) => sum + item.plannedMinutes, 0)}/{analytics?.week.plannedMinutes ?? weekSessions.reduce((sum, item) => sum + item.plannedMinutes, 0)}m</strong><span>minutes this week</span></article>
      </div>

      {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} /> : null}
      {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onCannotDo} session={blockedSession} /> : null}
    </section>
  )
}
