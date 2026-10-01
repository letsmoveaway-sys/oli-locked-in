import type { CourseSubject } from '../types'

export function SubjectPreview({ subject, onTopic }: { subject: CourseSubject | undefined; onTopic?: (topicId: string) => void }) {
  if (!subject) return <section className="card"><p>Curriculum data is not loaded yet.</p></section>

  const revisionGroups = subject.topics.reduce((count, topic) => count + topic.children.length, 0)
  const sourceReference = subject.topics[0]?.sourceReference

  return (
    <section aria-labelledby="subject-heading">
      <div className="maths-hero card">
        <div>
          <p className="eyebrow">{subject.examBoard === 'TBC' ? 'Exam board TBC' : `${subject.examBoard} GCSE · ${subject.specificationCode ?? 'Specification TBC'}`}</p>
          <h2 id="subject-heading">{subject.name} <span>{subject.tier === 'higher' ? 'Higher' : ''}</span></h2>
          <p>{subject.configurationComplete ? 'Confirmed course map' : 'Course details to be confirmed'}</p>
        </div>
        <div className="maths-stat"><strong>{subject.components.length}</strong><span>assessments</span></div>
      </div>

      {subject.components.length ? (
        <div className="paper-grid" aria-label={`${subject.name} assessments`}>
          {subject.components.map((component) => (
            <article className="paper-card card" key={component.id}>
              <p className="paper-number">{component.code}</p>
              <h3>{component.name}</h3>
              <dl>
                <div><dt>Time</dt><dd>{component.durationMinutes >= 600 ? '30–35 hours' : `${component.durationMinutes} minutes`}</dd></div>
                <div><dt>Marks</dt><dd>{component.maximumMarks}</dd></div>
                <div><dt>Weight</dt><dd>{Math.round(component.weightingPercent)}%</dd></div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}

      <div className="content-panel card">
        <div className="section-heading">
          <div><p className="eyebrow">Syllabus map</p><h2>Course content</h2></div>
          {revisionGroups > 0 ? <span className="tag tag--ready">{revisionGroups} revision groups</span> : null}
        </div>
        {!subject.configurationComplete ? <p className="tbc-notice">{subject.examBoard === 'TBC'
          ? 'The course map will be added when the exam board and specification are confirmed.'
          : 'The exam board map is available. Items marked Choice TBC stay out of the revision plan until the school confirms the taught options and case studies.'}</p> : null}
        <div className="topic-list">
          {subject.topics.map((topic) => (
            <details key={topic.id}>
              <summary>
                <span>{topic.name}</span>
                {topic.weightingPercent !== null ? <span className="topic-weight">{topic.weightingPercent}%</span> : null}
              </summary>
              <p>{topic.description}</p>
              <ul>
                {topic.children.map((child) => (
                  <li key={child.id}>
                    <div>
                      <strong>{child.name}</strong>
                      {child.tier === 'higher' ? <span className="higher-only">Higher only</span> : null}
                      {child.applicability === 'option_required' ? <span className="option-tbc">Choice TBC</span> : null}
                      {child.applicability === 'provisional_course' ? <span className="option-tbc">Course TBC</span> : null}
                    </div>
                    <span>{child.description}</span>
                    {onTopic && child.applicability === 'common' ? <button className="learn-topic-button" onClick={() => onTopic(child.id)} type="button">Learn and practise</button> : null}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        {sourceReference ? <p className="source-note">Curriculum descriptions are paraphrased from the{' '}
          <a href={sourceReference} rel="noreferrer" target="_blank">official {subject.examBoard} specification</a>.
        </p> : null}
      </div>
    </section>
  )
}
