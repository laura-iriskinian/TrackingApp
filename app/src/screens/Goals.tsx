import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { allExercises, BASE_MEASURES, db, newId } from '../data/db'
import type { Exercise, Goal, MeasureKind } from '../data/types'
import { fmtNum, longDate, today } from '../lib/dates'
import { currentValue, isReached, progress } from '../lib/goals'
import { ConfirmSheet } from '../components/ui'

type GoalType = 'max-weight' | 'distance' | 'duration' | 'measure'
const TYPES: { id: GoalType; label: string }[] = [
  { id: 'max-weight', label: 'Charge' },
  { id: 'distance', label: 'Distance' },
  { id: 'duration', label: 'Durée' },
  { id: 'measure', label: 'Mesure' },
]

const unitOf = (type: string, kinds: MeasureKind[], id: string) =>
  type === 'max-weight' ? 'kg' : type === 'distance' ? 'km' : type === 'duration' ? 'min' : kinds.find(k => k.id === id)?.unit ?? ''

function describe(g: Goal, exercises: Exercise[], kinds: MeasureKind[]) {
  const i = g.metric.indexOf(':'), type = g.metric.slice(0, i), id = g.metric.slice(i + 1)
  const name = type === 'measure' ? kinds.find(k => k.id === id)?.name ?? 'Mesure' : exercises.find(e => e.id === id)?.name ?? 'Exercice'
  const what = type === 'max-weight' ? 'Charge max' : type === 'distance' ? 'Distance' : type === 'duration' ? 'Durée' : g.direction === 'down' ? 'Descendre à' : 'Monter à'
  return { title: name, what, unit: unitOf(type, kinds, id) }
}

// Objectifs à atteindre avant une date, avec leur avancement
export function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray())
  const ws = useLiveQuery(() => db.workouts.toArray())
  const ms = useLiveQuery(() => db.measures.toArray())
  const workouts = ws ?? [], measures = ms ?? []
  const exercises = useLiveQuery(allExercises) ?? []
  const kinds = [...BASE_MEASURES, ...(useLiveQuery(() => db.measureKinds.toArray()) ?? [])]
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Goal | null>(null)

  // Objectif atteint : on garde la date du jour où on l'a vu atteint
  useEffect(() => {
    if (!ws || !ms) return
    for (const g of goals ?? []) {
      if (!g.reachedAt && isReached(g, currentValue(g.metric, ws, ms))) {
        db.goals.put({ ...g, reachedAt: today(), updatedAt: Date.now() })
      }
    }
  }, [goals, ws, ms])

  if (!goals) return null
  const t = today()
  const sorted = [...goals].sort((a, b) => Number(!!a.reachedAt) - Number(!!b.reachedAt) || a.by.localeCompare(b.by))

  return (
    <>
      {!goals.length && (
        <section className="card">
          <h2>Pas encore d'objectif</h2>
          <p className="sub">Fixe-toi une charge, une distance, une durée ou une mesure à atteindre avant une date.</p>
        </section>
      )}
      {sorted.map(g => {
        const cur = currentValue(g.metric, workouts, measures)
        const d = describe(g, exercises, kinds)
        const p = progress(g, cur)
        const late = !g.reachedAt && g.by < t
        return (
          <section key={g.id} className={'card goal' + (g.reachedAt ? ' reached' : '')}>
            <div className="goal-head">
              <div>
                <span className="eyebrow">{d.what}</span>
                <h2>{d.title} : {fmtNum(g.target)} {d.unit}</h2>
              </div>
              <button className="link edit-del" aria-label="Supprimer l'objectif" onClick={() => setRemoving(g)}>×</button>
            </div>
            <div className="goal-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}
              aria-label="Avancement"><i style={{ width: p * 100 + '%' }} /></div>
            <div className="goal-foot">
              <span className="data">Actuel : {cur != null ? fmtNum(cur) + ' ' + d.unit : '—'}</span>
              <span className={'data' + (g.reachedAt ? ' ok' : late ? ' late' : '')}>
                {g.reachedAt ? `✓ Atteint le ${longDate(g.reachedAt).toLowerCase()}` : late ? `Date passée (${longDate(g.by).toLowerCase()})` : `Avant le ${longDate(g.by).toLowerCase()}`}
              </span>
            </div>
          </section>
        )
      })}
      <button className="btn soft" onClick={() => setAdding(true)}>+ Nouvel objectif</button>

      {adding && <NewGoal exercises={exercises} kinds={kinds} workouts={workouts} measures={measures} onClose={() => setAdding(false)} />}
      {removing && (
        <ConfirmSheet danger title="Supprimer l'objectif ?" text="Il sera effacé, tes séances et mesures ne changent pas." confirmLabel="Supprimer"
          onClose={() => setRemoving(null)} onConfirm={async () => { await db.goals.delete(removing.id); setRemoving(null) }} />
      )}
    </>
  )
}

function NewGoal({ exercises, kinds, workouts, measures, onClose }: {
  exercises: Exercise[]; kinds: MeasureKind[]
  workouts: Parameters<typeof currentValue>[1]; measures: Parameters<typeof currentValue>[2]
  onClose: () => void
}) {
  const [type, setType] = useState<GoalType>('max-weight')
  const [id, setId] = useState('')
  const [target, setTarget] = useState('')
  const [by, setBy] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const options = type === 'measure'
    ? kinds.map(k => ({ id: k.id, name: k.name }))
    : exercises.filter(e => (type === 'max-weight' ? e.kind === 'strength' : e.kind === 'cardio')).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const metric = type + ':' + id
  const cur = id ? currentValue(metric, workouts, measures) : null
  const n = parseFloat(target.replace(',', '.'))
  const valid = id && Number.isFinite(n) && n > 0 && by >= today()
  const unit = unitOf(type, kinds, id)

  const save = async () => {
    // Pour une mesure, on veut descendre si la cible est sous la valeur actuelle (ex. tour de taille)
    const direction = type === 'measure' && cur != null && n < cur ? 'down' : 'up'
    await db.goals.add({ id: newId(), metric, target: n, by, start: cur, direction, updatedAt: Date.now() })
    onClose()
  }

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ng-t" onClick={e => e.stopPropagation()}>
        <h2 id="ng-t">Nouvel objectif</h2>
        <div className="seg" role="group" aria-label="Type d'objectif">
          {TYPES.map(x => <button key={x.id} aria-pressed={type === x.id} onClick={() => { setType(x.id); setId('') }}>{x.label}</button>)}
        </div>
        <div className="field">
          <label htmlFor="ng-id">{type === 'measure' ? 'Mesure' : 'Exercice'}</label>
          <select id="ng-id" className="input" value={id} onChange={e => setId(e.target.value)}>
            <option value="">Choisir…</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {id && <span className="data">Actuellement : {cur != null ? fmtNum(cur) + ' ' + unit : 'pas encore de valeur'}</span>}
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="ng-t2">Cible{unit ? ` (${unit})` : ''}</label>
            <input id="ng-t2" className="input" inputMode="decimal" autoComplete="off" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ng-by">Avant le</label>
            <input id="ng-by" className="input" type="date" min={today()} value={by} onChange={e => setBy(e.target.value)} />
          </div>
        </div>
        <button className="btn" disabled={!valid} onClick={save}>Créer l'objectif</button>
        <button className="btn soft" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}
