import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db } from '../data/db'
import { MUSCLE_LABEL } from '../data/exercises'
import type { Workout } from '../data/types'
import { fmtNum, fmtThousands, longDate } from '../lib/dates'
import { bestOf, seriesOf, setsOf, type ExMetric } from '../lib/records'
import { entrySummary } from '../lib/summary'
import { LineChart } from '../components/LineChart'
import { MuscleMap } from '../components/MuscleMap'
import { Body } from './Body'
import { Goals } from './Goals'
import { Photos } from './Photos'

type Part = 'exercices' | 'corps' | 'photos' | 'objectifs'
const PART_KEY = 'nextrep-progres'

export function Progress() {
  const [part, setPart] = useState<Part>(() => {
    try { return (localStorage.getItem(PART_KEY) as Part) || 'exercices' } catch { return 'exercices' }
  })
  const pick = (p: Part) => {
    setPart(p)
    try { localStorage.setItem(PART_KEY, p) } catch { /* sans importance */ }
  }
  return (
    <div className="screen">
      <header className="head"><h1>Progrès</h1></header>
      <div className="seg" role="group" aria-label="Partie">
        {([['exercices', 'Exercices'], ['corps', 'Corps'], ['photos', 'Photos'], ['objectifs', 'Objectifs']] as const).map(([v, l]) => (
          <button key={v} aria-pressed={part === v} onClick={() => pick(v)}>{l}</button>
        ))}
      </div>
      {part === 'exercices' ? <Exercises /> : part === 'corps' ? <Body /> : part === 'photos' ? <Photos /> : <Goals />}
    </div>
  )
}

const METRICS: Record<'strength' | 'cardio', { id: ExMetric; label: string; unit: string }[]> = {
  strength: [
    { id: 'weight', label: 'Charge max', unit: 'kg' },
    { id: 'e1rm', label: '1RM estimé', unit: 'kg' },
    { id: 'volume', label: 'Volume', unit: 'kg' },
  ],
  cardio: [
    { id: 'km', label: 'Distance', unit: 'km' },
    { id: 'min', label: 'Durée', unit: 'min' },
  ],
}

function Exercises() {
  const exercises = useLiveQuery(allExercises) ?? []
  const used = useLiveQuery(async () => new Set((await db.workouts.toArray()).flatMap(w => w.exerciseIds)))
  const [id, setId] = useState('')
  const [metric, setMetric] = useState<ExMetric>('weight')
  const history = useLiveQuery(async (): Promise<Workout[]> => (id ? db.workouts.where('exerciseIds').equals(id).sortBy('date') : []), [id]) ?? []

  const options = exercises.filter(e => used?.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const ex = exercises.find(e => e.id === id)
  const entries = history.map(w => ({ date: w.date, entry: w.entries.find(e => e.exerciseId === id)! })).filter(x => x.entry)
  const cardio = ex?.kind === 'cardio'
  const best = bestOf(setsOf(history, id))
  const metrics = METRICS[cardio ? 'cardio' : 'strength']
  const m = metrics.find(x => x.id === metric) ?? metrics[0]
  const fmt = m.id === 'volume' ? fmtThousands : (n: number) => fmtNum(Math.round(n * 10) / 10)

  if (used && !options.length) {
    return <section className="card"><p className="empty">Enregistre des séances pour voir ta progression ici.</p></section>
  }

  return (
    <>
      <section className="card">
        <div className="field">
          <label htmlFor="p-ex">Exercice</label>
          <select id="p-ex" className="input" value={id} onChange={e => { setId(e.target.value); setMetric('weight') }}>
            <option value="">Choisir un exercice…</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </section>

      {ex && (
        <>
          <section className="card" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <div className="p-kpis">
              {cardio ? (
                <>
                  <div><span className="sub">Plus longue distance</span><span className="big">{best.km ? fmtNum(best.km) : '—'}<span className="unit">km</span></span></div>
                  <div><span className="sub">Plus longue durée</span><span className="big">{best.min ? fmtNum(best.min) : '—'}<span className="unit">min</span></span></div>
                </>
              ) : (
                <>
                  <div><span className="sub">Charge maximale</span><span className="big">{best.weight ? fmtNum(best.weight) : '—'}<span className="unit">kg</span></span></div>
                  <div><span className="sub">1RM estimé</span><span className="big">{best.e1rm ? fmtNum(Math.round(best.e1rm * 2) / 2) : '—'}<span className="unit">kg</span></span></div>
                </>
              )}
              <span className="sub">{entries.length} séance{entries.length > 1 ? 's' : ''}{ex.primary.length > 0 && ' · ' + ex.primary.map(x => MUSCLE_LABEL[x]).join(', ')}</span>
            </div>
            {ex.primary.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <MuscleMap view="front" primary={ex.primary} secondary={ex.secondary} className="p-fig" label="Muscles travaillés, de face" />
                <MuscleMap view="back" primary={ex.primary} secondary={ex.secondary} className="p-fig" label="Muscles travaillés, de dos" />
              </div>
            )}
          </section>

          <section className="card">
            <div className="seg" role="group" aria-label="Courbe">
              {metrics.map(x => <button key={x.id} aria-pressed={m.id === x.id} onClick={() => setMetric(x.id)}>{x.label}</button>)}
            </div>
            <LineChart points={seriesOf(history, id, m.id)} unit={m.unit} format={fmt}
              label={`${m.label} sur ${ex.name}, séance par séance`} />
            {m.id === 'e1rm' && <p className="data">Charge que tu pourrais soulever une fois, estimée à partir de tes séries. Utile pour comparer des séries aux répétitions différentes.</p>}
          </section>

          <section className="card">
            <h2>Historique</h2>
            <div className="list">
              {[...entries].reverse().slice(0, 12).map((x, i) => (
                <div key={i} className="li">
                  <b>{longDate(x.date)}</b>
                  <span className="data" style={{ gridColumn: '1 / -1' }}>{entrySummary(x.entry, ex)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <style>{'.p-fig{width:52px;height:auto}.p-kpis{display:grid;gap:10px}.p-kpis>div{display:grid;gap:2px}.p-kpis .big{font-size:2.1rem}'}</style>
    </>
  )
}
