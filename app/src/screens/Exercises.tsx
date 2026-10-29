import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises } from '../data/db'
import type { Exercise } from '../data/types'
import { ExerciseList } from '../components/ExercisePicker'
import { ExerciseSheet } from '../components/ExerciseSheet'
import './Session.css'

// Catalogue : toutes les fiches, à consulter avant ou pendant une séance
export function Exercises({ onClose }: { onClose: () => void }) {
  const exercises = useLiveQuery(allExercises) ?? []
  const [open, setOpen] = useState<Exercise | null>(null)
  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onClose}>‹ Retour</button>
      </header>
      <div className="head">
        <h1>Exercices</h1>
        <span className="sub">Comment faire chaque exercice, les erreurs à éviter et les muscles travaillés.</span>
      </div>
      <section className="card catalog">
        <ExerciseList exercises={exercises} onPick={setOpen} infoLinks={false} />
      </section>
      {open && <ExerciseSheet ex={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
