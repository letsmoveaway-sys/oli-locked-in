import { useMemo, useState } from 'react'
import type { Analytics, CourseSubject, PlanSession, TopicProgress } from '../types'

interface SubjectBrowserProps {
  subjects: CourseSubject[]
  topics: TopicProgress[]
  sessions: PlanSession[]
  onViewTopic: (topicId: string) => void
  onTarget?: (topicId: string, targetSessions: number) => Promise<void>
  editable?: boolean
  analytics?: Analytics | null
}

export function SubjectBrowser({ subjects, topics, sessions, onViewTopic, onTarget, editable = false }: SubjectBrowserProps) {
  const activeSubjects = subjects.filter((subject) => subject.active)
  const [allocations, setAllocations] = useState<Record<string, number>>(() => Object.fromEntries(topics.map((topic) => [topic.topicId, topic.targetSessions ?? 1])))
  const [saving, setSaving] = useState('')
  const summaries = useMemo(() => activeSubjects.map((subject) => {
    const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id)
    const completed = subjectTopics.filter((topic) => (topic.coverageItems ?? []).every((item) => item.completed))
    const next = sessions.find((session) => session.subjectId === subject.id && session.status === 'planned')
    return { subject, topics: subjectTopics, completed, next }
  }), [activeSubjects, topics, sessions])

  async function saveTarget(topicId: string) {
    if (!onTarget) return
    setSaving(topicId)
    try { await onTarget(topicId, Math.max(0, Math.min(100, Number(allocations[topicId] ?? 1)))) }
    finally { setSaving('') }
  }

  return <section aria-labelledby="subjects-heading">
    <div className="section-heading"><div><p className="eyebrow">Everything that needs covering</p><h2 id="subjects-heading">Subjects and topic allocations</h2><p>Open a topic to see its detailed coverage checklist and useful external resources.</p></div></div>
    <div className="subject-overviews">{summaries.map(({ subject, topics: subjectTopics, completed, next }) => <details className="subject-overview card" key={subject.id}><summary><div><p>{subject.examBoard}{subject.specificationCode ? ` · ${subject.specificationCode}` : ''}</p><h3>{subject.name}</h3><span>{completed.length}/{subjectTopics.length} topics fully covered</span></div><div className="subject-overview__metrics"><strong>{subjectTopics.reduce((sum, topic) => sum + (topic.remainingSessions ?? 0), 0)}</strong><span>slots remaining</span><small>{next ? `Next: ${next.topicName}` : 'Nothing currently scheduled'}</small></div></summary><div className="coverage-bar" aria-label={`${completed.length} of ${subjectTopics.length} topics covered`}><span style={{ width: `${subjectTopics.length ? completed.length / subjectTopics.length * 100 : 0}%` }} /></div><div className="subject-topic-list topic-allocation-list">{subjectTopics.map((topic) => {
        const items = topic.coverageItems ?? []
        const covered = items.filter((item) => item.completed).length
        return <article className="topic-allocation" key={topic.topicId}><div className="topic-allocation__heading"><button className="topic-link" onClick={() => onViewTopic(topic.topicId)} type="button"><span><strong>{topic.topicName}</strong><small>{topic.component ?? 'Course topic'} · {covered}/{items.length} coverage points</small></span></button><div className="topic-allocation__count"><strong>{topic.remainingSessions ?? 0}</strong><span>remaining</span></div></div><details><summary>Coverage breakdown</summary><ul className="coverage-list">{items.map((item) => <li className={item.completed ? 'is-covered' : ''} key={item.id}><span aria-hidden="true">{item.completed ? '✓' : '○'}</span>{item.name}</li>)}</ul></details>{editable ? <div className="allocation-control"><label>Allocated revision slots<input min="0" max="100" onChange={(event) => setAllocations({ ...allocations, [topic.topicId]: Number(event.target.value) })} type="number" value={allocations[topic.topicId] ?? topic.targetSessions ?? 1} /></label><button className="secondary" disabled={saving === topic.topicId} onClick={() => void saveTarget(topic.topicId)} type="button">{saving === topic.topicId ? 'Saving…' : 'Save allocation'}</button></div> : null}<button className="text-button" onClick={() => onViewTopic(topic.topicId)} type="button">Coverage and useful materials →</button></article>
      })}</div></details>)}</div>
  </section>
}
