import type { TopicDetail, TopicRevision } from '../types'

interface Props {
  topic: TopicDetail
  revision: TopicRevision
  onBack: () => void
}

export function TopicSchedulePanel({ topic, revision, onBack }: Props) {
  const items = topic.coverageItems ?? []
  const covered = items.filter((item) => item.completed).length
  const resources = revision.resources.filter((resource, index, values) => values.findIndex((item) => item.url === resource.url) === index)
  return <section className="learning-session topic-schedule-panel" aria-labelledby="topic-schedule-heading">
    <header className="learning-session__header"><button className="secondary" onClick={onBack} type="button">← Back</button><div><p className="eyebrow">{topic.subjectName} · Revision scheduling</p><h1 id="topic-schedule-heading">{topic.topicName}</h1></div></header>
    <div className="topic-schedule-summary card"><div><strong>{covered}/{items.length}</strong><span>coverage points completed</span></div><div><strong>{topic.totalSessions}/{topic.targetSessions ?? 1}</strong><span>allocated slots completed</span></div><div><strong>{topic.remainingSessions ?? 0}</strong><span>follow-up slots required</span></div></div>
    <div className="topic-schedule-grid"><section className="card"><p className="eyebrow">Coverage checklist</p><h2>What needs to be covered</h2><p>Coverage is marked when a scheduled revision slot is completed. Unticked parts keep this topic in the schedule.</p><ul className="coverage-list coverage-list--large">{items.map((item) => <li className={item.completed ? 'is-covered' : ''} key={item.id}><span aria-hidden="true">{item.completed ? '✓' : '○'}</span><span>{item.name}</span></li>)}</ul></section><aside className="card"><p className="eyebrow">Useful materials</p><h2>Resources for this topic</h2>{resources.length ? <div className="resource-grid">{resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div> : <p>No direct resource has been matched yet. Use the official course source below.</p>}{revision.contentProvenance.sourceUrl ? <a className="button-link" href={revision.contentProvenance.sourceUrl} rel="noreferrer" target="_blank">Open official course source ↗</a> : null}</aside></div>
    {topic.sessions.length ? <section className="card"><h2>Revision history</h2><ul className="simple-list">{topic.sessions.map((session) => <li key={session.id}><strong>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(session.scheduledAt))}</strong><span>{session.status}{session.notes ? ` · ${session.notes}` : ''}</span></li>)}</ul></section> : null}
  </section>
}
