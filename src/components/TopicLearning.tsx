import { useState } from 'react'
import type { TopicRevision } from '../types'

export function TopicLearning({ revision }: { revision: TopicRevision }) {
  const [workedAnswer, setWorkedAnswer] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [hints, setHints] = useState<Record<number, boolean>>({})
  return <div className="topic-learning">
    {!revision.bespoke ? <p className="fallback-notice">General revision activity for this topic. Use the linked exam-board materials for topic-specific exam questions.</p> : null}
    <section><h3>Learn</h3><p>{revision.summary}</p><h4>By the end, you should be able to</h4><ul>{revision.learningObjectives.map((item) => <li key={item}>{item}</li>)}</ul><h4>Key knowledge</h4><ul>{revision.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="worked-example"><p className="eyebrow">Worked example</p><h3>{revision.workedExample.title}</h3><p>{revision.workedExample.prompt}</p><ol>{revision.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol><button className="secondary" onClick={() => setWorkedAnswer(!workedAnswer)} type="button">{workedAnswer ? 'Hide answer' : 'Reveal answer'}</button>{workedAnswer ? <p className="answer-box"><strong>Answer:</strong> {revision.workedExample.answer}</p> : null}</section>
    <section><h3>Practise</h3><p>Try each question before revealing the hint or answer.</p><div className="practice-list">{revision.practiceQuestions.map((question, index) => <article key={`${question.question}-${index}`}><div className="question-heading"><strong>Question {index + 1}</strong><span>{question.marks} marks</span></div><p>{question.question}</p><div className="question-actions"><button className="secondary" onClick={() => setHints((state) => ({ ...state, [index]: !state[index] }))} type="button">{hints[index] ? 'Hide hint' : 'Show hint'}</button><button onClick={() => setRevealed((state) => ({ ...state, [index]: !state[index] }))} type="button">{revealed[index] ? 'Hide answer' : 'Check answer'}</button></div>{hints[index] ? <p className="hint-box"><strong>Hint:</strong> {question.hint}</p> : null}{revealed[index] ? <p className="answer-box"><strong>Model answer:</strong> {question.answer}</p> : null}</article>)}</div></section>
    <section><h3>Exam tips</h3><ul>{revision.examTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
    {revision.resources.length ? <section><h3>Continue practising</h3><div className="topic-resource-list">{revision.resources.map((resource) => <a href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><strong>{resource.title}</strong><span>{resource.provider} · {resource.description}</span></a>)}</div></section> : null}
  </div>
}
