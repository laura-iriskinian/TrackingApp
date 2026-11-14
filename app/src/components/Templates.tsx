import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { allExercises, db } from '../data/db'
import { daysLabel, lastDone, suggestRoutine } from '../data/routines'
import type { Template } from '../data/types'
import { addDays, parse, today } from '../lib/dates'

// « aujourd'hui », « hier », « il y a 5 jours »
function ago(d: string, t: string) {
  const n = Math.round((parse(t).getTime() - parse(d).getTime()) / 864e5)
  return n <= 0 ? "faite aujourd'hui" : n === 1 ? 'faite hier' : `faite il y a ${n} jours`
}

// Choix de la séance à lancer, parmi les séances enregistrées. Celle qui sollicite les muscles les plus reposés est conseillée.
export function SessionPicker({ title, onPick, onFree, onManage, onClose }: {
  title: string
  onPick: (t: Template) => void
  onFree?: () => void // séance libre, sans rien de prévu
  onManage?: () => void // aller créer ou modifier ses séances
  onClose: () => void
}) {
  const templates = useLiveQuery(() => db.templates.toArray())
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? []
  const exercises = useLiveQuery(allExercises) ?? []
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  const t = today()
  const names = (x: Template) => x.items.map(i => exercises.find(e => e.id === i.exerciseId)?.name).filter(Boolean).join(', ')
  const list = (templates ?? []).filter(x => x.items.length).sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  const recent = workouts.filter(w => w.date >= addDays(t, -7))
  const best = exercises.length ? suggestRoutine(list, recent, exercises, t) : undefined
  const ordered = best ? [best, ...list.filter(x => x.id !== best.id)] : list

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="tp-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="tp-t">{title}</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list">
          {templates && !list.length && (
            <p className="sub">Aucune séance enregistrée pour l'instant. Crée tes séances dans le planning pour les retrouver ici.</p>
          )}
          <div className="pick-group">
            {ordered.map(x => {
              const last = lastDone(x, workouts)
              return (
                <button key={x.id} className={'pick tpl' + (x === best ? ' best' : '')} onClick={() => onPick(x)}>
                  {x === best && <span className="eyebrow best-tag">Conseillée : muscles les plus reposés</span>}
                  <b>{x.title}</b>
                  <span className="data">{[x.days?.length ? daysLabel(x.days) : '', last ? ago(last, t) : 'jamais faite'].filter(Boolean).join(' · ')}</span>
                  <span className="data">{names(x)}</span>
                </button>
              )
            })}
          </div>
          {onFree && <button className="btn soft" onClick={onFree}>Séance libre</button>}
          {onManage && <button className="link plan-link" onClick={onManage}>{list.length ? 'Gérer mes séances' : 'Créer une séance'}</button>}
        </div>
      </div>
    </div>
  )
}
