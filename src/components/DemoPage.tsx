import { useState } from 'react'

type DemoView = 'today' | 'practice' | 'planner' | 'parent'

const quizOptions = [
  'He developed vaccination against smallpox',
  'He discovered penicillin',
  'He introduced the NHS',
]

export function DemoPage() {
  const [view, setView] = useState<DemoView>('today')
  const [completed, setCompleted] = useState(false)
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [tuesdayAvailable, setTuesdayAvailable] = useState(true)

  const quizCorrect = checked && answer === 0
  const mastery = completed ? 57 : 42
  const xp = completed ? 110 : 100

  return <main className="app-shell demo-shell" id="main-content">
    <a className="skip-link" href="#demo-navigation">Skip to demo navigation</a>
    <header className="topbar demo-topbar">
      <div><p className="eyebrow">Oli: Locked In</p><p className="identity">Public interactive demo</p></div>
      <a className="demo-sign-in" href="/">Private sign in</a>
    </header>

    <section className="card demo-hero" aria-labelledby="demo-heading">
      <div><p className="eyebrow">See the revision journey</p><h1 id="demo-heading">A clearer plan for GCSE revision.</h1><p>Try a sample session, answer a practice question and change the week’s availability. The parent view shows the same example progress at a glance.</p></div>
      <div className="demo-note"><strong>Sample data only</strong><span>Nothing here is saved or connected to a real student account.</span></div>
    </section>

    <nav className="view-tabs demo-tabs" aria-label="Demo views" id="demo-navigation">
      {([['today', 'Today'], ['practice', 'Learn & practise'], ['planner', 'Weekly plan'], ['parent', 'Parent view']] as const).map(([id, label]) =>
        <button aria-pressed={view === id} key={id} onClick={() => setView(id)} type="button">{label}</button>,
      )}
    </nav>

    {view === 'today' ? <section aria-labelledby="demo-today-heading">
      <div className="section-heading"><div><p className="eyebrow">Student dashboard</p><h2 id="demo-today-heading">Today’s focus</h2><p>A short plan with a reason for every session.</p></div></div>
      <div className="dashboard-stats demo-stats">
        <article className="mini-stat"><strong>{mastery}%</strong><span>Medicine mastery</span></article>
        <article className="mini-stat"><strong>{completed ? '1/1' : '0/1'}</strong><span>sessions completed</span></article>
        <article className="mini-stat"><strong>{xp}</strong><span>sample XP</span></article>
      </div>
      <article className="card demo-session">
        <div><p className="eyebrow">History · 25 minutes</p><h3>Medicine in Britain: Jenner and vaccination</h3><span className={`rag-label rag--${completed ? 'amber' : 'red'}`}>{completed ? 'Amber' : 'Red'}</span><p className="reason">Why this is here: this topic needs another review before the exam.</p></div>
        <div>{completed ? <p className="success" role="status">Session complete. The example mastery and XP have updated.</p> : <button onClick={() => setCompleted(true)} type="button">Complete sample session</button>}<button className="secondary" onClick={() => setView('practice')} type="button">Try a practice question</button></div>
      </article>
    </section> : null}

    {view === 'practice' ? <section aria-labelledby="demo-practice-heading">
      <div className="section-heading"><div><p className="eyebrow">Learn & practise</p><h2 id="demo-practice-heading">Try a History question</h2><p>A short example from the confirmed Edexcel Medicine course.</p></div></div>
      <div className="card demo-practice"><p className="tag tag--ready">Original practice question</p><h3>What was Edward Jenner’s contribution to medicine?</h3><fieldset><legend>Choose one answer</legend>{quizOptions.map((option, index) => <label className="demo-option" key={option}><input checked={answer === index} name="demo-answer" onChange={() => { setAnswer(index); setChecked(false) }} type="radio" />{option}</label>)}</fieldset><button disabled={answer === null} onClick={() => setChecked(true)} type="button">Check answer</button>{checked ? <p className={quizCorrect ? 'success' : 'assessment-hint'} role="status">{quizCorrect ? 'Correct. Jenner used cowpox to develop vaccination against smallpox.' : 'Try again. Jenner’s work led to smallpox vaccination; penicillin and the NHS came much later.'}</p> : null}</div>
    </section> : null}

    {view === 'planner' ? <section aria-labelledby="demo-plan-heading">
      <div className="section-heading"><div><p className="eyebrow">Adaptive planner</p><h2 id="demo-plan-heading">See the week adjust</h2><p>Change an available day and the sample session moves.</p></div></div>
      <div className="card demo-planner"><label className="demo-toggle"><input checked={tuesdayAvailable} onChange={(event) => setTuesdayAvailable(event.target.checked)} type="checkbox" />Available on Tuesday</label><div className="demo-week"><article className={tuesdayAvailable ? 'demo-day demo-day--active' : 'demo-day'}><strong>Tuesday</strong><span>{tuesdayAvailable ? 'Medicine review · 25 min' : 'Unavailable'}</span></article><article className={!tuesdayAvailable ? 'demo-day demo-day--active' : 'demo-day'}><strong>Thursday</strong><span>{tuesdayAvailable ? 'Open for other work' : 'Medicine review · 25 min'}</span></article></div><p className="muted" role="status">{tuesdayAvailable ? 'The review fits on Tuesday.' : 'Tuesday is unavailable, so the example review moves to Thursday.'}</p></div>
    </section> : null}

    {view === 'parent' ? <section aria-labelledby="demo-parent-heading">
      <div className="section-heading"><div><p className="eyebrow">Parent overview</p><h2 id="demo-parent-heading">Progress without the guesswork</h2><p>A sample summary of completed work, weak topics and the next session.</p></div></div>
      <div className="dashboard-stats demo-stats"><article className="mini-stat"><strong>{completed ? '1' : '0'}</strong><span>sessions completed</span></article><article className="mini-stat"><strong>{mastery}%</strong><span>Medicine mastery</span></article><article className="mini-stat"><strong>{completed ? 'Improving' : 'Needs review'}</strong><span>topic status</span></article></div>
      <div className="card demo-parent-card"><h3>Next step</h3><p>{completed ? 'The Medicine review is complete. Keep practising to turn Amber into Green.' : 'Medicine in Britain is a priority. The student has a 25-minute review in the sample plan.'}</p><button className="secondary" onClick={() => setView('today')} type="button">View student session</button></div>
    </section> : null}

    <footer className="demo-footer"><p>Demo changes reset when you leave this page.</p><a href="/">Go to private sign in</a></footer>
  </main>
}
