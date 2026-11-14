import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db } from '../data/db'
import { applyProgram, defaultDays, programTags, type Program } from '../data/programs'
import type { Exercise } from '../data/types'
import { DAYS } from '../lib/dates'
import { planLine } from '../lib/summary'
import { ExerciseSheet } from './ExerciseSheet'
import { ConfirmSheet, useToast } from './ui'


// Détail d'un programme : séances, exercices (avec leur fiche), choix des jours (facultatif), puis ajout aux séances
export function ProgramView({ program, onApplied }: { program: Program; onApplied: () => void }) {
  const exercises = useLiveQuery(allExercises) ?? []
  // Séances déjà prévues certains jours : elles perdront leurs jours au profit du programme
  const planned = useLiveQuery(async () => (await db.templates.toArray()).filter(t => t.days?.length && !program.sessions.some(s => s.title === t.title)).length)
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
    toast('Séances du programme ajoutées')
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
        <p className="sub">
          {days.length === n ? 'Tu pourras tout changer ensuite dans tes séances.'
            : days.length ? `Choisis ${n} jours (${days.length} sur ${n}), ou aucun.`
            : 'Aucun jour fixe : tu lanceras chaque séance quand tu veux.'}
        </p>
        <div className="chips wrap" role="group" aria-label="Jours d'entraînement">
          {DAYS.map((d, i) => (
            <button key={d} aria-pressed={days.includes(i)} onClick={() => toggle(i)}>{d}</button>
          ))}
        </div>
        <button className="btn go" disabled={(days.length !== n && days.length > 0) || planned === undefined} onClick={() => (planned && days.length ? setConfirm(true) : apply())}>
          Suivre ce programme
        </button>
      </section>

      {confirm && (
        <ConfirmSheet title="Changer tes jours ?"
          text={`${planned! > 1 ? `Tes ${planned} séances prévues` : 'Ta séance prévue'} certains jours ${planned! > 1 ? 'resteront' : 'restera'} dans ta liste, mais sans jour fixe : le programme prend leur place dans la semaine.`}
          confirmLabel="Continuer" onConfirm={apply} onClose={() => setConfirm(false)} />
      )}
      {info && <ExerciseSheet ex={info} onClose={() => setInfo(null)} />}
    </>
  )
}
