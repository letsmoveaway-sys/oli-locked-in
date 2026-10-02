import { useEffect, useState } from 'react'
import {
  addAvailabilityException, completeSession, generatePlan, getAnalytics, getAvailability, getPlan, getProgress, getSubjects, getTopicDetail, getTopicRevision,
  replan, saveAvailability as saveAvailabilityRequest, saveExam as saveExamRequest, setSessionStatus, setTopicTarget, updateCourse,
} from '../services/api'
import type { Analytics, CourseSubject, PlanSession, SessionCompletionInput, SessionUser, TopicDetail, TopicProgress, TopicRevision, WeeklyAvailability } from '../types'
import { CalendarDashboard, type ExamValues } from './CalendarDashboard'
import { CourseSetup, type CourseValues } from './CourseSetup'
import { PlanDashboard } from './PlanDashboard'
import { SubjectBrowser } from './SubjectBrowser'
import { TodayDashboard } from './TodayDashboard'
import { WeeklyPlanner } from './WeeklyPlanner'
import { TopicSchedulePanel } from './TopicSchedulePanel'
import { PrivacyNotice } from './PrivacyNotice'
import type { CannotDoReason } from './CannotDoDialog'

interface HomeProps { user: SessionUser; onSignOut: () => Promise<void> }
type View = 'today' | 'week' | 'subjects' | 'progress' | 'analytics' | 'calendar' | 'parent' | 'plan' | 'courses' | 'content' | 'privacy' | 'topic'

const studentViews: View[] = ['today', 'week', 'subjects', 'calendar', 'plan', 'courses', 'privacy', 'topic']
const parentViews: View[] = ['today', 'subjects', 'calendar', 'plan', 'courses', 'privacy', 'topic']

function routedView(role: SessionUser['role']): View {
  const requested = new URL(window.location.href).searchParams.get('view') as View | null
  const allowed = role === 'student' ? studentViews : parentViews
  return requested && allowed.includes(requested) ? requested : 'today'
}

export function Home({ user, onSignOut }: HomeProps) {
  const [subjects, setSubjects] = useState<CourseSubject[]>([])
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [plan, setPlan] = useState<PlanSession[]>([])
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [view, setView] = useState<View>(() => routedView(user.role))
  const [previousView, setPreviousView] = useState<View>('today')
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null)
  const [topicRevision, setTopicRevision] = useState<TopicRevision | null>(null)
  const [topicLoading, setTopicLoading] = useState(() => routedView(user.role) === 'topic')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

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

  async function saveCourse(subject: CourseSubject, values: CourseValues) {
    setError(''); setMessage('')
    try {
      const updated = await updateCourse({ subjectId: subject.id, active: values.active, tier: values.tier, currentGrade: values.currentGrade || null, targetGrade: values.targetGrade || null, options: values.options })
      setSubjects(updated); setMessage(`${subject.name} configuration saved.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save the course.') }
  }

  async function buildPlan() {
    setError('')
    try { const result = await generatePlan(); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate the plan.') }
  }

  async function saveTopicTarget(topicId: string, targetSessions: number) {
    setError('')
    try { const result = await setTopicTarget(topicId, targetSessions); setProgress(result.topics); setPlan(result.sessions); setMessage(result.message) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update the topic allocation.'); throw caught }
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

  async function loadTopic(topicId: string) {
    setView('topic'); setTopicLoading(true); setTopicDetail(null); setTopicRevision(null)
    try { const [detail, revision] = await Promise.all([getTopicDetail(topicId), getTopicRevision(topicId)]); setTopicDetail(detail); setTopicRevision(revision) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load the topic.') }
    finally { setTopicLoading(false) }
  }

  async function openTopic(topicId: string) {
    if (view !== 'topic') setPreviousView(view)
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'topic'); url.searchParams.set('topic', topicId); url.searchParams.set('from', view === 'topic' ? previousView : view)
    url.searchParams.delete('review')
    window.history.pushState({ gcseRoute: true }, '', url)
    await loadTopic(topicId)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const topicId = params.get('view') === 'topic' ? params.get('topic') ?? '' : ''
    if (!/^[a-z0-9-]{1,100}$/.test(topicId)) return
    void loadTopic(topicId)
  }, [])

  useEffect(() => {
    function restoreRoute() {
      const next = routedView(user.role)
      const params = new URL(window.location.href).searchParams
      const topicId = params.get('topic') ?? ''
      if (next === 'topic' && /^[a-z0-9-]{1,100}$/.test(topicId)) {
        const from = params.get('from') as View | null
        if (from && from !== 'topic') setPreviousView(from)
        void loadTopic(topicId)
        return
      }
      setTopicDetail(null); setTopicRevision(null); setTopicLoading(false); setView(next)
    }
    window.addEventListener('popstate', restoreRoute)
    return () => window.removeEventListener('popstate', restoreRoute)
  }, [user.role])

  async function saveException(input: { startDatetime: string; endDatetime: string; reason: string; availableSlots: number; protectStreak: boolean }) {
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
    setTopicDetail(null); setTopicRevision(null); setTopicLoading(false)
    const fallback = previousView === 'topic' ? 'subjects' : previousView
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

  if (view === 'topic') return <main className="app-shell learning-shell" id="main-content">
    {topicLoading ? <div className="lesson-loading card"><p className="loading-inline">Loading topic coverage and resources…</p></div> : null}
    {!topicLoading && topicDetail && topicRevision ? <TopicSchedulePanel onBack={closeLesson} revision={topicRevision} topic={topicDetail} /> : null}
    {!topicLoading && (!topicDetail || !topicRevision) ? <div className="card"><p className="error">The topic could not be loaded.</p><button onClick={closeLesson} type="button">Back to topics</button></div> : null}
  </main>

  return (
    <main className="app-shell" id="main-content">
      <a className="skip-link" href="#primary-navigation">Skip to navigation</a>
      <header className="topbar"><div><p className="eyebrow">Oli: Locked In</p><p className="identity">{user.displayName} · {user.role}</p></div>{user.role === 'parent' ? <button className="secondary" onClick={() => void onSignOut()} type="button">Sign out</button> : null}</header>
      {user.role === 'student' ? <>
        <nav className="view-tabs view-tabs--student" aria-label="Main views" id="primary-navigation">
          <button aria-pressed={view === 'today'} onClick={() => navigate('today')} type="button">Today</button>
          <button aria-pressed={view === 'subjects'} onClick={() => navigate('subjects')} type="button">Topics</button>
          <button aria-pressed={view === 'week' || view === 'plan'} onClick={() => navigate('week')} type="button">Plan</button>
          <button aria-expanded={moreOpen} aria-pressed={moreOpen || ['calendar', 'courses'].includes(view)} onClick={() => setMoreOpen((open) => !open)} type="button">More</button>
        </nav>
        {moreOpen ? <nav className="more-menu card" aria-label="More views">
          <button className="secondary" onClick={() => navigate('calendar')} type="button">Calendar</button>
          <button className="secondary" onClick={() => navigate('subjects')} type="button">Topic allocations</button>
          <button className="secondary" onClick={() => navigate('plan')} type="button">Six-week schedule</button>
          <button className="secondary" onClick={() => navigate('courses')} type="button">Course information</button>
          <button className="secondary" onClick={() => navigate('privacy')} type="button">Privacy and data</button>
          <button className="secondary" onClick={() => void onSignOut()} type="button">Sign out</button>
        </nav> : null}
      </> : <nav className="view-tabs" aria-label="Parent views" id="primary-navigation">
        <button aria-pressed={view === 'today'} onClick={() => navigate('today')} type="button">Today</button>
        <button aria-pressed={view === 'subjects'} onClick={() => navigate('subjects')} type="button">Topics</button>
        <button aria-pressed={view === 'calendar'} onClick={() => navigate('calendar')} type="button">Calendar</button>
        <button aria-pressed={view === 'plan'} onClick={() => navigate('plan')} type="button">Plan</button>
        <button aria-pressed={view === 'courses'} onClick={() => navigate('courses')} type="button">Course setup</button>
        <button aria-pressed={view === 'privacy'} onClick={() => navigate('privacy')} type="button">Privacy</button>
      </nav>}
      {message ? <p className="success" role="status">{message}</p> : null}{error ? <div className="error error-with-action" role="alert"><span>{error}</span><button className="secondary" onClick={() => void loadDashboard()} type="button">Retry dashboard</button></div> : null}{loading ? <p className="loading-inline">Loading course data…</p> : null}
      {!loading && view === 'today' ? <TodayDashboard sessions={plan} topics={progress} editable={user.role === 'student'} onComplete={finishSession} onCannotDo={changeSessionStatus} onViewTopic={(id) => void openTopic(id)} onOpenWeek={() => navigate('week')} /> : null}
      {!loading && view === 'week' ? <WeeklyPlanner editable={user.role === 'student'} sessions={plan} topics={progress} onComplete={finishSession} onMove={changeSessionStatus} onReplan={requestReplan} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'subjects' ? <SubjectBrowser editable={user.role === 'parent'} onTarget={saveTopicTarget} subjects={subjects} topics={progress} sessions={plan} onViewTopic={(id) => void openTopic(id)} /> : null}
      {!loading && view === 'plan' ? <PlanDashboard availability={availability} onAvailability={saveWeeklyAvailability} onCannotDo={changeSessionStatus} onComplete={finishSession} onGenerate={buildPlan} onViewTopic={(id) => void openTopic(id)} sessions={plan} studentMode={user.role === 'student'} topics={progress} /> : null}
      {!loading && view === 'calendar' && analytics ? <CalendarDashboard analytics={analytics} availability={availability} editable={user.role === 'parent'} onException={saveException} onExam={saveExam} sessions={plan} subjects={subjects} /> : null}
      {!loading && view === 'courses' ? <CourseSetup editable={user.role === 'parent'} onSave={saveCourse} subjects={subjects} /> : null}
      {!loading && view === 'privacy' ? <PrivacyNotice /> : null}
    </main>
  )
}
