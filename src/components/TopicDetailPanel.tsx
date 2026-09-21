import { type FormEvent, useState } from 'react'
import type { Confidence, TopicDetail, TopicRevision } from '../types'
import { TopicLearning } from './TopicLearning'

interface TopicDetailPanelProps {
  topic: TopicDetail | null
  revision: TopicRevision | null
  loading: boolean
  editable: boolean
  onClose: () => void
  onConfidence: (topicId: string, confidence: Confidence) => Promise<void>
  onAssessment: (topicId: string, score: number, maximumScore: number) => Promise<void>
  onReviseNow: (topicId: string) => Promise<void>
}

function displayDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not yet'
}

export function TopicDetailPanel({ topic, revision, loading, editable, onClose, onConfidence, onAssessment, onReviseNow }: TopicDetailPanelProps) {
  const [showTest, setShowTest] = useState(false)
  const [score, setScore] = useState('')

  async function submitTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!topic) return
    await onAssessment(topic.topicId, Number(score), 100)
    setScore(''); setShowTest(false)
  }

  return (
    <div className="topic-panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <aside aria-labelledby="topic-detail-heading" className="topic-panel">
        <button aria-label="Close topic details" className="topic-panel__close" onClick={onClose} type="button">×</button>
        {loading || !topic ? <p className="loading-inline">Loading topic…</p> : <>
          <p className="eyebrow">{topic.subjectName} · {topic.component ?? 'Course topic'}</p><h2 id="topic-detail-heading">{topic.topicName}</h2><p className="topic-description">{topic.description}</p>
          <div className="topic-detail-stats"><div className={`mastery-score rag--${topic.ragStatus}`}><strong>{topic.masteryScore ?? '—'}</strong><span>mastery</span></div><div><strong>{topic.totalSessions}</strong><span>sessions</span></div><div><strong>{topic.totalMinutes}m</strong><span>revised</span></div></div>
          <dl className="topic-facts"><div><dt>Confidence</dt><dd>{topic.confidence ?? 'Not assessed'}</dd></div><div><dt>Last revised</dt><dd>{displayDate(topic.lastRevisedAt)}</dd></div><div><dt>Next review</dt><dd>{displayDate(topic.nextReviewAt)}</dd></div></dl>
          {revision ? <TopicLearning revision={revision} /> : <p className="error">Learning content could not be loaded for this topic.</p>}
          {editable ? <div className="topic-primary-actions"><button onClick={() => void onReviseNow(topic.topicId)} type="button">Revise now</button><button className="secondary" onClick={() => setShowTest(!showTest)} type="button">Test me</button><button className="secondary" onClick={() => void onConfidence(topic.topicId, 'struggling')} type="button">Flag for attention</button></div> : null}
          {showTest ? <form className="quick-test" onSubmit={submitTest}><label>Quick self-test score out of 100<input autoFocus min="0" max="100" onChange={(event) => setScore(event.target.value)} required type="number" value={score} /></label><button type="submit">Save test result</button></form> : null}
          {editable ? <div className="topic-confidence"><h3>Change confidence</h3><div className="confidence-buttons">{(['unknown', 'struggling', 'ok', 'confident'] as Confidence[]).map((confidence) => <button aria-pressed={topic.confidence === confidence} key={confidence} onClick={() => void onConfidence(topic.topicId, confidence)} type="button">{confidence === 'unknown' ? 'Not sure' : confidence}</button>)}</div></div> : null}
          {topic.notes ? <section><h3>Latest notes</h3><p className="saved-notes">{topic.notes}</p></section> : null}
          <section><h3>Evidence and history</h3>{!topic.masteryHistory.length && !topic.assessments.length && !topic.sessions.length ? <p>No evidence recorded yet.</p> : <div className="history-list">
            {topic.sessions.map((session) => <article key={session.id}><strong>{session.sessionType} · {session.status}</strong><span>{displayDate(session.scheduledAt)} · {session.actualMinutes ?? session.plannedMinutes} min</span>{session.notes ? <p>{session.notes}</p> : null}</article>)}
            {topic.assessments.map((item, index) => <article key={`${item.completedAt}-${index}`}><strong>{item.assessmentType}: {item.percentage}%</strong><span>{displayDate(item.completedAt)}</span></article>)}
            {topic.masteryHistory.map((item, index) => <article key={`${item.recordedAt}-${index}`}><strong>Mastery {item.score}%</strong><span>{displayDate(item.recordedAt)} · {item.reason}</span></article>)}
          </div>}</section>
        </>}
      </aside>
    </div>
  )
}
