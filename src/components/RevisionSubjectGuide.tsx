import type { SubjectRevisionGuide } from '../types'

export function RevisionSubjectGuide({ guide, loading, examBoard = 'exam-board' }: { guide: SubjectRevisionGuide | null; loading: boolean; examBoard?: string }) {
  if (loading) return <section className="card revision-guide"><p className="loading-inline">Loading exam guidance…</p></section>
  if (!guide) return <section className="card revision-guide"><p>{examBoard === 'TBC' ? 'Exam board and specification are still to be confirmed for this subject.' : 'Exam guidance is not available for this subject yet.'}</p></section>
  const has2027Sheet = guide.resources.some((resource) => /2027.*(?:formula|equation)|(?:formula|equation).*2027/i.test(resource.title))
  return (
    <section className="card revision-guide" aria-labelledby="exam-guide-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Exam-board guide</p><h2 id="exam-guide-heading">What you will be tested on</h2></div>
        <span className={`tag ${guide.provisional ? 'tag--tbc' : 'tag--ready'}`}>{guide.provisional ? 'Course choices TBC' : 'Course confirmed'}</span>
      </div>
      <p className="exam-summary">{guide.examSummary}</p>
      {guide.provisional ? <p className="tbc-notice">This {examBoard} overview is useful now, but option, tier or set-text choices still need confirming with the school.</p> : null}
      <div className="revision-columns">
        <div><h3>Assessment objectives</h3><ul>{guide.assessmentObjectives.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>How to gain marks</h3><ul>{guide.examTips.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <h3>Trusted revision and practice</h3>
      <div className="resource-grid">
        {guide.resources.map((resource) => <a className="resource-card" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><span>{resource.provider} · {resource.resourceType.replace('_', ' ')}</span><strong>{resource.title}</strong><small>{resource.description}</small></a>)}
      </div>
      {has2027Sheet ? <aside className="formula-sheet-practice"><p className="eyebrow">Three-minute sheet drill</p><h3>Practise using the supplied sheet</h3><ol><li>Open the 2027 sheet and find the relevant formula without using notes.</li><li>Name every quantity and unit, then choose the correct equation for a sample question.</li><li>Rearrange if needed, substitute, calculate and check the unit. The sheet supplies formulae; selecting and applying them still earns the marks.</li></ol><p>Do not spend revision time memorising a formula simply because it is supplied. Practise locating it quickly and using it accurately under timed conditions.</p></aside> : null}
      <p className="source-note">Exam-board details verified {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(guide.verifiedAt))}. External links open in a new tab.</p>
    </section>
  )
}
