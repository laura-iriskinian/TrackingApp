import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { allExercises, db } from '../data/db'
import type { Template } from '../data/types'
import { nb } from '../lib/dates'

// Liste des modèles de séances : en choisir un, ou en supprimer
export function TemplatePicker({ title, onPick, onClose }: { title: string; onPick: (t: Template) => void; onClose: () => void }) {
  const templates = useLiveQuery(() => db.templates.toArray())
  const exercises = useLiveQuery(allExercises) ?? []
  const [del, setDel] = useState<string | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  const names = (t: Template) => t.items.map(i => exercises.find(e => e.id === i.exerciseId)?.name).filter(Boolean).join(', ')
  const list = [...(templates ?? [])].sort((a, b) => a.title.localeCompare(b.title, 'fr'))

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="tp-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="tp-t">{title}</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list">
          {templates && !list.length && (
            <p className="sub">Aucun modèle pour l'instant. Dans le planning, prépare une séance puis « Enregistrer comme modèle ».</p>
          )}
          <div className="pick-group">
            {list.map(t => (
              <div key={t.id} className="pick-row">
                <button className="pick tpl" onClick={() => onPick(t)}>
                  <b>{t.title}</b>
                  <span className="data">{nb(t.items.length, 'exercice')} · {names(t)}</span>
                </button>
                {del === t.id
                  ? <button className="link pick-info tpl-del" onClick={() => { db.templates.delete(t.id); setDel(null) }}>Confirmer</button>
                  : <button className="link pick-info" aria-label={`Supprimer le modèle ${t.title}`} onClick={() => setDel(t.id)}>Supprimer</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
