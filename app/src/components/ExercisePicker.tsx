import { useEffect, useState } from 'react'
import { db } from '../data/db'
import { EQUIPMENT, norm, slug } from '../data/exercises'
import type { Equipment, Exercise } from '../data/types'
import { ExerciseSheet } from './ExerciseSheet'

interface ListProps {
  exercises: Exercise[]
  exclude?: string[]
  onPick: (ex: Exercise) => void
  canCreate?: boolean
  infoLinks?: boolean // lien vers la fiche à côté de chaque exercice
}

// Recherche, filtre par matériel, liste par groupe musculaire. Chaque exercice a sa fiche.
export function ExerciseList({ exercises, exclude = [], onPick, canCreate, infoLinks = true }: ListProps) {
  const [q, setQ] = useState('')
  const [eq, setEq] = useState<Equipment | 'cardio' | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)

  const n = norm(q)
  const list = exercises
    .filter(e => !exclude.includes(e.id) && (!n || norm(e.name).includes(n) || norm(e.group).includes(n)))
    .filter(e => !eq || (eq === 'cardio' ? e.kind === 'cardio' : e.equipment === eq))
    .sort((a, b) => a.group.localeCompare(b.group, 'fr') || a.name.localeCompare(b.name, 'fr'))
  const groups = [...new Set(list.map(e => e.group))]
  const exact = exercises.some(e => norm(e.name) === n)

  const create = async () => {
    const name = q.trim().replace(/\s+/g, ' ').slice(0, 60)
    const ex: Exercise = { id: 'perso-' + slug(name), name, kind: 'strength', group: 'Mes exercices', primary: [], secondary: [], custom: true }
    await db.exercises.put(ex)
    onPick(ex)
  }

  return (
    <>
      <input className="input" type="search" placeholder="Rechercher (ex. squat, dos…)" value={q}
        onChange={e => setQ(e.target.value)} aria-label="Rechercher un exercice" />
      <div className="chips eq-chips" role="group" aria-label="Matériel">
        <button aria-pressed={!eq} onClick={() => setEq(null)}>Tout</button>
        {[...EQUIPMENT, { id: 'cardio' as const, label: 'Cardio' }].map(x => (
          <button key={x.id} aria-pressed={eq === x.id} onClick={() => setEq(eq === x.id ? null : x.id)}>{x.label}</button>
        ))}
      </div>
      <div className="picker-list">
        {canCreate && q.trim() && !exact && (
          <button className="pick new" onClick={create}>
            <b>Créer « {q.trim()} »</b><span className="data">nouvel exercice</span>
          </button>
        )}
        {groups.map(g => (
          <div key={g} className="pick-group">
            <span className="eyebrow">{g}</span>
            {list.filter(e => e.group === g).map(e => (
              <div key={e.id} className="pick-row">
                <button className="pick" onClick={() => onPick(e)}><b>{e.name}</b></button>
                {infoLinks && !e.custom && <button className="link pick-info" aria-label={`Fiche : ${e.name}`} onClick={() => setInfo(e)}>Fiche</button>}
              </div>
            ))}
          </div>
        ))}
        {!list.length && !q.trim() && <p className="sub">Aucun exercice avec ce matériel.</p>}
      </div>
      {info && <ExerciseSheet ex={info} onClose={() => setInfo(null)} />}
    </>
  )
}

interface Props {
  exercises: Exercise[]
  exclude?: string[]
  onPick: (ex: Exercise) => void
  onClose: () => void
}

// Choix d'un exercice : recherche, liste par groupe musculaire, création si introuvable
export function ExercisePicker({ exercises, exclude, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="pk-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="pk-t">Ajouter un exercice</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <ExerciseList exercises={exercises} exclude={exclude} onPick={onPick} canCreate />
      </div>
    </div>
  )
}
