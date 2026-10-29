import { useEffect, useRef, useState } from 'react'
import { fmtNum, parse } from '../lib/dates'

interface Props {
  points: { x: string; y: number }[] // x : date AAAA-MM-JJ
  unit: string
  label: string // décrit la courbe pour les lecteurs d'écran
  format?: (n: number) => string
}

const H = 180, PAD = { t: 16, r: 50, b: 24, l: 44 }
const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const shortDate = (s: string) => `${parse(s).getDate()} ${SHORT_MONTHS[parse(s).getMonth()]}`

// Graduations rondes : 3 ou 4 valeurs couvrant l'étendue
function ticks(min: number, max: number) {
  const span = max - min || Math.abs(max) || 1
  const raw = span / 3, mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw)!
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step
  const out = []
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6))
  return out.length < 2 ? [lo, lo + step] : out
}

// Courbe d'une seule série : ligne fine, léger fond, valeur au bout, détail au toucher
export function LineChart({ points, unit, label, format = fmtNum }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (points.length < 2) {
    return <p className="sub chart-empty">{points.length ? 'Encore une valeur et la courbe apparaîtra.' : 'Pas encore de valeur.'}</p>
  }

  const ys = points.map(p => p.y)
  const tk = ticks(Math.min(...ys), Math.max(...ys))
  const y0 = tk[0], y1 = tk[tk.length - 1]
  const t = points.map(p => parse(p.x).getTime())
  const t0 = t[0], t1 = t[t.length - 1] === t0 ? t0 + 1 : t[t.length - 1]
  const X = (i: number) => PAD.l + ((t[i] - t0) / (t1 - t0)) * (w - PAD.l - PAD.r)
  const Y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')
  const area = `${line}L${X(points.length - 1).toFixed(1)},${H - PAD.b}L${X(0).toFixed(1)},${H - PAD.b}Z`
  const last = points.length - 1

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect(), x = clientX - r.left
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i
    setHover(best)
  }
  const h = hover != null ? points[hover] : null
  const tipLeft = hover != null ? Math.min(Math.max(X(hover) - 60, 0), w - 120) : 0

  return (
    <div ref={box} className="chart" onPointerMove={e => pick(e.clientX)} onPointerDown={e => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img" aria-label={label}>
        {tk.map(v => (
          <g key={v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={Y(v)} y2={Y(v)} className="chart-grid" />
            <text x={PAD.l - 6} y={Y(v)} className="chart-tick" textAnchor="end" dominantBaseline="middle">{format(v)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="chart-tick">{shortDate(points[0].x)}</text>
        <text x={w - PAD.r} y={H - 6} className="chart-tick" textAnchor="end">{shortDate(points[last].x)}</text>
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" />
        {h && <line x1={X(hover!)} x2={X(hover!)} y1={PAD.t} y2={H - PAD.b} className="chart-cross" />}
        <circle cx={X(last)} cy={Y(points[last].y)} r={4} className="chart-dot" />
        {hover != null && hover !== last && <circle cx={X(hover)} cy={Y(points[hover].y)} r={4} className="chart-dot" />}
        <text x={X(last) + 8} y={Y(points[last].y)} className="chart-end" dominantBaseline="middle">{format(points[last].y)}</text>
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: tipLeft }} aria-hidden="true">
          <b>{format(h.y)} {unit}</b><span>{shortDate(h.x)}</span>
        </div>
      )}
    </div>
  )
}
