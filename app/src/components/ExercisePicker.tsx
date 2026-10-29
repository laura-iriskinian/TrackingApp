import { useEffect, useState } from 'react'
import { db } from '../data/db'
import { norm, slug } from '../data/exercises'
import type { Exercise } from '../data/types'

interface Props {
  exercises: Exercise[]
  exclude?: string[]
  onPick: (ex: Exercise) => void
  onClose: () => void
}

// Choix d'un exercice : recherche, liste par groupe musculaire, création si introuvable
export function ExercisePicker({ exercises, exclude = [], onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const n = norm(q)
  const list = exercises
    .filter(e => !exclude.includes(e.id) && (!n || norm(e.name).includes(n) || norm(e.group).includes(n)))
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
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="pk-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="pk-t">Ajouter un exercice</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <input className="input" type="search" placeholder="Rechercher (ex. squat, dos…)" value={q}
          onChange={e => setQ(e.target.value)} aria-label="Rechercher un exercice" />
        <div className="picker-list">
          {q.trim() && !exact && (
            <button className="pick new" onClick={create}>
              <b>Créer « {q.trim()} »</b><span className="data">nouvel exercice</span>
            </button>
          )}
          {groups.map(g => (
            <div key={g} className="pick-group">
              <span className="eyebrow">{g}</span>
              {list.filter(e => e.group === g).map(e => (
                <button key={e.id} className="pick" onClick={() => onPick(e)}><b>{e.name}</b></button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
