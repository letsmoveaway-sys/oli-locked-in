import { useMemo, useState } from 'react'
import type { TopicDetail, TopicRevision, WrittenMark } from '../types'
import { markWrittenResponse } from '../services/api'
import { buildExternalMarkingPrompt, parseExternalMarkingResult } from '../services/externalMarking'
import { PhoneHandoff } from './PhoneHandoff'

type Stage = 'overview' | 'examples' | 'test' | 'results'

interface LearningSessionProps {
  topic: TopicDetail
  revision: TopicRevision
  onBack: () => void
  onResult: (topicId: string, score: number, maximumScore: number, evidence?: { assessmentType: string; markingSource: 'auto_marked' | 'ai_estimated'; markingConfidence?: 'low' | 'medium' | 'high'; feedback?: { summary?: string; nextStep?: string } }) => Promise<void>
  onReviseNow: (topicId: string) => Promise<void>
  recordResults: boolean
}

const stages: Array<{ id: Stage; label: string }> = [
  { id: 'overview', label: '1. Learn' }, { id: 'examples', label: '2. Worked examples' },
  { id: 'test', label: '3. Test yourself' }, { id: 'results', label: '4. Results' },
]

export function LearningSession({ topic, revision, onBack, onResult, onReviseNow, recordResults }: LearningSessionProps) {
  const [stage, setStage] = useState<Stage>(() => new URLSearchParams(window.location.search).get('stage') === 'test' ? 'test' : 'overview')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; maximum: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [writtenAnswer, setWrittenAnswer] = useState('')
  const [answerImages, setAnswerImages] = useState<Array<{ name: string; dataUrl: string }>>([])
  const [writtenMark, setWrittenMark] = useState<WrittenMark | null>(null)
  const [marking, setMarking] = useState(false)
  const [markingError, setMarkingError] = useState('')
  const [writtenSaved, setWrittenSaved] = useState(false)
  const [shownExemplars, setShownExemplars] = useState<Record<string, boolean>>({})
  const [externalMarkingOpen, setExternalMarkingOpen] = useState(false)
  const [externalResult, setExternalResult] = useState('')
  const [externalError, setExternalError] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [markingRoute, setMarkingRoute] = useState<'automatic' | 'external'>('automatic')
  const maximum = useMemo(() => revision.testQuestions.reduce((sum, question) => sum + question.marks, 0), [revision.testQuestions])
  const writtenQuestion = revision.writtenQuestions[0]
  const externalPrompt = useMemo(() => writtenQuestion ? buildExternalMarkingPrompt(writtenQuestion, writtenAnswer) : '', [writtenQuestion, writtenAnswer])

  async function finishTest() {
    const score = revision.testQuestions.reduce((sum, question) => sum + (answers[question.id] === question.correctOption ? question.marks : 0), 0)
    setResult({ score, maximum }); setStage('results'); setSaving(true)
    try { if (recordResults) await onResult(topic.topicId, score, maximum, { assessmentType: 'Reviewed knowledge check', markingSource: 'auto_marked', markingConfidence: 'high' }) } finally { setSaving(false) }
  }

  async function selectAnswerImages(files: FileList | null) {
    setMarkingError(''); setWrittenMark(null); setWrittenSaved(false)
    const selected = Array.from(files ?? []).slice(0, 4)
    if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
      setMarkingError('Each photograph must be smaller than 8 MB.'); return
    }
    const loaded = await Promise.all(selected.map((file) => new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result) })
      reader.onerror = () => reject(new Error('Unable to read that photograph.'))
      reader.readAsDataURL(file)
    })))
    setAnswerImages(loaded)
  }

  async function markWritten() {
    if (!writtenQuestion || (!writtenAnswer.trim() && !answerImages.length)) return
    setMarking(true); setMarkingError(''); setWrittenSaved(false)
    try {
      const mark = await markWrittenResponse({
        topicId: topic.topicId,
        questionId: writtenQuestion.id,
        answerText: writtenAnswer.trim(),
        imageDataUrls: answerImages.map((image) => image.dataUrl),
      })
      setWrittenMark(mark); setWrittenAnswer(mark.transcription); setMarkingRoute('automatic')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The answer could not be marked just now.'
      setMarkingError(message); setExternalMarkingOpen(true)
    } finally { setMarking(false) }
  }

  async function copyExternalPrompt() {
    setExternalError('')
    try {
      await navigator.clipboard.writeText(externalPrompt)
      setPromptCopied(true)
    } catch {
      setExternalError('Copy was blocked by the browser. Select the prompt below and copy it manually.')
    }
  }

  function importExternalResult() {
    if (!writtenQuestion) return
    setExternalError(''); setWrittenSaved(false)
    try {
      const mark = parseExternalMarkingResult(externalResult, writtenQuestion, writtenAnswer)
      setWrittenMark(mark); setWrittenAnswer(mark.transcription); setMarkingRoute('external')
    } catch (caught) {
      setExternalError(caught instanceof Error ? caught.message : 'The Gemini result could not be read.')
    }
  }

  async function saveWrittenResult() {
    if (!writtenQuestion || !writtenMark || !writtenQuestion.canUpdateMastery || writtenMark.confidence === 'low') return
    setSaving(true)
    try { await onResult(topic.topicId, writtenMark.estimatedMark, writtenMark.maximumMark, { assessmentType: markingRoute === 'external' ? 'Imported Gemini estimate' : 'AI-estimated written answer', markingSource: 'ai_estimated', markingConfidence: writtenMark.confidence, feedback: { summary: writtenMark.summary, nextStep: writtenMark.nextStep } }); setWrittenSaved(true) }
    finally { setSaving(false) }
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
      {!revision.bespoke ? <p className="fallback-notice">{revision.assessmentAvailable ? <><strong>Reviewed exam practice available.</strong> The overview is concise, but the question below is topic-specific, includes a worked answer and can contribute to mastery.</> : <><strong>Starter guidance only.</strong> Detailed, reviewed assessment content is still being added for this topic. You can practise and request feedback, but this activity will not change mastery. Use the official topic resource below for authoritative coverage.</>}</p> : null}
      <div className="revision-columns"><section><h3>What you need to be able to do</h3><ul>{revision.learningObjectives.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Key knowledge</h3><ul>{revision.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <section className="exam-tip-panel"><h3>Exam technique</h3><ul>{revision.examTips.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {topic.notes || topic.assessments.length || topic.sessions.length ? <section className="previous-evidence"><h3>Your previous work</h3>{topic.notes ? <p className="saved-notes">{topic.notes}</p> : null}<p>{topic.totalSessions} completed session{topic.totalSessions === 1 ? '' : 's'} · {topic.totalMinutes} minutes revised{topic.latestAssessment === null ? '' : ` · latest assessment ${Math.round(topic.latestAssessment)}%`}</p>{topic.assessments.length ? <div className="evidence-summary">{topic.assessments.slice(0, 3).map((assessment, index) => <article key={`${assessment.completedAt}-${index}`}><strong>{assessment.assessmentType}: {Math.round(assessment.percentage)}%</strong><span>{assessment.markingSource === 'ai_estimated' ? `AI-estimated${assessment.markingConfidence ? ` · ${assessment.markingConfidence} confidence` : ''}` : assessment.markingSource.replace('_', ' ')}</span>{assessment.feedback?.nextStep ? <small>Next step: {assessment.feedback.nextStep}</small> : null}</article>)}</div> : null}</section> : null}
      <div className="lesson-next"><button onClick={() => setStage('examples')} type="button">Continue to worked examples →</button></div>
    </div> : null}

    {stage === 'examples' ? <div className="lesson-page card">
      <p className="eyebrow">Guided practice</p><h2>See how to work it through</h2>
      <article className="worked-example worked-example--large"><h3>{revision.workedExample.title}</h3><p className="question-prompt">{revision.workedExample.prompt}</p><ol>{revision.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="answer-box"><strong>Final answer:</strong> {revision.workedExample.answer}</p></article>
      <h2>Sample questions with answers</h2><div className="sample-question-list">{revision.writtenQuestions.map((question, index) => <article key={question.id}><div className="question-heading"><strong>Example {index + 1}</strong><span>{question.marks} marks</span></div><p>{question.question}</p><p className="answer-guidance">Aim for {question.expectedLength.toLowerCase()} · about {question.suggestedMinutes} minutes</p><p className="hint-box"><strong>How to start:</strong> {question.hint}</p><button className="secondary" onClick={() => setShownExemplars((state) => ({ ...state, [question.id]: !state[question.id] }))} type="button">{shownExemplars[question.id] ? `Hide ${question.canUpdateMastery ? 'exemplar' : 'marking guide'}` : `Show ${question.canUpdateMastery ? 'high-level exemplar' : 'marking guide'}`}</button>{shownExemplars[question.id] ? <div className="exemplar-panel"><p className="answer-box"><strong>{question.canUpdateMastery ? 'Exemplar answer:' : 'Marking guide:'}</strong> {question.exemplar}</p><h3>{question.canUpdateMastery ? 'Why this is effective' : 'What a strong response must demonstrate'}</h3><ul>{question.exemplarAnnotations.map((annotation) => <li key={annotation.label}><strong>{annotation.label}:</strong> {annotation.explanation}</li>)}</ul></div> : null}</article>)}</div>
      {revision.resources.length ? <><h2>Extra help for this exact topic</h2><div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div></> : null}
      <div className="lesson-next"><button onClick={() => setStage('test')} type="button">I’m ready to test myself →</button></div>
    </div> : null}

    {stage === 'test' ? <div className="lesson-page card">
      <p className="eyebrow">Independent check</p><h2>Answer in the way that suits you</h2>
      {writtenQuestion ? <section className="written-practice" aria-labelledby="written-practice-heading"><div className="question-heading"><strong id="written-practice-heading">Written exam practice</strong><span>{writtenQuestion.marks} marks</span></div><p className="question-prompt">{writtenQuestion.question}</p><p className="answer-guidance">Aim for {writtenQuestion.expectedLength.toLowerCase()} · about {writtenQuestion.suggestedMinutes} minutes</p>
        {!writtenQuestion.canUpdateMastery ? <p className="fallback-notice">This is unscored starter practice. Feedback is for improvement and will not change mastery.</p> : null}
        <p className="assessment-hint">Choose how to answer: type below, or use handwritten work on your phone.</p>
        <label className="written-answer-label">Type your answer in the app<textarea onChange={(event) => { setWrittenAnswer(event.target.value); setWrittenMark(null); setWrittenSaved(false) }} placeholder="Write or paste your answer here…" rows={10} value={writtenAnswer} /></label>
        <div className="answer-divider"><span>or use handwritten work</span></div>
        {recordResults ? <PhoneHandoff topicId={topic.topicId} /> : null}
        <label className="photo-answer">Take or choose up to four clear photographs on this device<input accept="image/png,image/jpeg,image/webp,image/heic,image/heif" multiple onChange={(event) => void selectAnswerImages(event.target.files)} type="file" /></label>
        {answerImages.length ? <ul className="selected-images">{answerImages.map((image, index) => <li key={`${image.name}-${index}`}>Page {index + 1}: {image.name}</li>)}</ul> : null}
        {markingError ? <p className="error" role="alert">{markingError}</p> : null}
        {recordResults && revision.automaticMarkingAvailable ? <button disabled={marking || (!writtenAnswer.trim() && !answerImages.length)} onClick={() => void markWritten()} type="button">{marking ? 'Reading and marking…' : writtenMark ? 'Mark automatically again' : 'Mark automatically'}</button> : recordResults ? <p className="assessment-hint">One-tap marking is not connected. Use the free direct Gemini option below—no API key is needed.</p> : <p className="assessment-hint">Sign in as the student to save feedback to progress.</p>}
        <button className="secondary" onClick={() => { setExternalMarkingOpen((open) => !open); setExternalError(''); setPromptCopied(false) }} type="button">{externalMarkingOpen ? 'Hide Gemini instructions' : 'Mark with Gemini — no API key'}</button>
        {externalMarkingOpen ? <section className="external-marking" aria-labelledby="external-marking-heading"><h3 id="external-marking-heading">No-key Gemini marking</h3><p><strong>No setup or API key is required.</strong> Use your normal Gemini website or app:</p><ol><li>Select <strong>Copy marking prompt</strong> below.</li><li>Select <strong>Open Gemini</strong>, paste the prompt and send it. For handwritten work, take or attach the answer photographs in Gemini—not in this app.</li><li>Copy Gemini’s entire JSON reply, return here, paste it into the result box and select <strong>Import feedback</strong>.</li></ol><p className="assessment-hint">The QR above only moves this question to your phone. These three steps send the answer to Gemini for marking. No Gemini key is stored in this app; Gemini’s own account and usage limits apply.</p><div className="external-marking-actions"><button className="secondary" onClick={() => void copyExternalPrompt()} type="button">{promptCopied ? 'Prompt copied — now open Gemini' : '1. Copy marking prompt'}</button><a className="button-link" href="https://gemini.google.com/app" rel="noreferrer" target="_blank">2. Open Gemini ↗</a></div><label className="written-answer-label">Prepared prompt<textarea onFocus={(event) => event.currentTarget.select()} readOnly rows={8} value={externalPrompt} /></label><label className="written-answer-label">3. Paste Gemini’s complete JSON reply<textarea onChange={(event) => setExternalResult(event.target.value)} placeholder={'Paste the reply beginning with {"estimatedMark": …}'} rows={7} value={externalResult} /></label>{externalError ? <p className="error" role="alert">{externalError}</p> : null}<button disabled={!externalResult.trim()} onClick={importExternalResult} type="button">Import feedback</button></section> : null}
        {writtenMark ? <div className="written-feedback" aria-live="polite"><div className="result-hero"><div><strong>{writtenMark.estimatedMark}/{writtenMark.maximumMark}</strong><span>estimated</span></div><div><h2>{writtenMark.summary}</h2><p>Marking confidence: {writtenMark.confidence}</p></div></div><div className="feedback-columns"><section><h3>What worked</h3><ul>{writtenMark.strengths.map((strength, index) => <li key={`${strength.point}-${index}`}><strong>{strength.point}</strong>{strength.evidence ? <span> — “{strength.evidence}”</span> : null}</li>)}</ul></section><section><h3>How to improve</h3><ul>{writtenMark.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p className="next-step"><strong>Your next step:</strong> {writtenMark.nextStep}</p><details><summary>Check what the app read</summary><p className="transcription">{writtenMark.transcription}</p><small>If this is wrong, correct the answer above and choose “Mark corrected answer”.</small></details>{writtenQuestion.canUpdateMastery && writtenMark.confidence !== 'low' ? <button disabled={saving || writtenSaved} onClick={() => void saveWrittenResult()} type="button">{writtenSaved ? 'Estimated result saved' : saving ? 'Saving…' : 'Save estimated result'}</button> : <p className="assessment-hint">This feedback is not being added to mastery{writtenMark.confidence === 'low' ? ' because the marking confidence is low' : ''}.</p>}</div> : null}
      </section> : null}
      {revision.testQuestions.length ? <><h2>Quick knowledge check</h2><p className="lesson-lead">These reviewed questions are marked automatically{recordResults ? ' and saved to progress' : ''}.</p><div className="auto-test">{revision.testQuestions.map((question, index) => <fieldset key={question.id}><legend><span>Question {index + 1}</span>{question.question} <small>{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</small></legend>{question.options.map((option, optionIndex) => <label className="answer-option" key={option}><input checked={answers[question.id] === optionIndex} name={question.id} onChange={() => setAnswers((state) => ({ ...state, [question.id]: optionIndex }))} type="radio" />{option}</label>)}</fieldset>)}</div><div className="lesson-next"><span>{Object.keys(answers).length} of {revision.testQuestions.length} answered</span><button disabled={Object.keys(answers).length !== revision.testQuestions.length} onClick={() => void finishTest()} type="button">Finish and mark check</button></div></> : <div className="lesson-next"><span>No generic quiz has been substituted for this topic.</span><button onClick={onBack} type="button">Finish session</button></div>}
    </div> : null}

    {stage === 'results' && result ? <div className="lesson-page card">
      <p className="eyebrow">Test complete</p><div className="result-hero"><div><strong>{result.score}/{result.maximum}</strong><span>{Math.round(result.score / result.maximum * 100)}%</span></div><div><h2>{result.score / result.maximum >= .75 ? 'Strong result' : result.score / result.maximum >= .5 ? 'Good start—review the feedback' : 'Review the examples and try again'}</h2><p>{recordResults ? (saving ? 'Saving this result to your progress…' : 'This result has been saved to mastery and will influence your revision plan.') : 'This is a read-only preview, so the result has not been added to Student progress.'}</p></div></div>
      <h2>Answer review</h2><div className="answer-review">{revision.testQuestions.map((question, index) => { const correct = answers[question.id] === question.correctOption; return <article className={correct ? 'answer-review--correct' : 'answer-review--wrong'} key={question.id}><strong>Question {index + 1}: {correct ? 'Correct' : 'Not quite'}</strong><p>Your answer: {question.options[answers[question.id] ?? -1] ?? 'No answer'}</p>{!correct ? <p>Correct answer: {question.options[question.correctOption]}</p> : null}<small>{question.explanation}</small></article> })}</div>
      <h2>Continue with this exact topic</h2>{revision.resources.length ? <div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div> : <p>No direct topic resources have been added yet.</p>}
      <div className="lesson-next"><button className="secondary" onClick={() => { setAnswers({}); setResult(null); setStage('overview') }} type="button">Repeat session</button><button onClick={onBack} type="button">Finish session</button></div>
    </div> : null}
  </section>
}
