import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { allExercises, db } from '../data/db'
import { buildEntry, lastSets } from '../data/session'
import type { Entry, Exercise, SetLog, SetType } from '../data/types'
import { SET_TYPES } from '../data/sets'
import { deleteWorkout, saveWorkout } from '../data/workouts'
import { addDays, fmtNum, longDate, today } from '../lib/dates'
import { ExercisePicker } from '../components/ExercisePicker'
import { ConfirmSheet, useToast } from '../components/ui'
import './Session.css'

// Les champs sont gardés en texte pendant la saisie, pour accepter « 62, » le temps de taper « 62,5 »
type Field = 'weight' | 'reps' | 'km' | 'min'
type Row = Partial<Record<Field, string>> & { set: SetLog } // set : la série d'origine, pour garder type et ressenti
interface DraftEntry { exerciseId: string; group?: string; sets: Row[] }
interface Draft { date: string; title?: string; entries: DraftEntry[] }

const FIELDS: Field[] = ['weight', 'reps', 'km', 'min']
const UNITS: Record<Field, string> = { weight: 'kg', reps: 'rép.', km: 'km', min: 'min' }

const toNum = (v?: string) => {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
const toRow = (s: SetLog): Row => ({ set: s, ...Object.fromEntries(FIELDS.filter(k => s[k] != null).map(k => [k, fmtNum(s[k]!)])) })
const toSet = ({ set, ...r }: Row): SetLog => {
  const out: SetLog = { ...set, done: true }
  for (const k of FIELDS) { const n = toNum(r[k]); if (n != null) out[k] = n; else delete out[k] }
  return out
}
const toEntries = (d: Draft): Entry[] => d.entries.map(e => ({ ...(e.group ? { group: e.group } : {}), exerciseId: e.exerciseId, sets: e.sets.map(toSet) }))

type Sheet = 'add' | 'delete' | 'leave' | null

// Modifier une séance passée, ou en ajouter une après coup (id absent)
export function WorkoutEdit({ id, onClose }: { id?: string; onClose: () => void }) {
  const exercises = useLiveQuery(allExercises) ?? []
  const toast = useToast()
  const [initial, setInitial] = useState<Draft | null>(null)
  const [d, setD] = useState<Draft | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    (async () => {
      const w = id ? await db.workouts.get(id) : undefined
      if (id && !w) { setMissing(true); return }
      const draft: Draft = w
        ? { date: w.date, title: w.title, entries: w.entries.map(e => ({ exerciseId: e.exerciseId, group: e.group, sets: e.sets.map(toRow) })) }
        : { date: addDays(today(), -1), entries: [] }
      setInitial(draft)
      setD(draft)
    })()
  }, [id])

  if (missing) {
    return (
      <div className="screen session">
        <section className="card">
          <h2>Séance introuvable</h2>
          <p className="sub">Elle a peut-être été supprimée.</p>
          <button className="btn" onClick={onClose}>Retour aux séances</button>
        </section>
      </div>
    )
  }
  if (!d) return null

  const exById = (x: string) => exercises.find(e => e.id === x)
  const dirty = JSON.stringify(d) !== JSON.stringify(initial)
  const hasData = toEntries(d).some(e => e.sets.some(s => Object.keys(s).length > 1))

  const patchEntry = (ei: number, fn: (e: DraftEntry) => DraftEntry | null) =>
    setD({ ...d, entries: d.entries.flatMap((e, i) => (i === ei ? (fn(e) ?? []) : [e])) })
  const patchSet = (ei: number, si: number, k: Field, v: string) =>
    patchEntry(ei, e => ({ ...e, sets: e.sets.map((r, j) => (j === si ? { ...r, [k]: v } : r)) }))
  const patchType = (ei: number, si: number, t: string) =>
    patchEntry(ei, e => ({ ...e, sets: e.sets.map((r, j) => (j === si ? { ...r, set: { ...r.set, type: (t || undefined) as SetType | undefined } } : r)) }))

  const addExercise = async (ex: Exercise) => {
    setSheet(null)
    // Valeurs de la dernière fois, à corriger si besoin
    const e = buildEntry(ex, await lastSets(ex.id))
    setD(cur => cur && { ...cur, entries: [...cur.entries, { exerciseId: ex.id, sets: e.sets.map(toRow) }] })
  }

  const save = async () => {
    setBusy(true)
    try {
      const r = await saveWorkout({ id, date: d.date, title: d.title, entries: toEntries(d) })
      if (!r) { toast('Note au moins une série pour enregistrer la séance'); return }
      toast(r.merged ? `Regroupée avec la séance du ${longDate(d.date).toLowerCase()}` : id ? 'Séance modifiée' : 'Séance ajoutée')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const leave = () => (dirty ? setSheet('leave') : onClose())

  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={leave}>‹ Séances</button>
        <button className="pill" disabled={busy || !hasData || !d.date} onClick={save}>Enregistrer</button>
      </header>

      <div className="head">
        <span className="eyebrow">{id ? 'Modifier la séance' : 'Ajouter une séance'}</span>
        <h1>{d.date ? longDate(d.date) : 'Séance'}</h1>
      </div>

      <section className="card">
        <div className="field">
          <label htmlFor="ed-date">Date</label>
          <input id="ed-date" className="input" type="date" max={today()} value={d.date}
            onChange={e => setD({ ...d, date: e.target.value })} />
        </div>
      </section>

      {d.entries.map((e, ei) => {
        const ex = exById(e.exerciseId)
        const fields: Field[] = ex?.kind === 'cardio' ? ['km', 'min'] : ['weight', 'reps']
        return (
          <section key={ei} className="card">
            <div>
              <span className="eyebrow">{ex?.group ?? 'Exercice'}{e.group ? ' · superset' : ''}</span>
              <h2>{ex?.name ?? 'Exercice supprimé'}</h2>
            </div>
            <ol className="sets edit-sets">
              {e.sets.map((r, si) => (
                <li key={si}>
                  <span className="data">{si + 1}</span>
                  {fields.map(k => (
                    <label key={k} className="edit-cell">
                      <input inputMode="decimal" autoComplete="off" placeholder="—" value={r[k] ?? ''}
                        aria-label={`Série ${si + 1}, ${UNITS[k]}`} onChange={ev => patchSet(ei, si, k, ev.target.value)} />
                      <span className="data">{UNITS[k]}</span>
                    </label>
                  ))}
                  <select className="edit-type" value={r.set.type ?? ''} aria-label={`Type de la série ${si + 1}`}
                    onChange={ev => patchType(ei, si, ev.target.value)}>
                    {SET_TYPES.map(t => <option key={t.label} value={t.id ?? ''}>{t.label}</option>)}
                  </select>
                  <button className="link edit-del" aria-label={`Retirer la série ${si + 1}`}
                    onClick={() => patchEntry(ei, x => ({ ...x, sets: x.sets.filter((_, j) => j !== si) }))}>×</button>
                </li>
              ))}
            </ol>
            <div className="row cur-tools">
              <button className="link" onClick={() => patchEntry(ei, x => ({ ...x, sets: [...x.sets, x.sets.length ? { ...x.sets[x.sets.length - 1], set: { type: x.sets[x.sets.length - 1].set.type, done: true } } : { set: { done: true } }] }))}>+ Série</button>
              <button className="link" onClick={() => patchEntry(ei, () => null)}>Retirer l'exercice</button>
            </div>
          </section>
        )
      })}

      {!d.entries.length && (
        <section className="card">
          <p className="sub">Ajoute les exercices faits ce jour-là. Les valeurs de la dernière fois sont proposées, tu n'as qu'à les corriger.</p>
        </section>
      )}

      <button className="btn soft" onClick={() => setSheet('add')}>+ Ajouter un exercice</button>
      {id && <button className="link danger-link" onClick={() => setSheet('delete')}>Supprimer la séance</button>}

      {sheet === 'add' && (
        <ExercisePicker exercises={exercises} exclude={d.entries.map(e => e.exerciseId)} onPick={addExercise} onClose={() => setSheet(null)} />
      )}
      {sheet === 'delete' && id && (
        <ConfirmSheet danger title="Supprimer la séance ?" text={`La séance du ${longDate(initial?.date ?? d.date).toLowerCase()} sera effacée définitivement.`}
          confirmLabel="Supprimer" onConfirm={async () => { await deleteWorkout(id); toast('Séance supprimée'); onClose() }}
          onClose={() => setSheet(null)} />
      )}
      {sheet === 'leave' && (
        <ConfirmSheet danger title="Quitter sans enregistrer ?" text="Tes modifications seront perdues."
          confirmLabel="Quitter" onConfirm={onClose} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}
