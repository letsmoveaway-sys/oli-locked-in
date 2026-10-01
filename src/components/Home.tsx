import { useEffect, useRef, useState } from 'react'
import {
  addAvailabilityException, completeSession, exportStudentData, generatePlan, getAnalytics, getAvailability, getPlan, getProgress, getSubjectRevision, getSubjects, getTopicDetail, getTopicRevision,
  recordAssessment, recordKnowledgeCheck, replan, resetPocProgress, reviseNow, saveAvailability as saveAvailabilityRequest, saveExam as saveExamRequest, setAiMarkingPreference, setSessionStatus, setWeeklyGoal, startSession, updateConfidence, updateCourse,
} from '../services/api'
import type { Analytics, Confidence, CourseSubject, PlanSession, SessionCompletionInput, SessionUser, SubjectRevisionGuide, TopicDetail, TopicProgress, TopicRevision, WeeklyAvailability } from '../types'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { CalendarDashboard, type ExamValues } from './CalendarDashboard'
import { CourseSetup, type CourseValues } from './CourseSetup'
import { PlanDashboard } from './PlanDashboard'
import { ProgressDashboard } from './ProgressDashboard'
import { SubjectBrowser } from './SubjectBrowser'
import { SubjectPreview } from './SubjectPreview'
import { TodayDashboard } from './TodayDashboard'
import { WeeklyPlanner } from './WeeklyPlanner'
import { GamificationCard } from './GamificationCard'
import { ParentDashboard } from './ParentDashboard'
import { RevisionSubjectGuide } from './RevisionSubjectGuide'
import { LearningSession } from './LearningSession'
import { PrivacyNotice } from './PrivacyNotice'
import type { CannotDoReason } from './CannotDoDialog'

interface HomeProps { user: SessionUser; onSignOut: () => Promise<void> }
type View = 'today' | 'week' | 'subjects' | 'progress' | 'analytics' | 'calendar' | 'parent' | 'plan' | 'courses' | 'content' | 'privacy' | 'lesson'

const studentViews: View[] = ['today', 'week', 'subjects', 'progress', 'analytics', 'calendar', 'plan', 'courses', 'content', 'privacy', 'lesson']
const parentViews: View[] = ['parent', 'today', 'subjects', 'progress', 'analytics', 'calendar', 'plan', 'courses', 'privacy', 'lesson']

function routedView(role: SessionUser['role']): View {
  const requested = new URL(window.location.href).searchParams.get('view') as View | null
  const allowed = role === 'student' ? studentViews : parentViews
  return requested && allowed.includes(requested) ? requested : role === 'student' ? 'today' : 'parent'
}

export function Home({ user, onSignOut }: HomeProps) {
  const [subjects, setSubjects] = useState<CourseSubject[]>([])
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [plan, setPlan] = useState<PlanSession[]>([])
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [view, setView] = useState<View>(() => routedView(user.role))
  const [previousView, setPreviousView] = useState<View>(user.role === 'student' ? 'today' : 'parent')
  const [selectedSubjectId, setSelectedSubjectId] = useState('subject-history')
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null)
  const [topicRevision, setTopicRevision] = useState<TopicRevision | null>(null)
  const [lessonReadOnly, setLessonReadOnly] = useState(false)
  const [topicLoading, setTopicLoading] = useState(() => routedView(user.role) === 'lesson')
  const [subjectGuide, setSubjectGuide] = useState<SubjectRevisionGuide | null>(null)
  const [guideLoading, setGuideLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const phoneHandoffOpened = useRef(false)

  async function loadDashboard() {
    setLoading(true); setError('')
    const results = await Promise.allSettled([
      getSubjects().then(setSubjects),
      getProgress().then(setProgress),
      getPlan().then(setPlan),
      getAvailability().then(setAvailability),
      getAnalytics().then(setAnalytics),
    ])
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) setError(`${failures.length === results.length ? 'Your dashboard could not be loaded.' : 'Some dashboard sections could not be refreshed.'} Check your connection and try again.`)
    setLoading(false)
  }

  useEffect(() => { void loadDashboard() }, [])

  useEffect(() => {
    if (view !== 'content' || !selectedSubjectId) return
    setGuideLoading(true); setSubjectGuide(null)
    void getSubjectRevision(selectedSubjectId)
      .then(setSubjectGuide)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load exam guidance.'))
      .finally(() => setGuideLoading(false))
  }, [view, selectedSubjectId])

  async function saveCourse(subject: CourseSubject, values: CourseValues) {
    setError(''); setMessage('')
    try {
      const updated = await updateCourse({ subjectId: subject.id, active: values.active, tier: values.tier, currentGrade: values.currentGrade || null, targetGrade: values.targetGrade || null, options: values.options })
      setSubjects(updated); setMessage(`${subject.name} configuration saved.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the course.') }
  }

  async function saveConfidence(topicId: string, confidence: Confidence) {
    setError('')
    try { setProgress(await updateConfidence(topicId, confidence)); setAnalytics(await getAnalytics()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save confidence.'); throw caught }
  }

  async function saveAssessment(topicId: string, score: number, maximumScore: number, evidence: Parameters<typeof recordAssessment>[3] = {}) {
    setError('')
    try { setProgress(await recordAssessment(topicId, score, maximumScore, evidence)); setAnalytics(await getAnalytics()); setMessage('Assessment result recorded and mastery recalculated.') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record the assessment.'); throw caught }
  }

  async function buildPlan() {
    setError('')
    try { const result = await generatePlan(); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate the plan.') }
  }

  async function changeSessionStatus(sessionId: string, reason: CannotDoReason, status: 'rescheduled' | 'skipped') {
    setError('')
    try { const result = await setSessionStatus(sessionId, status, null, reason); setPlan(result.sessions); setProgress(await getProgress()); setAnalytics(await getAnalytics()); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update the session.') }
  }

  async function finishSession(input: SessionCompletionInput) {
    setError('')
    try { const result = await completeSession(input); setPlan(result.sessions); setProgress(await getProgress()); setAnalytics(await getAnalytics()); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to complete the session.'); throw caught }
  }

  async function requestReplan() {
    setError('')
    try { const result = await replan('Student requested a weekly replan'); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to replan.') }
  }

  async function loadTopic(topicId: string, readOnly = false) {
    setLessonReadOnly(readOnly); setView('lesson'); setTopicLoading(true); setTopicDetail(null); setTopicRevision(null)
    try { const [detail, revision] = await Promise.all([getTopicDetail(topicId), getTopicRevision(topicId)]); setTopicDetail(detail); setTopicRevision(revision) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load the topic.') }
    finally { setTopicLoading(false) }
  }

  async function openTopic(topicId: string, readOnly = false) {
    if (view !== 'lesson') setPreviousView(view)
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'lesson'); url.searchParams.set('topic', topicId); url.searchParams.set('from', view === 'lesson' ? previousView : view)
    if (readOnly) url.searchParams.set('review', '1'); else url.searchParams.delete('review')
    window.history.pushState({ gcseRoute: true }, '', url)
    await loadTopic(topicId, readOnly)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const topicId = params.get('view') === 'lesson' || params.get('handoff') === 'phone' ? params.get('topic') ?? '' : ''
    if (!/^[a-z0-9-]{1,100}$/.test(topicId)) return
    phoneHandoffOpened.current = true
    void loadTopic(topicId, params.get('review') === '1')
  }, [])

  useEffect(() => {
    function restoreRoute() {
      const next = routedView(user.role)
      const params = new URL(window.location.href).searchParams
      const topicId = params.get('topic') ?? ''
      if (next === 'lesson' && /^[a-z0-9-]{1,100}$/.test(topicId)) {
        const from = params.get('from') as View | null
        if (from && from !== 'lesson') setPreviousView(from)
        void loadTopic(topicId, params.get('review') === '1')
        return
      }
      setTopicDetail(null); setTopicRevision(null); setTopicLoading(false); setLessonReadOnly(false); setView(next)
    }
    window.addEventListener('popstate', restoreRoute)
    return () => window.removeEventListener('popstate', restoreRoute)
  }, [user.role])

  async function assessFromTopic(topicId: string, score: number, maximumScore: number, evidence?: Parameters<typeof recordAssessment>[3]) {
    await saveAssessment(topicId, score, maximumScore, evidence); setTopicDetail(await getTopicDetail(topicId))
  }

  async function saveKnowledgeCheck(topicId: string, answers: Record<string, number>) {
    setError('')
    try {
      const result = await recordKnowledgeCheck(topicId, answers)
      setProgress(result.topics); setAnalytics(await getAnalytics()); setMessage('Knowledge check saved and your plan updated.')
      return { score: result.score, maximumScore: result.maximumScore }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the knowledge check.'); throw caught }
  }

  async function startRevisionNow(topicId: string) {
    const result = await reviseNow(topicId, 10)
    setPlan(result.sessions); setMessage(result.message); setTopicDetail(null); setTopicRevision(null); navigate('today')
  }

  async function beginPlannedSession(sessionId: string, topicId: string) {
    setError('')
    try {
      const result = await startSession(sessionId)
      setPlan(result.sessions); setMessage(result.message)
      await openTopic(topicId)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to start revision.') }
  }

  async function beginQuickRevision(topicId: string, plannedMinutes: number) {
    setError('')
    try {
      const result = await reviseNow(topicId, plannedMinutes)
      setPlan(result.sessions); setMessage(result.message)
      await openTopic(topicId)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to start quick revision.') }
  }

  async function saveWeeklyGoal(minutes: number) {
    const result = await setWeeklyGoal(minutes); setAnalytics(result.analytics); setMessage(result.message)
  }

  async function resetTrialProgress(confirmation: string) {
    setError(''); setMessage('')
    try {
      const result = await resetPocProgress(confirmation)
      const [loadedProgress, loadedPlan, loadedAnalytics] = await Promise.all([getProgress(), getPlan(), getAnalytics()])
      setProgress(loadedProgress); setPlan(loadedPlan); setAnalytics(loadedAnalytics); setMessage(result.message)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to reset trial progress.'); throw caught }
  }

  async function downloadStudentData() {
    setError('')
    try {
      const data = await exportStudentData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url; link.download = `gcse-revision-export-${new Date().toISOString().slice(0, 10)}.json`; link.click()
      URL.revokeObjectURL(url)
      setMessage('Student data export downloaded.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to export Student data.') }
  }

  async function saveException(input: { startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectStreak: boolean }) {
    try { const result = await addAvailabilityException(input); setPlan(result.sessions); setAnalytics(await getAnalytics()); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the calendar exception.'); throw caught }
  }

  async function saveExam(input: ExamValues) {
    setError('')
    try {
      const result = await saveExamRequest(input)
      setAnalytics(result.analytics); setPlan(result.sessions); setMessage(result.message)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the examination date.'); throw caught }
  }

  async function changeAiMarkingPreference(enabled: boolean) {
    setError('')
    try { const result = await setAiMarkingPreference(enabled); setAnalytics(result.analytics); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update the AI marking preference.'); throw caught }
  }

  async function saveWeeklyAvailability(values: WeeklyAvailability[]) {
    setError('')
    try { setAvailability(await saveAvailabilityRequest(values)); const result = await replan('Weekly availability changed'); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save availability.') }
  }

  function closeLesson() {
    const url = new URL(window.location.href)
    if (url.searchParams.get('handoff') === 'phone') {
      url.searchParams.delete('topic'); url.searchParams.delete('stage'); url.searchParams.delete('handoff')
      window.history.replaceState({}, '', url)
    }
    setTopicDetail(null); setTopicRevision(null); setTopicLoading(false); setLessonReadOnly(false)
    const fallback = previousView === 'lesson' ? 'content' : previousView
    if (window.history.state?.gcseRoute) window.history.back()
    else navigate(fallback, 'replace')
  }

  function navigate(next: View, method: 'push' | 'replace' = 'push') {
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    url.searchParams.delete('topic'); url.searchParams.delete('review'); url.searchParams.delete('from'); url.searchParams.delete('handoff'); url.searchParams.delete('stage')
    window.history[method === 'push' ? 'pushState' : 'replaceState']({ gcseRoute: true }, '', url)
    setView(next)
    setMoreOpen(false)
  }

  if (view === 'lesson') return <main className="app-shell learning-shell" id="main-content">
    {topicLoading ? <div className="lesson-loading card"><p className="loading-inline">Preparing your revision session…</p></div> : null}
    {!topicLoading && topicDetail && topicRevision ? <LearningSession onBack={closeLesson} onKnowledgeCheck={saveKnowledgeCheck} onResult={assessFromTopic} onReviseNow={startRevisionNow} recordResults={user.role === 'student' && !lessonReadOnly} reviewMode={lessonReadOnly} revision={topicRevision} topic={topicDetail} /> : null}
    {!topicLoading && (!topicDetail || !topicRevision) ? <div className="card"><p className="error">The revision session could not be loaded.</p><button onClick={closeLesson} type="button">Back to the course</button></div> : null}
  </main>

  return (
    <main className="app-shell" id="main-content">
      <a className="skip-link" href="#primary-navigation">Skip to navigation</a>
      <header className="topbar"><div><p className="eyebrow">Oli: Locked In</p><p className="identity">{user.displayName} · {user.role}</p></div>{user.role === 'parent' ? <button className="secondary" onClick={() => void onSignOut()} type="button">Sign out</button> : null}</header>
      {user.role === 'student' ? <>
        <nav className="view-tabs view-tabs--student" aria-label="Main views" id="primary-navigation">
          <button aria-pressed={view === 'today'} onClick={() => navigate('today')} type="button">Today</button>
          <button aria-pressed={view === 'content' || view === 'subjects'} onClick={() => navigate('content')} type="button">Learn</button>
          <button aria-pressed={view === 'progress'} onClick={() => navigate('progress')} type="button">Progress</button>
          <button aria-pressed={view === 'week' || view === 'plan'} onClick={() => navigate('week')} type="button">Plan</button>
          <button aria-expanded={moreOpen} aria-pressed={moreOpen || ['analytics', 'calendar', 'courses'].includes(view)} onClick={() => setMoreOpen((open) => !open)} type="button">More</button>
        </nav>
        {moreOpen ? <nav className="more-menu card" aria-label="More views">
          <button className="secondary" onClick={() => navigate('analytics')} type="button">Analytics</button>
          <button className="secondary" onClick={() => navigate('calendar')} type="button">Calendar</button>
          <button className="secondary" onClick={() => navigate('subjects')} type="button">Subject overview</button>
          <button className="secondary" onClick={() => navigate('plan')} type="button">14-day plan</button>
          <button className="secondary" onClick={() => navigate('courses')} type="button">Course information</button>
          <button className="secondary" onClick={() => navigate('privacy')} type="button">Privacy and data</button>
          <button className="secondary" onClick={() => void onSignOut()} type="button">Sign out</button>
        </nav> : null}
      </> : <nav className="view-tabs" aria-label="Parent views" id="primary-navigation">
        <button aria-pressed={view === 'parent'} onClick={() => navigate('parent')} type="button">Parent dashboard</button>
        <button aria-pressed={view === 'today'} onClick={() => navigate('today')} type="button">Today</button>
        <button aria-pressed={view === 'progress'} onClick={() => navigate('progress')} type="button">Progress</button>
        <button aria-pressed={view === 'calendar'} onClick={() => navigate('calendar')} type="button">Calendar</button>
        <button aria-pressed={view === 'plan'} onClick={() => navigate('plan')} type="button">Plan</button>
        <button aria-pressed={view === 'courses'} onClick={() => navigate('courses')} type="button">Course setup</button>
        <button aria-pressed={view === 'privacy'} onClick={() => navigate('privacy')} type="button">Privacy</button>
      </nav>}
      {message ? <p className="success" role="status">{message}</p> : null}{error ? <div className="error error-with-action" role="alert"><span>{error}</span><button className="secondary" onClick={() => void loadDashboard()} type="button">Retry dashboard</button></div> : null}{loading ? <p className="loading-inline">Loading course data…</p> : null}
      {!loading && view === 'parent' && analytics ? <ParentDashboard analytics={analytics} onAiMarking={changeAiMarkingPreference} onExport={downloadStudentData} onNavigate={(next) => navigate(next)} onResetProgress={resetTrialProgress} /> : null}
      {!loading && view === 'today' ? <><TodayDashboard analytics={analytics} sessions={plan} topics={progress} editable={user.role === 'student'} onComplete={finishSession} onCannotDo={changeSessionStatus} onQuickRevision={beginQuickRevision} onReviewTopic={(id) => void openTopic(id, true)} onStart={beginPlannedSession} onViewTopic={(id) => void openTopic(id)} onOpenWeek={() => navigate('week')} />{analytics ? <GamificationCard data={analytics.gamification} editable={user.role === 'student'} onGoal={saveWeeklyGoal} /> : null}</> : null}
      {!loading && view === 'week' ? <WeeklyPlanner editable={user.role === 'student'} sessions={plan} topics={progress} onComplete={finishSession} onMove={changeSessionStatus} onReplan={requestReplan} onReviewTopic={(id) => void openTopic(id, true)} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'subjects' ? <SubjectBrowser analytics={analytics} subjects={subjects} topics={progress} sessions={plan} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'plan' ? <PlanDashboard availability={availability} onAvailability={saveWeeklyAvailability} onCannotDo={changeSessionStatus} onComplete={finishSession} onGenerate={buildPlan} onReviewTopic={(id) => void openTopic(id, true)} onViewTopic={(id) => void openTopic(id)} sessions={plan} studentMode={user.role === 'student'} /> : null}
      {!loading && view === 'progress' ? <ProgressDashboard editable={user.role === 'student'} onAssessment={saveAssessment} onConfidence={saveConfidence} onPractice={(id) => void openTopic(id)} topics={progress} /> : null}
      {!loading && view === 'analytics' && analytics ? <AnalyticsDashboard analytics={analytics} /> : null}
      {!loading && view === 'calendar' && analytics ? <CalendarDashboard analytics={analytics} availability={availability} editable={user.role === 'parent'} onException={saveException} onExam={saveExam} sessions={plan} subjects={subjects} /> : null}
      {!loading && view === 'content' ? <><div className="subject-tabs" aria-label="Choose a subject">{subjects.filter((subject) => subject.active).map((subject) => <button aria-pressed={selectedSubjectId === subject.id} key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} type="button">{subject.name}</button>)}</div><RevisionSubjectGuide examBoard={subjects.find((subject) => subject.id === selectedSubjectId)?.examBoard ?? 'exam-board'} guide={subjectGuide} loading={guideLoading} /><SubjectPreview onTopic={(id) => void openTopic(id)} subject={subjects.find((subject) => subject.id === selectedSubjectId)} /></> : null}
      {!loading && view === 'courses' ? <CourseSetup editable={user.role === 'parent'} onSave={saveCourse} subjects={subjects} /> : null}
      {!loading && view === 'privacy' ? <PrivacyNotice /> : null}
    </main>
  )
}
