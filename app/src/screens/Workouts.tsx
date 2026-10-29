import { useLiveQuery } from 'dexie-react-hooks'
import { allExercises, db } from '../data/db'
import { longDate, MONTHS, parse } from '../lib/dates'
import { entrySummary } from '../lib/summary'
import { getSession, startSession } from '../data/session'
import { openSession } from '../lib/nav'

export function Workouts() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray())
  const exercises = useLiveQuery(allExercises) ?? []
  const exById = (id: string) => exercises.find(e => e.id === id)
  const active = useLiveQuery(getSession)
  const start = async () => {
    if (!active) await startSession(undefined, [], exercises)
    openSession()
  }

  const byMonth = new Map<string, NonNullable<typeof workouts>>()
  for (const w of workouts ?? []) {
    const k = w.date.slice(0, 7)
    byMonth.set(k, [...(byMonth.get(k) ?? []), w])
  }

  return (
    <div className="screen">
      <header className="head"><h1>Séances</h1></header>
      <button className="btn go" onClick={start}>{active ? 'Reprendre la séance en cours' : 'Nouvelle séance'}</button>

      {workouts && !workouts.length && (
        <section className="card">
          <h2>Aucune séance pour l'instant</h2>
          <p className="sub">
            Lance une séance : tu notes chaque série, et le repos se déclenche tout seul.
            Si tu utilises Suivi sport sur ce téléphone, tu peux récupérer ton historique depuis l'onglet Profil.
          </p>
        </section>
      )}

      {[...byMonth].map(([month, list]) => (
        <section key={month} className="month">
          <h2 className="eyebrow" style={{ padding: '10px 4px 8px' }}>
            {MONTHS[parse(month + '-01').getMonth()]} {month.slice(0, 4)} · {list.length} séance{list.length > 1 ? 's' : ''}
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map(w => (
              <article key={w.id} className="card">
                <span className="sub">{longDate(w.date)}</span>
                <div className="list">
                  {w.entries.map((e, i) => (
                    <div key={i} className="li">
                      <b>{exById(e.exerciseId)?.name ?? 'Exercice'}</b>
                      <span className="data" style={{ gridColumn: '1 / -1' }}>{entrySummary(e, exById(e.exerciseId))}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
