import { useMemo } from 'react'
import type { Analytics, CourseSubject, PlanSession, TopicProgress } from '../types'

interface SubjectBrowserProps {
  subjects: CourseSubject[]
  topics: TopicProgress[]
  sessions: PlanSession[]
  onViewTopic: (topicId: string) => void
  analytics?: Analytics | null
}

export function SubjectBrowser({ subjects, topics, sessions, onViewTopic, analytics }: SubjectBrowserProps) {
  const activeSubjects = subjects.filter((subject) => subject.active)
  const summaries = useMemo(() => activeSubjects.map((subject) => {
    const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id)
    const assessed = subjectTopics.filter((topic) => topic.masteryScore !== null)
    const mastery = assessed.length ? Math.round(assessed.reduce((sum, topic) => sum + (topic.masteryScore ?? 0), 0) / assessed.length) : null
    const next = sessions.find((session) => session.subjectId === subject.id && session.status === 'planned')
    return { subject, topics: subjectTopics, assessed, mastery, next }
  }), [activeSubjects, topics, sessions])

  return (
    <section aria-labelledby="subjects-heading">
      <div className="section-heading"><div><p className="eyebrow">Phase 5 · Subject overview</p><h2 id="subjects-heading">Your subjects</h2></div></div>
      <div className="subject-overviews">
        {summaries.map(({ subject, topics: subjectTopics, assessed, mastery, next }) => (
          <details className="subject-overview card" key={subject.id}>
            <summary>
              <div><p>{subject.examBoard}{subject.tier === 'higher' || subject.tier === 'foundation' ? ` · ${subject.tier}` : ''}</p><h3>{subject.name}</h3><span>Grade {subject.currentGrade ?? '—'} → target {subject.targetGrade ?? '—'}</span></div>
              <div className="subject-overview__metrics"><strong>{mastery ?? '—'}{mastery === null ? '' : '%'}</strong><span>mastery</span><small>{assessed.length}/{subjectTopics.length} assessed</small></div>
            </summary>
            <div className="coverage-bar" aria-label={`${assessed.length} of ${subjectTopics.length} topics assessed`}><span style={{ width: `${subjectTopics.length ? (assessed.length / subjectTopics.length) * 100 : 0}%` }} /></div>
            <p className="next-activity"><strong>{analytics?.subjects.find((item) => item.subjectId === subject.id)?.workloadRemaining ?? '—'} workload units remaining.</strong> {next ? <>Next: <strong>{next.topicName}</strong> · {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(next.scheduledAt))}</> : 'No upcoming activity currently scheduled.'}</p>
            <div className="subject-topic-list">
              {subjectTopics.map((topic) => (
                <button key={topic.topicId} onClick={() => onViewTopic(topic.topicId)} type="button">
                  <span className={`rag-dot rag-dot--${topic.ragStatus}`} /><span><strong>{topic.topicName}</strong><small>{topic.component ?? 'Course topic'} · {topic.totalMinutes} min revised</small></span><b>{topic.masteryScore ?? '—'}{topic.masteryScore === null ? '' : '%'}</b>
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
