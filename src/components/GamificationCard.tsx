import { type FormEvent, useState } from 'react'
import type { Analytics } from '../types'

interface Props { data: Analytics['gamification']; editable: boolean; onGoal: (minutes: number) => Promise<void> }
export function GamificationCard({ data, editable, onGoal }: Props) {
  const [editing, setEditing] = useState(false); const [goal, setGoal] = useState(String(data.weeklyGoalMinutes))
  async function submit(event: FormEvent) { event.preventDefault(); await onGoal(Number(goal)); setEditing(false) }
  const goalPercent = Math.min(100, Math.round(100 * data.weeklyCompletedMinutes / Math.max(1, data.weeklyGoalMinutes)))
  return <section className="game-card card" aria-labelledby="game-heading"><div className="game-level"><span>Level</span><strong>{data.level}</strong><small>{data.xp} XP total</small></div><div className="game-main"><h3 id="game-heading">Weekly momentum</h3><div className="goal-heading"><span>{data.weeklyCompletedMinutes} / {data.weeklyGoalMinutes} minutes</span><strong>{goalPercent}%</strong></div><div className="goal-bar"><span style={{ width: `${goalPercent}%` }} /></div><p><strong>{data.streak}-day streak</strong> · {100 - data.levelProgress} XP to level {data.level + 1}</p>{editable && !editing ? <button className="text-button" onClick={() => setEditing(true)} type="button">Change weekly goal</button> : null}{editing ? <form className="goal-form" onSubmit={submit}><label>Weekly minutes<input min="30" max="1200" onChange={(event) => setGoal(event.target.value)} type="number" value={goal} /></label><button type="submit">Save</button></form> : null}</div><div className="achievement-strip" aria-label="Achievements">{data.achievements.map((item) => <span className={item.unlocked ? 'achievement achievement--unlocked' : 'achievement'} key={item.id} title={item.description}>{item.unlocked ? '★' : '☆'} {item.name}</span>)}</div></section>
}
