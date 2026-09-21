interface Point { date: string; idealRemaining: number; actualRemaining: number }

export function BurndownChart({ points }: { points: Point[] }) {
  if (!points.length) return <p>No burndown data yet.</p>
  const width = 640; const height = 240; const pad = 28
  const maximum = Math.max(1, ...points.flatMap((point) => [point.idealRemaining, point.actualRemaining]))
  const coords = (key: 'idealRemaining' | 'actualRemaining') => points.map((point, index) => {
    const x = pad + index * ((width - pad * 2) / Math.max(1, points.length - 1))
    const y = height - pad - (point[key] / maximum) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return <figure className="burndown-chart">
    <svg aria-labelledby="burndown-title burndown-description" role="img" viewBox={`0 0 ${width} ${height}`}>
      <title id="burndown-title">Revision workload burndown</title><desc id="burndown-description">Ideal and actual remaining revision workload over fourteen days.</desc>
      {[0, .25, .5, .75, 1].map((part) => <line key={part} x1={pad} x2={width - pad} y1={pad + part * (height - pad * 2)} y2={pad + part * (height - pad * 2)} />)}
      <polyline className="burndown-ideal" fill="none" points={coords('idealRemaining')} /><polyline className="burndown-actual" fill="none" points={coords('actualRemaining')} />
    </svg>
    <figcaption><span className="legend-actual">Actual</span><span className="legend-ideal">Ideal</span><small>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(points[0]!.date))} – {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(points.at(-1)!.date))}</small></figcaption>
  </figure>
}
