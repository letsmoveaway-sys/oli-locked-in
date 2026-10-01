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
  options: Record<string, string>
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
    options: subject.options,
  })
  const [saving, setSaving] = useState(false)
  const hasTier = subject.id === 'subject-mathematics' || subject.id === 'subject-combined-science'
  const setOption = (key: string, value: string) => setValues({ ...values, options: { ...values.options, configuration: 'confirmed', [key]: value } })

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
        {subject.id === 'subject-english-literature' ? <fieldset className="course-options"><legend>Confirm the set texts and poetry cluster</legend>
          <label>Shakespeare<select onChange={(event) => setOption('shakespeare', event.target.value)} value={values.options.shakespeare ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Macbeth</option></select></label>
          <label>19th-century novel<select onChange={(event) => setOption('nineteenthCenturyNovel', event.target.value)} value={values.options.nineteenthCenturyNovel ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>A Christmas Carol</option></select></label>
          <label>Modern text<select onChange={(event) => setOption('modernText', event.target.value)} value={values.options.modernText ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>An Inspector Calls</option></select></label>
          <label>Poetry cluster<select onChange={(event) => setOption('poetryCluster', event.target.value)} value={values.options.poetryCluster ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Power and Conflict</option></select></label>
        </fieldset> : null}
        {subject.id === 'subject-combined-science' ? <fieldset className="course-options"><legend>Confirm the Science route</legend><label>Course<select onChange={(event) => setOption('course', event.target.value)} value={values.options.course ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Trilogy</option></select></label></fieldset> : null}
        {subject.id === 'subject-history' ? <fieldset className="course-options"><legend>Confirm all four History options</legend>
          <label>Thematic study<select onChange={(event) => setOption('thematicStudy', event.target.value)} value={values.options.thematicStudy ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Medicine in Britain and the British sector of the Western Front</option></select></label>
          <label>Period study<select onChange={(event) => setOption('periodStudy', event.target.value)} value={values.options.periodStudy ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>The American West, c1835-c1895</option></select></label>
          <label>British depth study<select onChange={(event) => setOption('britishDepthStudy', event.target.value)} value={values.options.britishDepthStudy ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Early Elizabethan England, 1558-88</option></select></label>
          <label>Modern depth study<select onChange={(event) => setOption('modernDepthStudy', event.target.value)} value={values.options.modernDepthStudy ?? 'TBC'}><option value="TBC">Different or not confirmed</option><option>Weimar and Nazi Germany, 1918-39</option></select></label>
        </fieldset> : null}
        <span className={`tag ${subject.configurationComplete ? 'tag--ready' : 'tag--tbc'}`}>
          {subject.configurationComplete ? 'Configured' : subject.examBoard === 'TBC' ? 'Board TBC' : 'Options TBC'}
        </span>
      </div>
      {editable ? (
        <>
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
        {subject.id === 'subject-geography' ? <fieldset className="course-options"><legend>Confirm the options taught at school</legend>
          <label>Living world option<select onChange={(event) => setOption('livingWorldOption', event.target.value)} value={values.options.livingWorldOption ?? 'TBC'}><option value="TBC">Choose one</option><option value="geo-hot-deserts">Hot deserts</option><option value="geo-cold-environments">Cold environments</option></select></label>
          <label>Two UK landscapes<select onChange={(event) => setOption('ukLandscapeOptions', event.target.value)} value={values.options.ukLandscapeOptions ?? 'TBC'}><option value="TBC">Choose two</option><option value="geo-coasts,geo-rivers">Coasts and rivers</option><option value="geo-coasts,geo-glacial">Coasts and glacial landscapes</option><option value="geo-rivers,geo-glacial">Rivers and glacial landscapes</option></select></label>
          <label>Resource option<select onChange={(event) => setOption('resourceOption', event.target.value)} value={values.options.resourceOption ?? 'TBC'}><option value="TBC">Choose one</option><option value="geo-resource-food">Food</option><option value="geo-resource-water">Water</option><option value="geo-resource-energy">Energy</option></select></label>
          <label>Named case studies and both fieldwork enquiries<textarea maxLength={200} onChange={(event) => setOption('caseStudies', event.target.value)} placeholder="e.g. Mumbai; London; River Tees; local urban enquiry" value={values.options.caseStudies === 'TBC' ? '' : values.options.caseStudies ?? ''} /></label>
        </fieldset> : null}
        {subject.id === 'subject-design-technology' ? <fieldset className="course-options"><legend>Confirm the specialist material and NEA stage</legend><label>Specialist material<select onChange={(event) => setOption('specialistMaterial', event.target.value)} value={values.options.specialistMaterial ?? 'TBC'}><option value="TBC">Choose one</option><option>Papers and boards</option><option>Timber-based materials</option><option>Metal-based materials</option><option>Polymers</option><option>Textile-based materials</option><option>Electronic and mechanical systems</option></select></label><label>NEA stage<select onChange={(event) => setOption('neaStage', event.target.value)} value={values.options.neaStage ?? 'TBC'}><option value="TBC">Choose the current stage</option><option>Not started</option><option>Investigating the context</option><option>Design brief and specification</option><option>Developing ideas</option><option>Making</option><option>Testing and evaluation</option><option>Complete</option></select></label></fieldset> : null}
        </>
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
          <p className="eyebrow">Make the plan match the real courses</p>
          <h2 id="courses-heading">GCSE courses</h2>
          <p>{incomplete ? `${incomplete} active ${incomplete === 1 ? 'course needs' : 'courses need'} more information before its plan is reliable.` : 'All active course choices are confirmed.'}</p>
        </div>
      </div>
      <div className="course-list">
        {subjects.map((subject) => <CourseRow editable={editable} key={subject.id} onSave={onSave} subject={subject} />)}
      </div>
    </section>
  )
}
