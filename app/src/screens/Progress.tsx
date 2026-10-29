import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db } from '../data/db'
import { MUSCLE_LABEL } from '../data/exercises'
import type { Workout } from '../data/types'
import { fmtNum, longDate } from '../lib/dates'
import { entrySummary } from '../lib/summary'
import { MuscleMap } from '../components/MuscleMap'

export function Progress() {
  const exercises = useLiveQuery(allExercises) ?? []
  const used = useLiveQuery(async () => new Set((await db.workouts.toArray()).flatMap(w => w.exerciseIds)))
  const [id, setId] = useState('')
  const history = useLiveQuery(async (): Promise<Workout[]> => (id ? db.workouts.where('exerciseIds').equals(id).sortBy('date') : []), [id]) ?? []

  const options = exercises.filter(e => used?.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const ex = exercises.find(e => e.id === id)
  const entries = history.map(w => ({ date: w.date, entry: w.entries.find(e => e.exerciseId === id)! })).filter(x => x.entry)
  const sets = entries.flatMap(x => x.entry.sets)
  const cardio = ex?.kind === 'cardio'
  const best = cardio ? Math.max(0, ...sets.map(s => s.km ?? 0)) : Math.max(0, ...sets.map(s => s.weight ?? 0))

  return (
    <div className="screen">
      <header className="head"><h1>Progrès</h1></header>

      {used && !options.length ? (
        <section className="card"><p className="empty">Enregistre des séances pour voir ta progression ici.</p></section>
      ) : (
        <section className="card">
          <div className="field">
            <label htmlFor="p-ex">Exercice</label>
            <select id="p-ex" className="input" value={id} onChange={e => setId(e.target.value)}>
              <option value="">Choisir un exercice…</option>
              {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </section>
      )}

      {ex && (
        <>
          <section className="card" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <span className="sub">{cardio ? 'Plus longue distance' : 'Charge maximale'}</span>
              <span className="big">{best ? fmtNum(best) : '—'}<span className="unit">{cardio ? 'km' : 'kg'}</span></span>
              <span className="sub">{entries.length} séance{entries.length > 1 ? 's' : ''}</span>
              {ex.primary.length > 0 && <span className="data">{ex.primary.map(m => MUSCLE_LABEL[m]).join(', ')}</span>}
            </div>
            {ex.primary.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <MuscleMap view="front" primary={ex.primary} secondary={ex.secondary} className="p-fig" label="Muscles travaillés, de face" />
                <MuscleMap view="back" primary={ex.primary} secondary={ex.secondary} className="p-fig" label="Muscles travaillés, de dos" />
              </div>
            )}
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
      <style>{'.p-fig{width:52px;height:auto}'}</style>
    </div>
  )
}
