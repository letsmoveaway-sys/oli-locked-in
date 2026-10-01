import { useState } from 'react'
import type { Analytics } from '../types'
import { BurndownChart } from './BurndownChart'

export function AnalyticsDashboard({ analytics }: { analytics: Analytics }) {
  const [subjectId, setSubjectId] = useState('overall')
  const selected = analytics.subjects.find((subject) => subject.subjectId === subjectId)
  const metrics = selected ?? analytics.overall
  const points = subjectId === 'overall' ? analytics.burndown : analytics.subjectBurndown[subjectId] ?? []
  return <section aria-labelledby="analytics-heading">
    <div className="section-heading"><div><p className="eyebrow">Your evidence over time</p><h2 id="analytics-heading">Progress and workload</h2></div><label className="filter-label">View<select onChange={(event) => setSubjectId(event.target.value)} value={subjectId}><option value="overall">Overall</option>{analytics.subjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</option>)}</select></label></div>
    <div className="metric-grid">
      <article><strong>{metrics.coverage}%</strong><span>Coverage</span><small>Syllabus visited</small></article>
      <article><strong>{metrics.mastery ?? '—'}{metrics.mastery === null ? '' : '%'}</strong><span>Mastery</span><small>Evidence-based understanding</small></article>
      <article><strong>{metrics.workloadRemaining}</strong><span>Estimated sessions left</span><small>Based on topic size and current evidence</small></article>
      <article><strong>{metrics.consistency}%</strong><span>Consistency</span><small>Completion against plan</small></article>
    </div>
    <div className="analytics-grid"><article className="card analytics-card"><div className="card-heading"><h3>Workload burndown</h3><span className={`track-status track-status--${analytics.onTrack}`}>{analytics.onTrack.replaceAll('_', ' ')}</span></div><BurndownChart points={points} /></article><article className="card analytics-card"><h3>Current RAG distribution</h3><div className="rag-bars">{(['grey', 'red', 'amber', 'green'] as const).map((rag) => { const count = metrics.rag[rag]; const total = Object.values(metrics.rag).reduce((sum, value) => sum + value, 0); return <div key={rag}><span>{rag}</span><div><i className={`rag-fill rag-fill--${rag}`} style={{ width: `${100 * count / Math.max(1, total)}%` }} /></div><strong>{count}</strong></div> })}</div></article></div>
  </section>
}
