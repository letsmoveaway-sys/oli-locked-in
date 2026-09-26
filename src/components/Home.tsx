import { useEffect, useRef, useState } from 'react'
import {
  addAvailabilityException, completeSession, generatePlan, getAnalytics, getAvailability, getPlan, getProgress, getSubjectRevision, getSubjects, getTopicDetail, getTopicRevision,
  recordAssessment, replan, resetPocProgress, reviseNow, saveAvailability as saveAvailabilityRequest, setSessionStatus, setWeeklyGoal, updateConfidence, updateCourse,
} from '../services/api'
import type { Analytics, Confidence, CourseSubject, PlanSession, SessionCompletionInput, SessionUser, SubjectRevisionGuide, TopicDetail, TopicProgress, TopicRevision, WeeklyAvailability } from '../types'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { CalendarDashboard } from './CalendarDashboard'
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

interface HomeProps { user: SessionUser; onSignOut: () => Promise<void> }
type View = 'today' | 'week' | 'subjects' | 'progress' | 'analytics' | 'calendar' | 'parent' | 'plan' | 'courses' | 'content' | 'lesson'

export function Home({ user, onSignOut }: HomeProps) {
  const [subjects, setSubjects] = useState<CourseSubject[]>([])
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [plan, setPlan] = useState<PlanSession[]>([])
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [view, setView] = useState<View>(user.role === 'student' ? 'today' : 'parent')
  const [previousView, setPreviousView] = useState<View>(user.role === 'student' ? 'today' : 'parent')
  const [selectedSubjectId, setSelectedSubjectId] = useState('subject-history')
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null)
  const [topicRevision, setTopicRevision] = useState<TopicRevision | null>(null)
  const [lessonReadOnly, setLessonReadOnly] = useState(false)
  const [topicLoading, setTopicLoading] = useState(false)
  const [subjectGuide, setSubjectGuide] = useState<SubjectRevisionGuide | null>(null)
  const [guideLoading, setGuideLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const phoneHandoffOpened = useRef(false)

  useEffect(() => {
    void Promise.all([getSubjects(), getProgress(), getPlan(), getAvailability(), getAnalytics()])
      .then(([loadedSubjects, loadedProgress, loadedPlan, loadedAvailability, loadedAnalytics]) => {
        setSubjects(loadedSubjects); setProgress(loadedProgress); setPlan(loadedPlan); setAvailability(loadedAvailability); setAnalytics(loadedAnalytics)
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load courses.'))
      .finally(() => setLoading(false))
  }, [])

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
      const updated = await updateCourse({ subjectId: subject.id, active: values.active, tier: values.tier, currentGrade: values.currentGrade || null, targetGrade: values.targetGrade || null, options: subject.options })
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
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record the assessment.') }
  }

  async function buildPlan() {
    setError('')
    try { const result = await generatePlan(); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate the plan.') }
  }

  async function changeSessionStatus(sessionId: string, status: 'completed' | 'rescheduled') {
    setError('')
    try { const result = await setSessionStatus(sessionId, status, null); setPlan(result.sessions); setProgress(await getProgress()); setAnalytics(await getAnalytics()); setMessage(result.message) }
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

  async function openTopic(topicId: string, readOnly = false) {
    if (view !== 'lesson') setPreviousView(view)
    setLessonReadOnly(readOnly); setView('lesson'); setTopicLoading(true); setTopicDetail(null); setTopicRevision(null)
    try { const [detail, revision] = await Promise.all([getTopicDetail(topicId), getTopicRevision(topicId)]); setTopicDetail(detail); setTopicRevision(revision) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load the topic.') }
    finally { setTopicLoading(false) }
  }

  useEffect(() => {
    if (phoneHandoffOpened.current) return
    const params = new URLSearchParams(window.location.search)
    const topicId = params.get('handoff') === 'phone' ? params.get('topic') ?? '' : ''
    if (!/^[a-z0-9-]{1,100}$/.test(topicId)) return
    phoneHandoffOpened.current = true
    void openTopic(topicId)
  }, [])

  async function assessFromTopic(topicId: string, score: number, maximumScore: number, evidence?: Parameters<typeof recordAssessment>[3]) {
    await saveAssessment(topicId, score, maximumScore, evidence); setTopicDetail(await getTopicDetail(topicId))
  }

  async function startRevisionNow(topicId: string) {
    const result = await reviseNow(topicId)
    setPlan(result.sessions); setMessage(result.message); setTopicDetail(null); setTopicRevision(null); setView('today')
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

  async function saveException(input: { startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectStreak: boolean }) {
    try { const result = await addAvailabilityException(input); setPlan(result.sessions); setAnalytics(await getAnalytics()); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the calendar exception.'); throw caught }
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
    setTopicDetail(null); setTopicRevision(null); setTopicLoading(false); setLessonReadOnly(false); setView(previousView === 'lesson' ? 'content' : previousView)
  }

  if (view === 'lesson') return <main className="app-shell learning-shell" id="main-content">
    {topicLoading ? <div className="lesson-loading card"><p className="loading-inline">Preparing your revision session…</p></div> : null}
    {!topicLoading && topicDetail && topicRevision ? <LearningSession onBack={closeLesson} onResult={assessFromTopic} onReviseNow={startRevisionNow} recordResults={user.role === 'student' && !lessonReadOnly} reviewMode={lessonReadOnly} revision={topicRevision} topic={topicDetail} /> : null}
    {!topicLoading && (!topicDetail || !topicRevision) ? <div className="card"><p className="error">The revision session could not be loaded.</p><button onClick={closeLesson} type="button">Back to the course</button></div> : null}
  </main>

  return (
    <main className="app-shell" id="main-content">
      <a className="skip-link" href="#primary-navigation">Skip to navigation</a>
      <header className="topbar"><div><p className="eyebrow">Oli: Locked In</p><p className="identity">{user.displayName} · {user.role}</p></div><button className="secondary" onClick={() => void onSignOut()} type="button">Sign out</button></header>
      <nav className="view-tabs" aria-label="Main views" id="primary-navigation">
        {user.role === 'parent' ? <button aria-pressed={view === 'parent'} onClick={() => setView('parent')} type="button">Parent dashboard</button> : null}
        <button aria-pressed={view === 'today'} onClick={() => setView('today')} type="button">Today</button>
        <button aria-pressed={view === 'week'} onClick={() => setView('week')} type="button">This week</button>
        <button aria-pressed={view === 'subjects'} onClick={() => setView('subjects')} type="button">Subjects</button>
        <button aria-pressed={view === 'progress'} onClick={() => setView('progress')} type="button">Progress</button>
        <button aria-pressed={view === 'analytics'} onClick={() => setView('analytics')} type="button">Analytics</button>
        <button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')} type="button">Calendar</button>
        <button aria-pressed={view === 'plan'} onClick={() => setView('plan')} type="button">14-day plan</button>
        <button aria-pressed={view === 'content'} onClick={() => setView('content')} type="button">Learn &amp; practise</button>
        <button aria-pressed={view === 'courses'} onClick={() => setView('courses')} type="button">Course setup</button>
      </nav>
      {message ? <p className="success" role="status">{message}</p> : null}{error ? <p className="error" role="alert">{error}</p> : null}{loading ? <p className="loading-inline">Loading course data…</p> : null}
      {!loading && view === 'parent' && analytics ? <ParentDashboard analytics={analytics} onNavigate={(next) => setView(next)} onResetProgress={resetTrialProgress} /> : null}
      {!loading && view === 'today' ? <>{analytics ? <GamificationCard data={analytics.gamification} editable={user.role === 'student'} onGoal={saveWeeklyGoal} /> : null}<TodayDashboard analytics={analytics} sessions={plan} topics={progress} editable={user.role === 'student'} onComplete={finishSession} onCannotDo={(id) => changeSessionStatus(id, 'rescheduled')} onReviewTopic={(id) => void openTopic(id, true)} onViewTopic={(id) => void openTopic(id)} onOpenWeek={() => setView('week')} /></> : null}
      {!loading && view === 'week' ? <WeeklyPlanner editable={user.role === 'student'} sessions={plan} topics={progress} onMove={(id) => changeSessionStatus(id, 'rescheduled')} onReplan={requestReplan} onReviewTopic={(id) => void openTopic(id, true)} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'subjects' ? <SubjectBrowser analytics={analytics} subjects={subjects} topics={progress} sessions={plan} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'plan' ? <PlanDashboard availability={availability} onAvailability={saveWeeklyAvailability} onGenerate={buildPlan} onReviewTopic={(id) => void openTopic(id, true)} onStatus={changeSessionStatus} onViewTopic={(id) => void openTopic(id)} sessions={plan} studentMode={user.role === 'student'} /> : null}
      {!loading && view === 'progress' ? <ProgressDashboard editable={user.role === 'student'} onAssessment={saveAssessment} onConfidence={saveConfidence} topics={progress} /> : null}
      {!loading && view === 'analytics' && analytics ? <AnalyticsDashboard analytics={analytics} /> : null}
      {!loading && view === 'calendar' && analytics ? <CalendarDashboard analytics={analytics} availability={availability} editable={user.role === 'parent'} onException={saveException} sessions={plan} /> : null}
      {!loading && view === 'content' ? <><div className="subject-tabs" aria-label="Choose a subject">{subjects.filter((subject) => subject.active).map((subject) => <button aria-pressed={selectedSubjectId === subject.id} key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} type="button">{subject.name}</button>)}</div><RevisionSubjectGuide examBoard={subjects.find((subject) => subject.id === selectedSubjectId)?.examBoard ?? 'exam-board'} guide={subjectGuide} loading={guideLoading} /><SubjectPreview onTopic={(id) => void openTopic(id)} subject={subjects.find((subject) => subject.id === selectedSubjectId)} /></> : null}
      {!loading && view === 'courses' ? <CourseSetup editable={user.role === 'parent'} onSave={saveCourse} subjects={subjects} /> : null}
    </main>
  )
}
