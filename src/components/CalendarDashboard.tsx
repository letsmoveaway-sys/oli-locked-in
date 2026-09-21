import { type FormEvent, useState } from 'react'
import type { Analytics, PlanSession, WeeklyAvailability } from '../types'

interface Props {
  analytics: Analytics
  availability: WeeklyAvailability[]
  sessions: PlanSession[]
  editable: boolean
  onException: (input: { startDatetime: string; endDatetime: string; reason: string; availableMinutes: number; protectStreak: boolean }) => Promise<void>
}
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export function CalendarDashboard({ analytics, availability, sessions, editable, onException }: Props) {
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [reason, setReason] = useState('Illness'); const [minutes, setMinutes] = useState('0'); const [protect, setProtect] = useState(true); const [busy, setBusy] = useState(false)
  const tutors = sessions.filter((item) => item.source === 'tutor')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try { await onException({ startDatetime: `${start}:00.000Z`, endDatetime: `${end}:00.000Z`, reason, availableMinutes: Number(minutes), protectStreak: protect }); setStart(''); setEnd('') } finally { setBusy(false) }
  }
  return <section aria-labelledby="calendar-heading"><div className="section-heading"><div><p className="eyebrow">Calendar and availability</p><h2 id="calendar-heading">Time commitments</h2></div></div>
    <div className="calendar-grid"><article className="card analytics-card"><h3>Standard week</h3><div className="availability-summary">{dayNames.map((day, index) => { const item = availability.find((value) => value.weekday === index + 1); return <div key={day}><strong>{day.slice(0, 3)}</strong><span>{item?.availableMinutes ?? 0} min</span><small>{item?.startTime ?? 'Unavailable'}</small></div> })}</div></article><article className="card analytics-card"><h3>Tutors and exams</h3><ul className="simple-list">{tutors.map((item) => <li key={item.id}><strong>{item.subjectName} tutor</strong><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(item.scheduledAt))} · {item.plannedMinutes} min</span></li>)}{analytics.exams.map((item) => <li key={`${item.subjectName}-${item.component}`}><strong>{item.subjectName} · {item.component}</strong><span>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.examDatetime))}{item.confirmed ? '' : ' · provisional'}</span></li>)}</ul>{!tutors.length && !analytics.exams.length ? <p>No upcoming tutors or exams in the current window.</p> : null}</article></div>
    <div className="calendar-grid"><article className="card analytics-card"><h3>Exceptions</h3>{analytics.exceptions.length ? <ul className="simple-list">{analytics.exceptions.map((item) => <li key={`${item.startDatetime}-${item.reason}`}><strong>{item.reason}</strong><span>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(item.startDatetime))} – {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(item.endDatetime))} · {item.availableMinutes} min available{item.protectsStreak ? ' · streak protected' : ''}</span></li>)}</ul> : <p>No upcoming exceptions.</p>}</article>{editable ? <form className="card exception-form" onSubmit={submit}><h3>Add holiday, event or illness</h3><div className="score-fields"><label>Starts<input onChange={(event) => setStart(event.target.value)} required type="datetime-local" value={start} /></label><span>to</span><label>Ends<input onChange={(event) => setEnd(event.target.value)} required type="datetime-local" value={end} /></label></div><label>Reason<input maxLength={100} onChange={(event) => setReason(event.target.value)} required value={reason} /></label><label>Available minutes<input min="0" max="360" onChange={(event) => setMinutes(event.target.value)} required type="number" value={minutes} /></label><label className="check-label"><input checked={protect} onChange={(event) => setProtect(event.target.checked)} type="checkbox" /> Protect the activity streak</label><button disabled={busy} type="submit">Save exception and replan</button></form> : null}</div>
  </section>
}
