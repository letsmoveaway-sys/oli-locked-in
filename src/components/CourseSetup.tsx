import { useState } from 'react'
import type { CourseSubject } from '../types'

interface CourseSetupProps {
  subjects: CourseSubject[]
  editable: boolean
  onSave: (subject: CourseSubject, values: CourseValues) => Promise<void>
}

export interface CourseValues {
  active: boolean
  tier: string
  currentGrade: string
  targetGrade: string
}

function CourseRow({ subject, editable, onSave }: {
  subject: CourseSubject
  editable: boolean
  onSave: CourseSetupProps['onSave']
}) {
  const [values, setValues] = useState<CourseValues>({
    active: subject.active,
    tier: subject.tier,
    currentGrade: subject.currentGrade ?? '',
    targetGrade: subject.targetGrade ?? '',
  })
  const [saving, setSaving] = useState(false)
  const hasTier = subject.id === 'subject-mathematics' || subject.id === 'subject-combined-science'

  async function save() {
    setSaving(true)
    try { await onSave(subject, values) } finally { setSaving(false) }
  }

  return (
    <article className={`course-row ${values.active ? '' : 'course-row--inactive'}`}>
      <div className="course-heading">
        <div>
          <h3>{subject.name}</h3>
          <p>{subject.examBoard === 'TBC' ? 'Exam board and specification TBC' : `${subject.examBoard} ${subject.specificationCode ?? 'Specification TBC'}`}</p>
        </div>
        <span className={`tag ${subject.configurationComplete ? 'tag--ready' : 'tag--tbc'}`}>
          {subject.configurationComplete ? 'Configured' : 'TBC'}
        </span>
      </div>
      {editable ? (
        <div className="course-controls">
          <label className="check-label">
            <input checked={values.active} onChange={(event) => setValues({ ...values, active: event.target.checked })} type="checkbox" /> Active
          </label>
          {hasTier ? (
            <label>Tier
              <select value={values.tier} onChange={(event) => setValues({ ...values, tier: event.target.value })}>
                <option value="TBC">TBC</option>
                <option value="foundation">Foundation</option>
                <option value="higher">Higher</option>
              </select>
            </label>
          ) : null}
          <label>Current grade
            <input value={values.currentGrade} onChange={(event) => setValues({ ...values, currentGrade: event.target.value })} placeholder="TBC" />
          </label>
          <label>Target grade
            <input value={values.targetGrade} onChange={(event) => setValues({ ...values, targetGrade: event.target.value })} placeholder="TBC" />
          </label>
          <button disabled={saving} onClick={() => void save()} type="button">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      ) : (
        <p className="course-summary">{hasTier ? `${subject.tier} tier · ` : ''}Target {subject.targetGrade ?? 'TBC'}</p>
      )}
    </article>
  )
}

export function CourseSetup({ subjects, editable, onSave }: CourseSetupProps) {
  const incomplete = subjects.filter((subject) => subject.active && !subject.configurationComplete).length
  return (
    <section aria-labelledby="courses-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Phase 2 · Course setup</p>
          <h2 id="courses-heading">GCSE courses</h2>
          <p>{incomplete} active {incomplete === 1 ? 'course needs' : 'courses need'} more information.</p>
        </div>
      </div>
      <div className="course-list">
        {subjects.map((subject) => <CourseRow editable={editable} key={subject.id} onSave={onSave} subject={subject} />)}
      </div>
    </section>
  )
}
