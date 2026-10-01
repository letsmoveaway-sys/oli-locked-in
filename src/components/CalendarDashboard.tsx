import { type FormEvent, useState } from 'react'
import type { Analytics, CourseSubject, PlanSession, WeeklyAvailability } from '../types'
import { formatProductDate, formatProductTime, productIsoToLocalDateTime, productLocalDateTimeToIso } from '../utils/dateTime'

export interface ExamValues {
  id?: string
  subjectId: string
  component: string
  examDatetime: string
  durationMinutes: number
  eventKind: 'final' | 'mock' | 'school_assessment'
  confirmed: boolean
  source: string
}

interface Props {
  analytics: Analytics
  availability: WeeklyAvailability[]
  sessions: PlanSession[]
  subjects: CourseSubject[]
  editable: boolean
  onException: (input: { startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectStreak: boolean }) => Promise<void>
  onExam: (input: ExamValues) => Promise<void>
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const emptyExam = (subjectId = '') => ({
  id: undefined as string | undefined,
  subjectId,
  component: '',
  examDatetime: '',
  durationMinutes: '90',
  eventKind: 'final' as ExamValues['eventKind'],
  confirmed: false,
  source: '',
})

export function CalendarDashboard({ analytics, availability, sessions, subjects, editable, onException, onExam }: Props) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('Illness')
  const [minutes, setMinutes] = useState('0')
  const [protect, setProtect] = useState(true)
  const [busy, setBusy] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const activeSubjects = subjects.filter((subject) => subject.active)
  const [exam, setExam] = useState(() => emptyExam(activeSubjects[0]?.id))
  const [examBusy, setExamBusy] = useState(false)
  const [examError, setExamError] = useState('')
  const tutors = sessions.filter((item) => item.source === 'tutor')

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setCalendarError('')
    try {
      await onException({ startDatetime: productLocalDateTimeToIso(start), endDatetime: productLocalDateTimeToIso(end), reason, availableMinutes: Number(minutes), protectStreak: protect })
      setStart(''); setEnd('')
    } catch (caught) { setCalendarError(caught instanceof Error ? caught.message : 'Unable to save this exception.') }
    finally { setBusy(false) }
  }

  function editExam(item: Analytics['exams'][number]) {
    setExam({
      id: item.id,
      subjectId: item.subjectId,
      component: item.component,
      examDatetime: productIsoToLocalDateTime(item.examDatetime),
      durationMinutes: String(item.durationMinutes ?? 90),
      eventKind: item.eventKind,
      confirmed: item.confirmed,
      source: item.source ?? '',
    })
    document.getElementById('exam-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submitExam(event: FormEvent) {
    event.preventDefault(); setExamBusy(true); setExamError('')
    try {
      await onExam({
        id: exam.id,
        subjectId: exam.subjectId,
        component: exam.component,
        examDatetime: productLocalDateTimeToIso(exam.examDatetime),
        durationMinutes: Number(exam.durationMinutes),
        eventKind: exam.eventKind,
        confirmed: exam.confirmed,
        source: exam.source,
      })
      setExam(emptyExam(activeSubjects[0]?.id))
    } catch (caught) { setExamError(caught instanceof Error ? caught.message : 'Unable to save this examination.') }
    finally { setExamBusy(false) }
  }

  return <section aria-labelledby="calendar-heading">
    <div className="section-heading"><div><p className="eyebrow">Calendar and availability</p><h2 id="calendar-heading">Time commitments</h2><p>Confirmed exams and mocks change what the planner prioritises.</p></div></div>
    <div className="calendar-grid">
      <article className="card analytics-card"><h3>Standard week</h3><div className="availability-summary">{dayNames.map((day, index) => { const item = availability.find((value) => value.weekday === index + 1); return <div key={day}><strong>{day.slice(0, 3)}</strong><span>{item?.availableMinutes ?? 0} min total</span><small>{item?.startTime ?? 'Unavailable'}{item?.sessionMinutes ? ` · ${item.sessionMinutes} min blocks` : ''}</small></div> })}</div></article>
      <article className="card analytics-card"><h3>Tutors, assessments and exams</h3><ul className="simple-list">{tutors.map((item) => <li key={item.id}><strong>{item.subjectName} tutor</strong><span>{formatProductDate(item.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short' })} · {item.plannedMinutes} min</span></li>)}{analytics.exams.map((item) => <li key={item.id}><strong>{item.subjectName} · {item.component}</strong><span>{item.eventKind === 'final' ? 'Final exam' : item.eventKind === 'mock' ? 'Mock' : 'School assessment'} · {formatProductDate(item.examDatetime, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} at {formatProductTime(item.examDatetime)}{item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}</span><small>{item.confirmed ? 'Confirmed' : 'Provisional'}{item.source ? <> · Source: {/^https:\/\//.test(item.source) ? <a href={item.source} rel="noreferrer" target="_blank">open source</a> : item.source}</> : ''}</small>{editable ? <button className="text-button" onClick={() => editExam(item)} type="button">Edit or confirm</button> : null}</li>)}</ul>{!tutors.length && !analytics.exams.length ? <p>No upcoming tutors, assessments or exams have been added.</p> : null}</article>
    </div>
    {editable ? <form className="card exam-form" id="exam-editor" onSubmit={submitExam}>
      <div className="card-heading"><div><p className="eyebrow">Dates that drive the plan</p><h3>{exam.id ? 'Edit or confirm a date' : 'Add an exam, mock or assessment'}</h3></div>{exam.id ? <button className="secondary" onClick={() => setExam(emptyExam(activeSubjects[0]?.id))} type="button">Add another</button> : null}</div>
      <div className="exam-form-grid">
        <label>Subject<select required value={exam.subjectId} onChange={(event) => setExam({ ...exam, subjectId: event.target.value })}><option value="">Choose a subject</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.examBoard} {subject.specificationCode ?? ''}</option>)}</select></label>
        <label>Type<select value={exam.eventKind} onChange={(event) => setExam({ ...exam, eventKind: event.target.value as ExamValues['eventKind'] })}><option value="final">Final GCSE exam</option><option value="mock">Mock exam</option><option value="school_assessment">School assessment</option></select></label>
        <label>Paper or component<input maxLength={150} placeholder="e.g. Paper 1: Non-calculator" required value={exam.component} onChange={(event) => setExam({ ...exam, component: event.target.value })} /></label>
        <label>Date and start time<input required type="datetime-local" value={exam.examDatetime} onChange={(event) => setExam({ ...exam, examDatetime: event.target.value })} /></label>
        <label>Duration (minutes)<input min="1" max="360" required type="number" value={exam.durationMinutes} onChange={(event) => setExam({ ...exam, durationMinutes: event.target.value })} /></label>
        <label>Source or school note<input maxLength={500} placeholder="Official timetable URL or 'School mock timetable, 29 Sep'" required value={exam.source} onChange={(event) => setExam({ ...exam, source: event.target.value })} /></label>
      </div>
      <label className="check-label"><input checked={exam.confirmed} onChange={(event) => setExam({ ...exam, confirmed: event.target.checked })} type="checkbox" /> I have checked this date, start time and paper against the official or school timetable.</label>
      {examError ? <p className="error" role="alert">{examError}</p> : null}
      <button disabled={examBusy} type="submit">{examBusy ? 'Saving…' : exam.id ? 'Save date and replan' : 'Add date and replan'}</button>
    </form> : null}
    <div className="calendar-grid">
      <article className="card analytics-card"><h3>Exceptions</h3>{analytics.exceptions.length ? <ul className="simple-list">{analytics.exceptions.map((item) => <li key={`${item.startDatetime}-${item.reason}`}><strong>{item.reason}</strong><span>{formatProductDate(item.startDatetime, { day: 'numeric', month: 'short' })} – {formatProductDate(item.endDatetime, { day: 'numeric', month: 'short' })} · {item.availableMinutes} min available{item.protectsStreak ? ' · streak protected' : ''}</span></li>)}</ul> : <p>No upcoming exceptions.</p>}</article>
      {editable ? <form className="card exception-form" onSubmit={submit}><h3>Add holiday, event or illness</h3><div className="score-fields"><label>Starts<input onChange={(event) => setStart(event.target.value)} required type="datetime-local" value={start} /></label><span>to</span><label>Ends<input onChange={(event) => setEnd(event.target.value)} required type="datetime-local" value={end} /></label></div><label>Reason<input maxLength={100} onChange={(event) => setReason(event.target.value)} required value={reason} /></label><label>Available minutes<input min="0" max="360" onChange={(event) => setMinutes(event.target.value)} required type="number" value={minutes} /></label><label className="check-label"><input checked={protect} onChange={(event) => setProtect(event.target.checked)} type="checkbox" /> Protect the activity streak</label>{calendarError ? <p className="error" role="alert">{calendarError}</p> : null}<button disabled={busy} type="submit">Save exception and replan</button></form> : null}
    </div>
  </section>
}
