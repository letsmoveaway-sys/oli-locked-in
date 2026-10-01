import { useEffect, useMemo, useState } from 'react'
import type { TopicDetail, TopicRevision, WrittenMark } from '../types'
import { markWrittenResponse } from '../services/api'
import { buildExternalMarkingPrompt, parseExternalMarkingResult, shareAnswerForMarking } from '../services/externalMarking'
import { PhoneHandoff } from './PhoneHandoff'

type Stage = 'overview' | 'examples' | 'test' | 'results'

interface LearningSessionProps {
  topic: TopicDetail
  revision: TopicRevision
  onBack: () => void
  onResult: (topicId: string, score: number, maximumScore: number, evidence?: { assessmentType: string; markingSource: 'auto_marked' | 'ai_estimated'; markingConfidence?: 'low' | 'medium' | 'high'; feedback?: { summary?: string; nextStep?: string }; evidenceToken?: string }) => Promise<void>
  onKnowledgeCheck?: (topicId: string, answers: Record<string, number>) => Promise<{ score: number; maximumScore: number }>
  recordResults: boolean
  reviewMode?: boolean
}

const stages: Array<{ id: Stage; label: string }> = [
  { id: 'overview', label: '1. Learn' }, { id: 'examples', label: '2. Worked examples' },
  { id: 'test', label: '3. Test yourself' }, { id: 'results', label: '4. Results' },
]

function dataUrlFor(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read that photograph.'))
    reader.readAsDataURL(blob)
  })
}

async function privacySafeImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return dataUrlFor(file)
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .82))
    return compressed ? dataUrlFor(compressed) : dataUrlFor(file)
  } finally { bitmap.close() }
}

export function LearningSession({ topic, revision, onBack, onResult, onKnowledgeCheck, recordResults, reviewMode = false }: LearningSessionProps) {
  const draftKey = `gcse-revision-draft:${topic.topicId}`
  const [stage, setStage] = useState<Stage>(() => {
    if (new URLSearchParams(window.location.search).get('stage') === 'test') return 'test'
    const saved = localStorage.getItem(`${draftKey}:stage`)
    return saved === 'overview' || saved === 'examples' || saved === 'test' ? saved : 'overview'
  })
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(`${draftKey}:answers`) ?? '{}') as Record<string, number> } catch { return {} }
  })
  const [result, setResult] = useState<{ score: number; maximum: number } | null>(null)
  const [resultSaveState, setResultSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [saving, setSaving] = useState(false)
  const [writtenAnswer, setWrittenAnswer] = useState(() => localStorage.getItem(`${draftKey}:written`) ?? '')
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
  const [shareStatus, setShareStatus] = useState('')
  const [markingRoute, setMarkingRoute] = useState<'automatic' | 'external'>('automatic')
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const maximum = useMemo(() => revision.testQuestions.reduce((sum, question) => sum + question.marks, 0), [revision.testQuestions])
  const isMaths = topic.subjectId === 'subject-mathematics'
  const writtenQuestion = revision.writtenQuestions.at(-1)
  const exampleQuestions = revision.writtenQuestions.length > 1 ? revision.writtenQuestions.slice(0, -1) : revision.writtenQuestions
  const externalPrompt = useMemo(() => writtenQuestion ? buildExternalMarkingPrompt(writtenQuestion, writtenAnswer) : '', [writtenQuestion, writtenAnswer])

  useEffect(() => {
    if (!recordResults) return
    localStorage.setItem(`${draftKey}:stage`, stage)
    localStorage.setItem(`${draftKey}:answers`, JSON.stringify(answers))
    localStorage.setItem(`${draftKey}:written`, writtenAnswer)
  }, [answers, draftKey, recordResults, stage, writtenAnswer])

  useEffect(() => {
    if (!timerRunning) return
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  const timerLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`

  async function saveKnowledgeCheck(score: number) {
    if (!recordResults) return
    setResultSaveState('saving'); setSaving(true)
    try {
      if (onKnowledgeCheck) {
        const saved = await onKnowledgeCheck(topic.topicId, answers)
        setResult({ score: saved.score, maximum: saved.maximumScore })
      } else {
        await onResult(topic.topicId, score, maximum, { assessmentType: 'In-app knowledge check', markingSource: 'auto_marked', markingConfidence: 'high' })
      }
      setResultSaveState('saved')
      localStorage.removeItem(`${draftKey}:answers`)
      localStorage.removeItem(`${draftKey}:stage`)
    } catch {
      setResultSaveState('failed')
    } finally { setSaving(false) }
  }

  async function finishTest() {
    const score = revision.testQuestions.reduce((sum, question) => sum + (answers[question.id] === question.correctOption ? question.marks : 0), 0)
    setResult({ score, maximum }); setStage('results'); setResultSaveState(recordResults ? 'saving' : 'idle')
    await saveKnowledgeCheck(score)
  }

  async function selectAnswerImages(files: FileList | null) {
    setMarkingError(''); setWrittenMark(null); setWrittenSaved(false)
    const selected = Array.from(files ?? []).slice(0, 4)
    if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
      setMarkingError('Each photograph must be smaller than 8 MB.'); return
    }
    const loaded = await Promise.all(selected.map(async (file) => ({ name: file.name, dataUrl: await privacySafeImage(file) })))
    setAnswerImages(loaded)
    if (loaded.length && !revision.automaticMarkingAvailable) setExternalMarkingOpen(true)
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

  async function shareWithGemini() {
    setExternalError(''); setShareStatus('')
    try {
      await shareAnswerForMarking(externalPrompt, answerImages)
      setShareStatus('Shared. Choose Gemini, send the message, then copy its complete JSON reply back into the box below.')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setExternalError('This device cannot share the answer files directly. Use the manual copy-and-open option below.')
    }
  }

  async function saveWrittenResult() {
    if (!writtenQuestion || !writtenMark || !writtenQuestion.canUpdateMastery || writtenMark.confidence === 'low') return
    setSaving(true)
    try { await onResult(topic.topicId, writtenMark.estimatedMark, writtenMark.maximumMark, { assessmentType: 'AI-estimated written answer', markingSource: 'ai_estimated', markingConfidence: writtenMark.confidence, feedback: { summary: writtenMark.summary, nextStep: writtenMark.nextStep }, evidenceToken: writtenMark.evidenceToken }); setWrittenSaved(true) }
    finally { setSaving(false) }
  }

  return <section className="learning-session" aria-labelledby="learning-session-heading">
    <header className="learning-session__header">
      <button className="secondary" onClick={onBack} type="button">← Back</button>
      <div><p className="eyebrow">{topic.subjectName} · Full revision session</p><h1 id="learning-session-heading">{topic.topicName}</h1></div>
      <div className="lesson-header-actions"><span className={`rag-label rag--${topic.ragStatus}`}>{topic.masteryScore === null ? 'Not checked yet' : `${Math.round(topic.masteryScore)}% mastery`}</span><div className="calm-timer"><span aria-label={`${Math.floor(elapsedSeconds / 60)} minutes ${elapsedSeconds % 60} seconds elapsed`} role="timer">{timerLabel}</span><button className="secondary" onClick={() => setTimerRunning((running) => !running)} type="button">{timerRunning ? 'Pause timer' : elapsedSeconds ? 'Resume timer' : 'Start timer'}</button>{elapsedSeconds ? <button className="text-button" onClick={() => { setTimerRunning(false); setElapsedSeconds(0) }} type="button">Reset</button> : null}<small>Optional · no countdown</small></div></div>
    </header>
    {reviewMode ? <p className="review-mode-notice" role="status"><strong>Review mode:</strong> revisit any content and practise freely. Nothing in this session will replace or change your saved test scores, mastery or completed-session record.</p> : null}
    <nav className="lesson-steps" aria-label="Revision session stages">{stages.map((item) => <button aria-current={stage === item.id ? 'step' : undefined} disabled={item.id === 'results' && !result} key={item.id} onClick={() => setStage(item.id)} type="button">{item.label}</button>)}</nav>

    {stage === 'overview' ? <div className="lesson-page card">
      <p className="eyebrow">Topic overview</p><h2>Understand the topic first</h2><p className="lesson-lead">{revision.summary}</p>
      <aside className={`content-trust content-trust--${revision.contentProvenance.reviewStatus}`}><strong>{revision.contentProvenance.reviewStatus === 'subject_expert_checked' ? 'Subject-expert checked content' : revision.contentProvenance.reviewStatus === 'editorial_checked' ? 'Original, topic-specific app practice' : 'Starter content'}</strong><span>Version {revision.contentProvenance.version}{revision.contentProvenance.reviewedAt ? ` · checked ${revision.contentProvenance.reviewedAt}` : ''}</span><small>{revision.contentProvenance.reviewStatus === 'editorial_checked' ? 'Checked for topic alignment and answer completeness; independent subject-teacher QA is still pending.' : revision.contentProvenance.reviewStatus === 'draft' ? 'Use the official course source for authoritative coverage. Draft work does not update mastery.' : `Reviewed by ${revision.contentProvenance.reviewer ?? 'a subject expert'}.`}</small>{revision.contentProvenance.sourceUrl ? <a href={revision.contentProvenance.sourceUrl} rel="noreferrer" target="_blank">Open official course source ↗</a> : null}</aside>
      {!revision.bespoke ? <p className="fallback-notice">{revision.assessmentAvailable ? <><strong>Topic-specific original practice is available.</strong> The overview is concise, but the question below has a worked answer and can contribute to mastery.</> : <><strong>Starter guidance only.</strong> Detailed assessment content is still being added for this topic. You can practise and request feedback, but this activity will not change mastery. Use the official topic resource below for authoritative coverage.</>}</p> : null}
      <div className="revision-columns"><section><h3>What you need to be able to do</h3><ul>{revision.learningObjectives.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Core revision notes</h3><ul>{revision.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <div className="revision-notes-grid"><section className="mistake-panel"><h3>Common mistakes to avoid</h3><ul>{revision.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="exam-use-panel"><h3>How to use this in the exam</h3><ul>{revision.examUse.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <section className="exam-tip-panel"><h3>Final answer checks</h3><ul>{revision.examTips.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {revision.resources.some((resource) => resource.provider === 'BBC Bitesize') ? <section><h3>Learn it another way</h3><div className="resource-grid">{revision.resources.filter((resource) => resource.provider === 'BBC Bitesize').map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>BBC Bitesize · lesson and examples</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div></section> : null}
      {topic.notes || topic.assessments.length || topic.sessions.length ? <section className="previous-evidence"><h3>Your previous work</h3>{topic.notes ? <p className="saved-notes">{topic.notes}</p> : null}<p>{topic.totalSessions} completed session{topic.totalSessions === 1 ? '' : 's'} · {topic.totalMinutes} minutes revised{topic.latestAssessment === null ? '' : ` · latest assessment ${Math.round(topic.latestAssessment)}%`}</p>{topic.assessments.length ? <div className="evidence-summary">{topic.assessments.slice(0, 3).map((assessment, index) => <article key={`${assessment.completedAt}-${index}`}><strong>{assessment.assessmentType}: {Math.round(assessment.percentage)}%</strong><span>{assessment.markingSource === 'ai_estimated' ? `AI-estimated${assessment.markingConfidence ? ` · ${assessment.markingConfidence} confidence` : ''}` : assessment.markingSource.replace('_', ' ')}</span>{assessment.feedback?.nextStep ? <small>Next step: {assessment.feedback.nextStep}</small> : null}</article>)}</div> : null}</section> : null}
      <div className="lesson-next"><button onClick={() => setStage('examples')} type="button">Continue to worked examples →</button></div>
    </div> : null}

    {stage === 'examples' ? <div className="lesson-page card">
      <p className="eyebrow">Guided practice</p><h2>See how to work it through</h2>
      <article className="worked-example worked-example--large"><h3>{revision.workedExample.title}</h3><p className="question-prompt">{revision.workedExample.prompt}</p><ol>{revision.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="answer-box"><strong>Final answer:</strong> {revision.workedExample.answer}</p></article>
      <h2>Practice ladder</h2><p className="lesson-lead">Start by recalling the essentials, then plan how to apply them. Finish with the independent exam-style task on the next step.</p><div className="sample-question-list">{exampleQuestions.map((question, index) => <article key={question.id}><div className="question-heading"><strong>{question.level === 'retrieval' ? '1 · Retrieve' : question.level === 'challenge' ? '2 · Apply and plan' : `Example ${index + 1}`}</strong><span>{question.marks} marks</span></div><p>{question.question}</p><p className="answer-guidance">Aim for {question.expectedLength.toLowerCase()} · about {question.suggestedMinutes} minutes</p><p className="hint-box"><strong>How to start:</strong> {question.hint}</p><button className="secondary" onClick={() => setShownExemplars((state) => ({ ...state, [question.id]: !state[question.id] }))} type="button">{shownExemplars[question.id] ? `Hide ${isMaths ? 'worked solution' : question.canUpdateMastery ? 'exemplar' : 'marking guide'}` : `Show ${isMaths ? 'worked solution' : question.canUpdateMastery ? 'high-level exemplar' : 'marking guide'}`}</button>{shownExemplars[question.id] ? <div className="exemplar-panel"><p className="answer-box"><strong>{isMaths ? 'Worked solution:' : question.canUpdateMastery ? 'Exemplar answer:' : 'Marking guide:'}</strong> {question.exemplar}</p><h3>{isMaths ? 'What earns the marks' : question.canUpdateMastery ? 'Why this is effective' : 'What a strong response must demonstrate'}</h3><ul>{question.exemplarAnnotations.map((annotation) => <li key={annotation.label}><strong>{annotation.label}:</strong> {annotation.explanation}</li>)}</ul></div> : null}</article>)}</div>
      {revision.resources.length ? <><h2>Extra help for this exact topic</h2><div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div></> : null}
      <div className="lesson-next"><button onClick={() => setStage('test')} type="button">I’m ready to test myself →</button></div>
    </div> : null}

    {stage === 'test' ? <div className="lesson-page card">
      <p className="eyebrow">Independent check</p><h2>Answer in the way that suits you</h2>
      {writtenQuestion ? <section className="written-practice" aria-labelledby="written-practice-heading"><div className="question-heading"><strong id="written-practice-heading">{isMaths ? 'Calculation practice' : 'Written exam practice'}</strong><span>{writtenQuestion.marks} marks</span></div><p className="question-prompt">{writtenQuestion.question}</p><p className="answer-guidance">Aim for {writtenQuestion.expectedLength.toLowerCase()} · about {writtenQuestion.suggestedMinutes} minutes</p>
        {!writtenQuestion.canUpdateMastery ? <p className="fallback-notice">This is unscored starter practice. Feedback is for improvement and will not change mastery.</p> : null}
        <p className="assessment-hint">{isMaths ? 'Show the calculation in the box, or work it out by hand and add a photograph.' : 'Choose how to answer: type below, or use handwritten work on your phone.'}</p>
        <label className="written-answer-label">{isMaths ? 'Enter your working and final answer' : 'Type your answer in the app'}<textarea onChange={(event) => { setWrittenAnswer(event.target.value); setWrittenMark(null); setWrittenSaved(false) }} placeholder={isMaths ? 'Show each step and include the final answer…' : 'Write or paste your answer here…'} rows={isMaths ? 5 : 10} value={writtenAnswer} /></label>
        {recordResults ? <><div className="answer-divider"><span>or continue on another device</span></div><PhoneHandoff topicId={topic.topicId} /></> : null}
        {revision.aiMarkingAllowed ? <><div className="answer-divider"><span>or use handwritten work</span></div>
          <label className="photo-answer">Take or choose up to four clear photographs on this device<input accept="image/png,image/jpeg,image/webp,image/heic,image/heif" multiple onChange={(event) => void selectAnswerImages(event.target.files)} type="file" /></label>
          {answerImages.length ? <ul className="selected-images">{answerImages.map((image, index) => <li key={`${image.name}-${index}`}>Page {index + 1}: {image.name}</li>)}</ul> : null}</> : <p className="assessment-hint"><strong>AI marking is off.</strong> Use the worked exemplar and marking points to check this answer. A Parent can enable optional AI marking from the Parent dashboard.</p>}
        {markingError ? <p className="error" role="alert">{markingError}</p> : null}
        {recordResults && revision.aiMarkingAllowed ? <div className="privacy-choice"><p><strong>Before using AI marking:</strong> your typed answer or selected photographs will be sent to the chosen AI provider. Remove names, school details and unrelated personal information. Supported photographs are resized and re-encoded to remove embedded metadata before transfer. Provider account, retention and deletion terms apply.</p><label className="check-label"><input checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} type="checkbox" /> I understand and want to use optional AI marking for this answer.</label><p>You can skip AI and use the worked exemplar and marking points instead.</p></div> : null}
        {recordResults && revision.automaticMarkingAvailable ? <button disabled={!privacyConfirmed || marking || (!writtenAnswer.trim() && !answerImages.length)} onClick={() => void markWritten()} type="button">{marking ? 'Reading and marking…' : writtenMark ? 'Mark automatically again' : 'Mark automatically'}</button> : recordResults && revision.aiMarkingAllowed ? <p className="assessment-hint">One-tap marking is not connected. You can self-check above or optionally use the direct Gemini route below.</p> : !recordResults ? <p className="assessment-hint">Sign in as the student to save feedback to progress.</p> : null}
        {revision.aiMarkingAllowed ? <button className="secondary" onClick={() => { setExternalMarkingOpen((open) => !open); setExternalError(''); setPromptCopied(false) }} type="button">{externalMarkingOpen ? 'Hide Gemini instructions' : 'Mark with Gemini — no API key'}</button> : null}
        {externalMarkingOpen ? <section className="external-marking" aria-labelledby="external-marking-heading"><h3 id="external-marking-heading">Optional Gemini marking</h3><p><strong>No setup or API key is required, but this sends the answer outside this app.</strong></p><section className="share-marking"><h4>Fastest on a phone</h4><ol><li>Remove any names, school details or unrelated personal information.</li><li>Select <strong>Share photo and prompt</strong>, then choose Gemini from the phone’s share sheet.</li><li>Send the shared message in Gemini. Copy its complete JSON reply and paste it below.</li></ol><button disabled={!privacyConfirmed || (!answerImages.length && !writtenAnswer.trim())} onClick={() => void shareWithGemini()} type="button">Share {answerImages.length ? `${answerImages.length} photo${answerImages.length === 1 ? '' : 's'}` : 'typed answer'} and prompt</button>{!privacyConfirmed ? <p className="assessment-hint">Confirm the AI privacy choice above before sharing.</p> : null}{!answerImages.length && !writtenAnswer.trim() ? <p className="assessment-hint">Add a typed answer or photograph first.</p> : null}{shareStatus ? <p className="success" role="status">{shareStatus}</p> : null}<p className="security-note">The photographs stay on this device until you choose an external app from the share sheet.</p></section><div className="answer-divider"><span>manual fallback</span></div><ol><li>Select <strong>Copy marking prompt</strong>.</li><li>Open Gemini, paste the prompt and attach the photographs there.</li><li>Copy Gemini’s entire JSON reply and paste it below.</li></ol><p className="assessment-hint">Gemini’s own account, retention and deletion terms apply.</p><div className="external-marking-actions"><button className="secondary" disabled={!privacyConfirmed} onClick={() => void copyExternalPrompt()} type="button">{promptCopied ? 'Prompt copied — now open Gemini' : 'Copy marking prompt'}</button>{privacyConfirmed ? <a className="button-link" href="https://gemini.google.com/app" rel="noreferrer" target="_blank">Open Gemini ↗</a> : null}</div><label className="written-answer-label">Prepared prompt<textarea onFocus={(event) => event.currentTarget.select()} readOnly rows={8} value={externalPrompt} /></label><label className="written-answer-label">Paste Gemini’s complete JSON reply<textarea onChange={(event) => setExternalResult(event.target.value)} placeholder={'Paste the reply beginning with {"estimatedMark": …}'} rows={7} value={externalResult} /></label>{externalError ? <p className="error" role="alert">{externalError}</p> : null}<button disabled={!externalResult.trim()} onClick={importExternalResult} type="button">Import feedback</button></section> : null}
        {writtenMark ? <div className="written-feedback" aria-live="polite"><div className="result-hero"><div><strong>{writtenMark.estimatedMark}/{writtenMark.maximumMark}</strong><span>estimated</span></div><div><h2>{writtenMark.summary}</h2><p>Marking confidence: {writtenMark.confidence}</p></div></div><div className="feedback-columns"><section><h3>What worked</h3><ul>{writtenMark.strengths.map((strength, index) => <li key={`${strength.point}-${index}`}><strong>{strength.point}</strong>{strength.evidence ? <span> — “{strength.evidence}”</span> : null}</li>)}</ul></section><section><h3>How to improve</h3><ul>{writtenMark.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p className="next-step"><strong>Your next step:</strong> {writtenMark.nextStep}</p><details><summary>Check what the app read</summary><p className="transcription">{writtenMark.transcription}</p><small>If this is wrong, correct the answer above and choose “Mark corrected answer”.</small></details>{writtenQuestion.canUpdateMastery && writtenMark.confidence !== 'low' && writtenMark.evidenceToken ? <button disabled={saving || writtenSaved} onClick={() => void saveWrittenResult()} type="button">{writtenSaved ? 'Estimated result saved' : saving ? 'Saving…' : 'Save estimated result'}</button> : <p className="assessment-hint">This feedback is not being added to mastery{writtenMark.confidence === 'low' ? ' because the marking confidence is low' : markingRoute === 'external' ? ' because an externally pasted result cannot be verified by the app' : ''}.</p>}</div> : null}
      </section> : null}
      {revision.testQuestions.length ? <><h2>Quick knowledge check</h2><p className="lesson-lead">These original app questions are marked automatically{recordResults ? ' and saved to progress' : ''}. They are not past-paper questions.</p><div className="auto-test">{revision.testQuestions.map((question, index) => <fieldset key={question.id}><legend><span>Question {index + 1}</span>{question.question} <small>{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</small></legend>{question.options.map((option, optionIndex) => <label className="answer-option" key={option}><input checked={answers[question.id] === optionIndex} name={question.id} onChange={() => setAnswers((state) => ({ ...state, [question.id]: optionIndex }))} type="radio" />{option}</label>)}</fieldset>)}</div><div className="lesson-next"><span>{Object.keys(answers).length} of {revision.testQuestions.length} answered</span><button disabled={Object.keys(answers).length !== revision.testQuestions.length} onClick={() => void finishTest()} type="button">Finish and mark check</button></div></> : <div className="lesson-next"><span>No generic quiz has been substituted for this topic.</span><button onClick={onBack} type="button">Finish session</button></div>}
    </div> : null}

    {stage === 'results' && result ? <div className="lesson-page card">
      <p className="eyebrow">Test complete</p><div className="result-hero"><div><strong>{result.score}/{result.maximum}</strong><span>{Math.round(result.score / result.maximum * 100)}%</span></div><div><h2>{result.score / result.maximum >= .75 ? 'Strong result' : result.score / result.maximum >= .5 ? 'Good start—review the feedback' : 'Review the examples and try again'}</h2><p>{!recordResults ? 'This is a read-only preview, so the result has not been added to Student progress.' : resultSaveState === 'saving' ? 'Saving this result to your progress…' : resultSaveState === 'saved' ? 'This result has been saved and will influence your revision plan.' : 'Your result is calculated, but it has not been saved yet.'}</p>{resultSaveState === 'failed' ? <button onClick={() => void saveKnowledgeCheck(result.score)} type="button">Retry saving result</button> : null}</div></div>
      <h2>Answer review</h2><div className="answer-review">{revision.testQuestions.map((question, index) => { const correct = answers[question.id] === question.correctOption; return <article className={correct ? 'answer-review--correct' : 'answer-review--wrong'} key={question.id}><strong>Question {index + 1}: {correct ? 'Correct' : 'Not quite'}</strong><p>Your answer: {question.options[answers[question.id] ?? -1] ?? 'No answer'}</p>{!correct ? <p>Correct answer: {question.options[question.correctOption]}</p> : null}<small>{question.explanation}</small></article> })}</div>
      <h2>Continue with this exact topic</h2>{revision.resources.length ? <div className="resource-grid">{revision.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}</div> : <p>No direct topic resources have been added yet.</p>}
      <div className="lesson-next"><button className="secondary" onClick={() => { setAnswers({}); setResult(null); setStage('overview') }} type="button">Repeat session</button><button onClick={onBack} type="button">Finish session</button></div>
    </div> : null}
  </section>
}
