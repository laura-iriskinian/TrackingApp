import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db } from '../data/db'
import { DEFAULT_INTERVALS, phaseAt, phases, totalSec, type IntervalConfig } from '../lib/intervals'
import { beep, keepAwake, unlockAudio } from '../lib/signal'
import './Session.css'

const KEY = 'intervals'
const LABEL = { prep: 'Préparation', work: 'Exercice', rest: 'Repos' }
const FIELDS: { k: keyof IntervalConfig; label: string; step: number; min: number; unit: string }[] = [
  { k: 'work', label: 'Exercice', step: 5, min: 1, unit: 's' },
  { k: 'rest', label: 'Repos', step: 5, min: 0, unit: 's' },
  { k: 'rounds', label: 'Tours', step: 1, min: 1, unit: '' },
  { k: 'prep', label: 'Préparation', step: 5, min: 0, unit: 's' },
]

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
const vibrate = (ms: number) => { try { navigator.vibrate?.(ms) } catch { /* ignoré */ } }

// Minuteur par intervalles : exercice, repos, tours, préparation, avec des bips à chaque changement
export function Timer({ onClose }: { onClose: () => void }) {
  const saved = useLiveQuery(async () => (await db.kv.get(KEY))?.value as IntervalConfig | undefined, [], null)
  const c: IntervalConfig = { ...DEFAULT_INTERVALS, ...saved }
  // Temps écoulé : `base` secondes déjà faites, plus le temps depuis `since` si le minuteur tourne
  const [run, setRun] = useState<{ base: number; since?: number } | null>(null)
  const [now, setNow] = useState(Date.now)
  const last = useRef({ i: -1, sec: -1 })

  const running = run?.since != null
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 100)
    let release = () => {}
    keepAwake().then(r => { release = r })
    return () => { clearInterval(t); release() }
  }, [running])

  const list = phases(c)
  const elapsed = run ? run.base + (run.since != null ? (now - run.since) / 1000 : 0) : 0
  const at = run ? phaseAt(list, elapsed) : null
  const finished = run != null && !at

  // Bips : un ton par type de phase au changement, un bip court sur les 3 dernières secondes, trois à la fin
  useEffect(() => {
    if (!running) return
    if (!at) {
      setRun({ base: totalSec(c) })
      ;[0, .3, .6].forEach(d => beep(988, d, .2))
      vibrate(400)
      return
    }
    const p = list[at.i], sec = Math.ceil(at.left)
    if (at.i !== last.current.i) {
      beep(p.kind === 'work' ? 880 : p.kind === 'rest' ? 523 : 659, 0, .4)
      vibrate(200)
    } else if (sec !== last.current.sec && sec <= 3 && sec >= 1) {
      beep(660, 0, .12)
      vibrate(60)
    }
    last.current = { i: at.i, sec }
  })

  if (saved === null) return null

  const setField = (k: keyof IntervalConfig, v: number) => db.kv.put({ key: KEY, value: { ...c, [k]: v } })
  const toggle = () => {
    unlockAudio()
    if (running) setRun({ base: elapsed })
    else if (!run || finished) { last.current = { i: -1, sec: -1 }; setRun({ base: 0, since: Date.now() }) }
    else setRun({ base: run.base, since: Date.now() })
    setNow(Date.now())
  }
  const reset = () => setRun(null)

  const p = at ? list[at.i] : null
  const left = at ? Math.ceil(at.left) : finished ? 0 : c.work
  const frac = p && at ? at.left / p.sec : finished ? 0 : 1
  const R = 88, C = 2 * Math.PI * R
  const total = totalSec(c)

  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onClose}>‹ Retour</button>
      </header>
      <div className="head"><h1>Minuteur</h1></div>

      <section className={'card timer ' + (p?.kind ?? '')}>
        <span className="eyebrow">{finished ? 'Terminé' : p ? LABEL[p.kind] + (running ? '' : ' · en pause') : 'Prêt'}</span>
        <div className="ring">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r={R} className="ring-bg" />
            <circle cx="100" cy="100" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />
          </svg>
          <span className="ring-time" role="timer">{mmss(left)}</span>
        </div>
        <p className="sub timer-round">
          {finished ? `${c.rounds} tours faits` : p?.kind === 'work' ? `Tour ${p.round} sur ${c.rounds}` : p?.kind === 'rest' ? `Ensuite : tour ${p.round + 1} sur ${c.rounds}` : ' '}
        </p>
        <div className="row">
          <button className="btn go" onClick={toggle}>{running ? 'Pause' : finished ? 'Recommencer' : run ? 'Reprendre' : 'Démarrer'}</button>
          <button className="btn soft" onClick={reset} disabled={!run}>Réinitialiser</button>
        </div>
      </section>

      <section className="card">
        <div className="timer-fields">
          {FIELDS.map(f => (
            <div key={f.k} className="stepper">
              <label htmlFor={'tm-' + f.k}>{f.label}</label>
              <div>
                <button aria-label={`${f.label} moins ${f.step}`} disabled={!!run && !finished} onClick={() => setField(f.k, Math.max(f.min, c[f.k] - f.step))}>−</button>
                <input id={'tm-' + f.k} inputMode="numeric" autoComplete="off" value={c[f.k]} disabled={!!run && !finished}
                  onChange={e => { const n = parseInt(e.target.value, 10); setField(f.k, Number.isFinite(n) ? Math.max(f.min, Math.min(n, 3600)) : f.min) }} />
                <button aria-label={`${f.label} plus ${f.step}`} disabled={!!run && !finished} onClick={() => setField(f.k, Math.min(3600, c[f.k] + f.step))}>+</button>
              </div>
              <span className="data">{f.unit || 'tours'}</span>
            </div>
          ))}
        </div>
        <p className="sub">Durée totale : {Math.floor(total / 60)} min {String(total % 60).padStart(2, '0')} s</p>
      </section>
      <p className="data timer-note">
        Garde l'app ouverte : si l'écran s'éteint, le minuteur et les sons peuvent s'arrêter. Sur iPhone, le son est coupé quand le mode silencieux est activé.
      </p>
    </div>
  )
}
