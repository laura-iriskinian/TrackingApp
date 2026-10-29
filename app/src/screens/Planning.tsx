import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db } from '../data/db'
import { newGroupId, SET_TYPES } from '../data/sets'
import type { Exercise, Plan, PlanItem, SetType } from '../data/types'
import { DAYS, today, weekday } from '../lib/dates'
import { ExercisePicker } from '../components/ExercisePicker'
import './Session.css'

const DEFAULT_SETS = 3

// Un groupe d'un seul exercice n'a plus de sens
function cleanGroups(items: PlanItem[]): PlanItem[] {
  return items.map(it => {
    if (!it.group || items.filter(x => x.group === it.group).length > 1) return it
    const { group: _, ...rest } = it
    return rest
  })
}

// Planning de la semaine : la séance prévue pour chaque jour. Chaque modification est enregistrée tout de suite.
export function Planning({ onClose }: { onClose: () => void }) {
  const [day, setDay] = useState(() => weekday(today()))
  const plans = useLiveQuery(() => db.plans.toArray())
  const exercises = useLiveQuery(allExercises) ?? []
  const [picking, setPicking] = useState(false)
  if (!plans) return null

  const plan: Plan = plans.find(p => p.weekday === day) ?? { weekday: day, title: '', items: [], updatedAt: 0 }
  const exById = (id: string) => exercises.find(e => e.id === id)
  const save = (patch: Partial<Plan>) => {
    const next = { ...plan, ...patch, updatedAt: Date.now() }
    if (!next.title && !next.items.length) db.plans.delete(day)
    else db.plans.put({ ...next, items: cleanGroups(next.items) })
  }
  const patchItem = (i: number, fn: (it: PlanItem) => PlanItem | null) =>
    save({ items: plan.items.flatMap((it, j) => (j === i ? (fn(it) ?? []) : [it])) })
  const move = (i: number, d: number) => {
    const items = [...plan.items]
    const [it] = items.splice(i, 1)
    items.splice(i + d, 0, it)
    // Déplacé hors de son groupe, l'exercice n'est plus enchaîné
    const n = items[i + d], prev = items[i + d - 1], next = items[i + d + 1]
    if (n.group && prev?.group !== n.group && next?.group !== n.group) delete items[i + d].group
    save({ items })
  }
  const link = (i: number, on: boolean) => {
    const items = plan.items.map(x => ({ ...x }))
    if (on) {
      const g = items[i].group ?? items[i + 1].group ?? newGroupId()
      items[i].group = g
      items[i + 1].group = g
    } else {
      const g = items[i].group, rest = newGroupId()
      items.forEach((x, j) => { if (j > i && x.group === g) x.group = rest })
      delete items[i].group
    }
    save({ items })
  }
  const add = (ex: Exercise) => {
    setPicking(false)
    save({ items: [...plan.items, ex.kind === 'cardio' ? { exerciseId: ex.id } : { exerciseId: ex.id, sets: DEFAULT_SETS }] })
  }
  const count = (d: number) => plans.find(p => p.weekday === d)?.items.length ?? 0

  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onClose}>‹ Retour</button>
      </header>
      <div className="head">
        <h1>Planning</h1>
        <span className="sub">Tes séances prévues pour chaque jour de la semaine.</span>
      </div>

      <div className="seg days" role="tablist" aria-label="Jour de la semaine">
        {DAYS.map((d, i) => (
          <button key={d} role="tab" aria-selected={day === i} aria-pressed={day === i} aria-label={d} onClick={() => setDay(i)}>
            {d.slice(0, 3)}{count(i) > 0 && <i aria-hidden="true" />}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="field">
          <label htmlFor="pl-title">Nom de la séance du {DAYS[day].toLowerCase()}</label>
          <input id="pl-title" className="input" key={day} defaultValue={plan.title} maxLength={60}
            placeholder={plan.items.length ? 'Ex. Jambes' : 'Repos'} onChange={e => save({ title: e.target.value.trim() })} />
        </div>
      </section>

      {plan.items.map((it, i) => {
        const ex = exById(it.exerciseId)
        const cardio = ex?.kind === 'cardio'
        const n = it.sets ?? (cardio ? 1 : DEFAULT_SETS)
        const linkedNext = it.group && plan.items[i + 1]?.group === it.group
        return (
          <section key={i} className={'card plan-item' + (it.group ? ' linked' : '') + (linkedNext ? ' link-next' : '')}>
            <div className="plan-item-head">
              <div>
                <span className="eyebrow">{it.group ? 'Superset' : ex?.group ?? 'Exercice'}</span>
                <h2>{ex?.name ?? 'Exercice supprimé'}</h2>
              </div>
              <div className="plan-move">
                <button className="link" disabled={i === 0} aria-label="Monter" onClick={() => move(i, -1)}>↑</button>
                <button className="link" disabled={i === plan.items.length - 1} aria-label="Descendre" onClick={() => move(i, 1)}>↓</button>
              </div>
            </div>
            {!cardio && (
              <>
                <div className="plan-sets">
                  <span className="sub">Séries</span>
                  <div className="mini-step">
                    <button aria-label="Une série de moins" disabled={n <= 1}
                      onClick={() => patchItem(i, x => ({ ...x, sets: n - 1, types: x.types?.slice(0, n - 1) }))}>−</button>
                    <b className="data">{n}</b>
                    <button aria-label="Une série de plus" disabled={n >= 12} onClick={() => patchItem(i, x => ({ ...x, sets: n + 1 }))}>+</button>
                  </div>
                </div>
                <ol className="plan-types">
                  {Array.from({ length: n }, (_, si) => (
                    <li key={si}>
                      <span className="data">Série {si + 1}</span>
                      <select value={it.types?.[si] ?? ''} aria-label={`Type de la série ${si + 1}`}
                        onChange={e => patchItem(i, x => {
                          const types = Array.from({ length: n }, (_, k) => x.types?.[k] ?? null)
                          types[si] = (e.target.value || null) as SetType | null
                          return types.some(Boolean) ? { ...x, types } : { ...x, types: undefined }
                        })}>
                        {SET_TYPES.map(t => <option key={t.label} value={t.id ?? ''}>{t.label}</option>)}
                      </select>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="row cur-tools">
              {it.group
                ? <button className="link" onClick={() => link(i, false)}>Ne plus enchaîner</button>
                : i < plan.items.length - 1 && <button className="link" onClick={() => link(i, true)}>Enchaîner avec le suivant</button>}
              <button className="link" onClick={() => patchItem(i, () => null)}>Retirer</button>
            </div>
          </section>
        )
      })}

      {!plan.items.length && (
        <section className="card"><p className="sub">Aucun exercice prévu : c'est un jour de repos.</p></section>
      )}
      <button className="btn soft" onClick={() => setPicking(true)}>+ Ajouter un exercice</button>

      {picking && (
        <ExercisePicker exercises={exercises} exclude={plan.items.map(x => x.exerciseId)} onPick={add} onClose={() => setPicking(false)} />
      )}
    </div>
  )
}
