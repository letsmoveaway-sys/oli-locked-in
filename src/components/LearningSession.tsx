import { useMemo, useState } from 'react'
import type { TopicDetail, TopicRevision } from '../types'

type Stage = 'overview' | 'examples' | 'test' | 'results'

interface LearningSessionProps {
  topic: TopicDetail
  revision: TopicRevision
  onBack: () => void
  onResult: (topicId: string, score: number, maximumScore: number) => Promise<void>
  onReviseNow: (topicId: string) => Promise<void>
  recordResults: boolean
}

const stages: Array<{ id: Stage; label: string }> = [
  { id: 'overview', label: '1. Learn' }, { id: 'examples', label: '2. Worked examples' },
  { id: 'test', label: '3. Test yourself' }, { id: 'results', label: '4. Results' },
]

export function LearningSession({ topic, revision, onBack, onResult, onReviseNow, recordResults }: LearningSessionProps) {
  const [stage, setStage] = useState<Stage>('overview')
  const [exampleAnswers, setExampleAnswers] = useState<Record<number, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; maximum: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const maximum = useMemo(() => revision.testQuestions.reduce((sum, question) => sum + question.marks, 0), [revision.testQuestions])

  async function finishTest() {
    const score = revision.testQuestions.reduce((sum, question) => sum + (answers[question.id] === question.correctOption ? question.marks : 0), 0)
    setResult({ score, maximum }); setStage('results'); setSaving(true)
    try { if (recordResults) await onResult(topic.topicId, score, maximum) } finally { setSaving(false) }
  }

  return <section className="learning-session" aria-labelledby="learning-session-heading">
    <header className="learning-session__header">
      <button className="secondary" onClick={onBack} type="button">← Back</button>
      <div><p className="eyebrow">{topic.subjectName} · Full revision session</p><h1 id="learning-session-heading">{topic.topicName}</h1></div>
      <div className="lesson-header-actions"><span className={`rag-label rag--${topic.ragStatus}`}>{topic.masteryScore === null ? 'Not assessed' : `${Math.round(topic.masteryScore)}% mastery`}</span>{recordResults ? <button onClick={() => void onReviseNow(topic.topicId)} type="button">Revise now</button> : null}</div>
    </header>
    <nav className="lesson-steps" aria-label="Revision session stages">{stages.map((item) => <button aria-current={stage === item.id ? 'step' : undefined} disabled={item.id === 'results' && !result} key={item.id} onClick={() => setStage(item.id)} type="button">{item.label}</button>)}</nav>

    {stage === 'overview' ? <div className="lesson-page card">
      <p className="eyebrow">Topic overview</p><h2>Understand the topic first</h2><p className="lesson-lead">{revision.summary}</p>
      {!revision.bespoke ? <p className="fallback-notice">This is a starter lesson while detailed course content is being expanded. The official topic link below goes directly to the relevant specification section.</p> : null}
      <div className="revision-columns"><section><h3>What you need to be able to do</h3><ul>{revision.learningObjectives.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Key knowledge</h3><ul>{revision.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <section className="exam-tip-panel"><h3>Exam technique</h3><ul>{revision.examTips.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {topic.notes || topic.assessments.length || topic.sessions.length ? <section className="previous-evidence"><h3>Your previous work</h3>{topic.notes ? <p className="saved-notes">{topic.notes}</p> : null}<p>{topic.totalSessions} completed session{topic.totalSessions === 1 ? '' : 's'} · {topic.totalMinutes} minutes revised{topic.latestAssessment === null ? '' : ` · latest test ${Math.round(topic.latestAssessment)}%`}</p></section> : null}
      <div className="lesson-next"><button onClick={() => setStage('examples')} type="button">Continue to worked examples →</button></div>
    </div> : null}

    {stage === 'examples' ? <div className="lesson-page card">
      <p className="eyebrow">Guided practice</p><h2>See how to work it through</h2>
      <article className="worked-example worked-example--large"><h3>{revision.workedExample.title}</h3><p className="question-prompt">{revision.workedExample.prompt}</p><ol>{revision.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="answer-box"><strong>Final answer:</strong> {revision.workedExample.answer}</p></article>
      <h2>Sample questions with answers</h2><div className="sample-question-list">{revision.practiceQuestions.map((question, index) => <article key={`${question.question}-${index}`}><div className="question-heading"><strong>Example {index + 1}</strong><span>{question.marks} marks</span></div><p>{question.question}</p><p className="hint-box"><strong>How to start:</strong> {question.hint}</p><button className="secondary" onClick={() => setExampleAnswers((state) => ({ ...state, [index]: !state[index] }))} type="button">{exampleAnswers[index] ? 'Hide worked answer' : 'Show worked answer'}</button>{exampleAnswers[index] ? <p className="answer-box"><strong>Answer:</strong> {question.answer}</p> : null}</article>)}</div>
      {revision.resources.length ? <><h2>Extra help for this exact topic</h2><div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div></> : null}
      <div className="lesson-next"><button onClick={() => setStage('test')} type="button">I’m ready to test myself →</button></div>
    </div> : null}

    {stage === 'test' ? <div className="lesson-page card">
      <p className="eyebrow">Independent check</p><h2>Test yourself</h2><p className="lesson-lead">Choose an answer for every question. Your score will be marked automatically{recordResults ? ' and saved to your progress' : ''}.</p>
      <div className="auto-test">{revision.testQuestions.map((question, index) => <fieldset key={question.id}><legend><span>Question {index + 1}</span>{question.question} <small>{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</small></legend>{question.options.map((option, optionIndex) => <label className="answer-option" key={option}><input checked={answers[question.id] === optionIndex} name={question.id} onChange={() => setAnswers((state) => ({ ...state, [question.id]: optionIndex }))} type="radio" />{option}</label>)}</fieldset>)}</div>
      <div className="lesson-next"><span>{Object.keys(answers).length} of {revision.testQuestions.length} answered</span><button disabled={Object.keys(answers).length !== revision.testQuestions.length} onClick={() => void finishTest()} type="button">Finish and mark test</button></div>
    </div> : null}

    {stage === 'results' && result ? <div className="lesson-page card">
      <p className="eyebrow">Test complete</p><div className="result-hero"><div><strong>{result.score}/{result.maximum}</strong><span>{Math.round(result.score / result.maximum * 100)}%</span></div><div><h2>{result.score / result.maximum >= .75 ? 'Strong result' : result.score / result.maximum >= .5 ? 'Good start—review the feedback' : 'Review the examples and try again'}</h2><p>{recordResults ? (saving ? 'Saving this result to your progress…' : 'This result has been saved to mastery and will influence your revision plan.') : 'This is a read-only preview, so the result has not been added to Student progress.'}</p></div></div>
      <h2>Answer review</h2><div className="answer-review">{revision.testQuestions.map((question, index) => { const correct = answers[question.id] === question.correctOption; return <article className={correct ? 'answer-review--correct' : 'answer-review--wrong'} key={question.id}><strong>Question {index + 1}: {correct ? 'Correct' : 'Not quite'}</strong><p>Your answer: {question.options[answers[question.id] ?? -1] ?? 'No answer'}</p>{!correct ? <p>Correct answer: {question.options[question.correctOption]}</p> : null}<small>{question.explanation}</small></article> })}</div>
      <h2>Continue with this exact topic</h2>{revision.resources.length ? <div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div> : <p>No direct topic resources have been added yet.</p>}
      <div className="lesson-next"><button className="secondary" onClick={() => { setAnswers({}); setResult(null); setStage('overview') }} type="button">Repeat session</button><button onClick={onBack} type="button">Finish session</button></div>
    </div> : null}
  </section>
}
