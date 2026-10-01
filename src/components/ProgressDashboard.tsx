import { type FormEvent, useMemo, useState } from 'react'
import type { Confidence, TopicProgress } from '../types'
import { productDateKey } from '../utils/dateTime'
import { AccessibleDialog } from './AccessibleDialog'

interface ProgressDashboardProps {
  topics: TopicProgress[]
  editable: boolean
  onConfidence: (topicId: string, confidence: Confidence) => Promise<void>
  onAssessment: (topicId: string, score: number, maximumScore: number) => Promise<void>
  onPractice: (topicId: string) => void
}

const confidenceOptions: Array<{ value: Confidence; label: string }> = [
  { value: 'unknown', label: "Don't know it" },
  { value: 'struggling', label: 'Struggling' },
  { value: 'ok', label: 'OK' },
  { value: 'confident', label: 'Confident' },
]

const ragLabels = {
  grey: 'Grey — Not assessed',
  red: 'Red — Needs work',
  amber: 'Amber — Developing',
  green: 'Green — Secure',
}

export function ProgressDashboard({ topics, editable, onConfidence, onAssessment, onPractice }: ProgressDashboardProps) {
  const subjects = useMemo(() => [...new Set(topics.map((topic) => topic.subjectName))], [topics])
  const [subject, setSubject] = useState('All subjects')
  const [focus, setFocus] = useState('Priority')
  const [search, setSearch] = useState('')
  const [assessmentTopic, setAssessmentTopic] = useState<TopicProgress | null>(null)
  const [score, setScore] = useState('')
  const [maximumScore, setMaximumScore] = useState('100')
  const [busyTopic, setBusyTopic] = useState('')
  const today = productDateKey()
  const shown = topics
    .filter((topic) => subject === 'All subjects' || topic.subjectName === subject)
    .filter((topic) => !search.trim() || `${topic.topicName} ${topic.subjectName} ${topic.component}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((topic) => focus === 'All topics' ||
      (focus === 'Priority' && (topic.ragStatus === 'red' || topic.ragStatus === 'amber' || Boolean(topic.nextReviewAt && topic.nextReviewAt.slice(0, 10) <= today))) ||
      (focus === 'Due now' && Boolean(topic.nextReviewAt && topic.nextReviewAt.slice(0, 10) <= today)) ||
      (focus === 'Not checked' && topic.ragStatus === 'grey') ||
      (focus === 'Secure' && topic.ragStatus === 'green'))
    .sort((left, right) => (left.masteryScore ?? -1) - (right.masteryScore ?? -1))
  const counts = topics.reduce((result, topic) => ({ ...result, [topic.ragStatus]: result[topic.ragStatus] + 1 }), { grey: 0, red: 0, amber: 0, green: 0 })

  async function chooseConfidence(topicId: string, confidence: Confidence) {
    setBusyTopic(topicId)
    try { await onConfidence(topicId, confidence) } finally { setBusyTopic('') }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assessmentTopic) return
    setBusyTopic(assessmentTopic.topicId)
    try {
      await onAssessment(assessmentTopic.topicId, Number(score), Number(maximumScore))
      setAssessmentTopic(null)
      setScore('')
    } finally { setBusyTopic('') }
  }

  return (
    <section aria-labelledby="progress-heading">
      <div className="section-heading">
        <div><p className="eyebrow">What to work on next</p><h2 id="progress-heading">Your topic progress</h2></div>
      </div>

      <div className="progress-filters card">
        <label>Find a topic<input onChange={(event) => setSearch(event.target.value)} placeholder="Try algebra or cell biology" type="search" value={search} /></label>
        <label>Show<select onChange={(event) => setFocus(event.target.value)} value={focus}><option>Priority</option><option>Due now</option><option>Not checked</option><option>Secure</option><option>All topics</option></select></label>
        <label>Subject<select onChange={(event) => setSubject(event.target.value)} value={subject}><option>All subjects</option>{subjects.map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>

      <div className="rag-summary" aria-label="RAG summary">
        {(['grey', 'red', 'amber', 'green'] as const).map((rag) => (
          <div className={`rag-summary__item rag--${rag}`} key={rag}><strong>{counts[rag]}</strong><span>{rag}</span></div>
        ))}
      </div>

      {editable && counts.grey > 0 ? <p className="assessment-hint">Start with a quick confidence check. It is only an initial estimate and can change whenever better evidence is recorded.</p> : null}
      <div className="progress-list">
        {shown.map((topic) => (
          <article className="progress-card card" key={topic.topicId}>
            <div className="progress-card__heading">
              <div><p>{topic.subjectName} · {topic.component}</p><h3>{topic.topicName}</h3></div>
              <div className={`mastery-score rag--${topic.ragStatus}`}><strong>{topic.masteryScore ?? '—'}{topic.masteryScore !== null ? '%' : ''}</strong><span>{topic.masteryScore === null ? 'Not checked' : 'Evidence estimate'}</span></div>
            </div>
            <p className="topic-description">{topic.description}</p>
            <p className={`rag-label rag--${topic.ragStatus}`}>{ragLabels[topic.ragStatus]}</p>
            {topic.latestAssessment !== null ? <p className="evidence-line">Latest assessment: <strong>{topic.latestAssessment}%</strong></p> : null}
            {editable ? (
              <div className="progress-actions">
                <fieldset disabled={busyTopic === topic.topicId}>
                  <legend>How confident are you?</legend>
                  <div className="confidence-buttons">
                    {confidenceOptions.map((option) => (
                      <button
                        aria-pressed={topic.confidence === option.value}
                        key={option.value}
                        onClick={() => void chooseConfidence(topic.topicId, option.value)}
                        type="button"
                      >{option.label}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="progress-card__buttons"><button onClick={() => onPractice(topic.topicId)} type="button">Practise this topic</button><button className="secondary assessment-button" onClick={() => setAssessmentTopic(topic)} type="button">Add a result</button></div>
              </div>
            ) : null}
          </article>
        ))}
        {!shown.length ? <div className="card empty-plan"><h3>No topics match</h3><p>Try “All topics” or clear the search. If Priority is empty, that is good news: nothing currently needs urgent attention.</p></div> : null}
      </div>

      {assessmentTopic ? (
        <AccessibleDialog busy={busyTopic === assessmentTopic.topicId} className="assessment-modal card" onClose={() => setAssessmentTopic(null)} titleId="assessment-heading">
          <form onSubmit={submitAssessment}>
            <p className="eyebrow">Record evidence</p>
            <h2 id="assessment-heading">{assessmentTopic.topicName}</h2>
            <div className="score-fields">
              <label>Score<input autoFocus min="0" onChange={(event) => setScore(event.target.value)} required type="number" value={score} /></label>
              <span>out of</span>
              <label>Maximum<input min="1" onChange={(event) => setMaximumScore(event.target.value)} required type="number" value={maximumScore} /></label>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setAssessmentTopic(null)} type="button">Cancel</button>
              <button disabled={busyTopic === assessmentTopic.topicId} type="submit">Save result</button>
            </div>
          </form>
        </AccessibleDialog>
      ) : null}
    </section>
  )
}
