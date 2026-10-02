import { useState } from 'react'
import type { PlanSession, SessionCompletionInput, TopicProgress } from '../types'
import { formatProductDate, productDateKey } from '../utils/dateTime'
import { SessionCompletionDialog } from './SessionCompletionDialog'
import { CannotDoDialog, type CannotDoReason } from './CannotDoDialog'

interface TodayDashboardProps {
  sessions: PlanSession[]
  topics: TopicProgress[]
  onComplete: (input: SessionCompletionInput) => Promise<void>
  onCannotDo: (sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') => Promise<void>
  onViewTopic: (topicId: string) => void
  onOpenWeek: () => void
  editable?: boolean
}

export function TodayDashboard({ sessions, topics, onComplete, onCannotDo, onViewTopic, onOpenWeek, editable = true }: TodayDashboardProps) {
  const today = productDateKey()
  const todaySessions = sessions.filter((session) => productDateKey(new Date(session.scheduledAt)) === today)
  const [activeSession, setActiveSession] = useState<PlanSession | null>(null)
  const [blockedSession, setBlockedSession] = useState<PlanSession | null>(null)
  const completedTopics = topics.filter((topic) => (topic.coverageItems ?? []).every((item) => item.completed)).length
  const openCoverage = topics.reduce((total, topic) => total + (topic.coverageItems ?? []).filter((item) => !item.completed).length, 0)

  return <section aria-labelledby="today-heading">
    <div className="today-hero card"><div><p className="eyebrow">Today · {formatProductDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2 id="today-heading">Today’s revision topics</h2><p>{todaySessions.length ? `${todaySessions.length} revision slot${todaySessions.length === 1 ? '' : 's'} scheduled.` : 'Nothing is scheduled today. Open the plan to see what is coming up.'}</p></div><button className="secondary" onClick={onOpenWeek} type="button">View full week</button></div>
    <div className="today-layout"><div><h3 className="subheading">Scheduled today</h3>{!todaySessions.length ? <div className="card empty-plan"><h3>No topics today</h3><p>The schedule is spread across the revision capacity that has been set.</p></div> : null}<div className="today-sessions">{todaySessions.map((session) => {
      const topic = topics.find((item) => item.topicId === session.topicId)
      const covered = (topic?.coverageItems ?? []).filter((item) => item.completed).length
      const total = topic?.coverageItems?.length ?? 0
      return <article className={`today-session card ${session.source === 'tutor' ? 'today-session--tutor' : ''}`} key={session.id}><div className="today-session__main"><p>{session.subjectName} · {session.sessionType}</p><h3>{session.topicName}</h3><p className="reason">Why this is here: {session.plannerReason}</p>{topic ? <p className="coverage-summary"><strong>{covered}/{total}</strong> coverage points marked</p> : null}</div>{editable && session.status === 'planned' && session.source !== 'tutor' ? <div className="today-session__actions">{session.topicId ? <button className="secondary" onClick={() => onViewTopic(session.topicId!)} type="button">View checklist and resources</button> : null}<button onClick={() => setActiveSession(session)} type="button">Complete and mark coverage</button><button className="text-button" onClick={() => setBlockedSession(session)} type="button">Cannot do this slot</button></div> : <div className="today-session__actions"><span className="session-status">{session.status}</span>{session.topicId ? <button className="secondary" onClick={() => onViewTopic(session.topicId!)} type="button">View checklist and resources</button> : null}</div>}</article>
    })}</div></div><aside><h3 className="subheading">Coverage overview</h3><div className="weak-list card"><p><strong>{completedTopics}</strong> topics fully covered</p><p><strong>{openCoverage}</strong> detailed coverage points still open</p><button className="secondary" onClick={onOpenWeek} type="button">Open schedule</button></div></aside></div>
    <div className="dashboard-stats"><article className="mini-stat"><strong>{completedTopics}/{topics.length}</strong><span>topics fully covered</span></article><article className="mini-stat"><strong>{todaySessions.filter((item) => item.status === 'completed').length}/{todaySessions.length}</strong><span>today’s slots completed</span></article><article className="mini-stat"><strong>{openCoverage}</strong><span>coverage points remaining</span></article></div>
    {activeSession ? <SessionCompletionDialog onClose={() => setActiveSession(null)} onComplete={onComplete} session={activeSession} topic={topics.find((topic) => topic.topicId === activeSession.topicId)} /> : null}
    {blockedSession ? <CannotDoDialog onClose={() => setBlockedSession(null)} onSubmit={onCannotDo} session={blockedSession} /> : null}
  </section>
}
