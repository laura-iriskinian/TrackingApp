import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { TemplatePicker } from '../components/Templates'
import { allExercises, db } from '../data/db'
import { longDate, MONTHS, parse } from '../lib/dates'
import { entrySummary } from '../lib/summary'
import { getSession, startSession } from '../data/session'
import { openExercises, openPlanning, openPrograms, openSession, openTimer, openWorkoutEdit } from '../lib/nav'

export function Workouts() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray())
  const exercises = useLiveQuery(allExercises) ?? []
  const exById = (id: string) => exercises.find(e => e.id === id)
  const active = useLiveQuery(getSession)
  const [tpl, setTpl] = useState(false)
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
      <header className="head w-top">
        <h1>Séances</h1>
        <div className="row">
          <button className="pill soft" onClick={openPlanning}>Planning</button>
          <button className="pill soft" onClick={openTimer}>Minuteur</button>
        </div>
      </header>
      <button className="btn go" onClick={start}>{active ? 'Reprendre la séance en cours' : 'Nouvelle séance'}</button>
      {!active && <button className="btn soft" onClick={() => setTpl(true)}>Partir d'un modèle</button>}
      <button className="btn soft" onClick={() => openWorkoutEdit()}>Ajouter une séance passée</button>
      <div className="row">
        <button className="btn soft" onClick={openPrograms}>Programmes</button>
        <button className="btn soft" onClick={openExercises}>Exercices</button>
      </div>

      {workouts && !workouts.length && (
        <section className="card">
          <h2>Aucune séance pour l'instant</h2>
          <p className="sub">
            Lance une séance : tu notes chaque série, et le repos se déclenche tout seul.
            Si tu utilises Suivi sport sur ce téléphone, tu peux récupérer ton historique depuis l'onglet Profil.
          </p>
        </section>
      )}

      {tpl && (
        <TemplatePicker title="Lancer un modèle" onClose={() => setTpl(false)}
          onPick={async t => { setTpl(false); await startSession(t.title, t.items, exercises); openSession() }} />
      )}

      {[...byMonth].map(([month, list]) => (
        <section key={month} className="month">
          <h2 className="eyebrow" style={{ padding: '10px 4px 8px' }}>
            {MONTHS[parse(month + '-01').getMonth()]} {month.slice(0, 4)} · {list.length} séance{list.length > 1 ? 's' : ''}
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map(w => (
              <article key={w.id} className="card">
                <div className="w-head">
                  <span className="sub">{longDate(w.date)}</span>
                  <button className="link" onClick={() => openWorkoutEdit(w.id)} aria-label={`Modifier la séance du ${longDate(w.date).toLowerCase()}`}>Modifier</button>
                </div>
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
