import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db } from '../data/db'
import { applyProgram, defaultDays, programTags, type Program } from '../data/programs'
import type { Exercise } from '../data/types'
import { DAYS } from '../lib/dates'
import { planLine } from '../lib/summary'
import { ExerciseSheet } from './ExerciseSheet'
import { ConfirmSheet, useToast } from './ui'


// Détail d'un programme : séances, exercices (avec leur fiche), choix des jours, puis application au planning
export function ProgramView({ program, onApplied }: { program: Program; onApplied: () => void }) {
  const exercises = useLiveQuery(allExercises) ?? []
  const planned = useLiveQuery(async () => (await db.plans.toArray()).filter(p => p.items.length).length)
  const n = program.sessions.length
  const [days, setDays] = useState(() => defaultDays(n))
  const [confirm, setConfirm] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  const toast = useToast()
  const exById = (id: string) => exercises.find(e => e.id === id)
  const sorted = [...days].sort((a, b) => a - b)

  const toggle = (d: number) => setDays(days.includes(d) ? days.filter(x => x !== d) : days.length < n ? [...days, d] : days)
  const apply = async () => {
    await applyProgram(program, days)
    setConfirm(false)
    toast('Programme ajouté au planning')
    onApplied()
  }

  return (
    <>
      <section className="card">
        <span className="eyebrow">{programTags(program)}</span>
        <h2>{program.name}</h2>
        <p className="sub">{program.about}</p>
      </section>

      {program.sessions.map((s, i) => (
        <section key={i} className="card">
          <div>
            <span className="eyebrow">{sorted.length === n ? DAYS[sorted[i]] : `Séance ${i + 1}`}</span>
            <h2>{s.title}</h2>
          </div>
          <div className="list">
            {s.items.map((it, j) => {
              const ex = exById(it.exerciseId)
              return (
                <button key={j} className={'li prog-item' + (it.group ? ' linked' : '')} onClick={() => ex && setInfo(ex)}>
                  <b>{ex?.name ?? 'Exercice'}</b>
                  <span className="data">{planLine(it, ex)}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <section className="card">
        <h2>Tes jours</h2>
        <p className="sub">{days.length === n ? 'Tu pourras tout changer ensuite dans le planning.' : `Choisis ${n} jours (${days.length} sur ${n}).`}</p>
        <div className="chips wrap" role="group" aria-label="Jours d'entraînement">
          {DAYS.map((d, i) => (
            <button key={d} aria-pressed={days.includes(i)} onClick={() => toggle(i)}>{d}</button>
          ))}
        </div>
        <button className="btn go" disabled={days.length !== n || planned === undefined} onClick={() => (planned ? setConfirm(true) : apply())}>
          Suivre ce programme
        </button>
      </section>

      {confirm && (
        <ConfirmSheet title="Remplacer ton planning ?"
          text={`Ton planning actuel (${planned} jour${planned! > 1 ? 's' : ''} prévu${planned! > 1 ? 's' : ''}) sera remplacé par ce programme. Tes séances passées ne changent pas.`}
          confirmLabel="Remplacer" onConfirm={apply} onClose={() => setConfirm(false)} />
      )}
      {info && <ExerciseSheet ex={info} onClose={() => setInfo(null)} />}
    </>
  )
}
