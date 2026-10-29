import { db, newId } from './db'
import type { Entry, Exercise, PlanItem, SetLog, Workout } from './types'
import { today } from '../lib/dates'

// Séance en cours. Elle est enregistrée à chaque geste, pour survivre à la fermeture de l'app
// ou à un appel téléphonique, et ne devient une vraie séance qu'au moment de « Terminer ».
export interface ActiveSession {
  id: string
  date: string
  title?: string
  startedAt: number
  entries: Entry[]
  cur: number // exercice affiché
  restEndsAt?: number
  restTotal?: number // durée du repos en cours, en secondes
}

const KEY = 'session'
const DEFAULT_SETS = 3

export async function getSession(): Promise<ActiveSession | undefined> {
  return (await db.kv.get(KEY))?.value as ActiveSession | undefined
}

export const saveSession = (s: ActiveSession) => db.kv.put({ key: KEY, value: s })
export const dropSession = () => db.kv.delete(KEY)

// Séries de la dernière séance où l'exercice a été fait
export async function lastSets(exerciseId: string): Promise<SetLog[]> {
  const list = await db.workouts.where('exerciseIds').equals(exerciseId).sortBy('date')
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i].entries.find(x => x.exerciseId === exerciseId)
    if (e?.sets.length) return e.sets
  }
  return []
}

// Prépare un exercice : nombre de séries prévu, valeurs reprises de la dernière fois
export function buildEntry(ex: Exercise, last: SetLog[], item?: Pick<PlanItem, 'sets' | 'technique'>): Entry {
  const n = item?.sets || last.length || (ex.kind === 'cardio' ? 1 : DEFAULT_SETS)
  const sets: SetLog[] = Array.from({ length: n }, (_, i) => {
    const p = last[Math.min(i, last.length - 1)]
    return ex.kind === 'cardio'
      ? { km: p?.km, min: p?.min, done: false }
      : { weight: p?.weight, reps: p?.reps, done: false }
  })
  return { exerciseId: ex.id, technique: item?.technique, sets }
}

export async function startSession(title: string | undefined, items: PlanItem[], exercises: Exercise[]) {
  const entries: Entry[] = []
  for (const it of items) {
    const ex = exercises.find(e => e.id === it.exerciseId)
    if (ex) entries.push(buildEntry(ex, await lastSets(ex.id), it))
  }
  const s: ActiveSession = { id: newId(), date: today(), title, startedAt: Date.now(), entries, cur: 0 }
  await saveSession(s)
  return s
}

export const nextSetIndex = (e: Entry) => e.sets.findIndex(s => !s.done)

// Valide une série. Les séries suivantes qui avaient les mêmes valeurs suivent la modification :
// si on monte à 62,5 kg à la première série, les autres passent aussi à 62,5 kg.
export function completeSet(s: ActiveSession, ei: number, si: number, values: Omit<SetLog, 'done'>): ActiveSession {
  const entries = s.entries.map((e, i) => {
    if (i !== ei) return e
    const before = e.sets[si]
    const sets = e.sets.map((x, j) => {
      if (j === si) return { ...x, ...values, done: true }
      if (j > si && !x.done && sameValues(x, before)) return { ...x, ...values }
      return x
    })
    return { ...e, sets }
  })
  // Exercice terminé : on passe au suivant qui a encore des séries à faire
  let cur = s.cur
  if (nextSetIndex(entries[ei]) < 0) {
    const order = [...entries.keys()].slice(ei + 1).concat([...entries.keys()].slice(0, ei))
    cur = order.find(i => nextSetIndex(entries[i]) >= 0) ?? ei
  }
  return { ...s, entries, cur }
}

const sameValues = (a: SetLog, b: SetLog) => a.weight === b.weight && a.reps === b.reps && a.km === b.km && a.min === b.min

export const isFinished = (s: ActiveSession) => s.entries.length > 0 && s.entries.every(e => nextSetIndex(e) < 0)
export const doneCount = (s: ActiveSession) => s.entries.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0)

// Enregistre la séance avec les seules séries réalisées. Renvoie null s'il n'y en a aucune.
export async function finishSession(s: ActiveSession): Promise<Workout | null> {
  const entries = s.entries
    .map(e => ({ ...e, sets: e.sets.filter(x => x.done) }))
    .filter(e => e.sets.length)
  if (!entries.length) {
    await dropSession()
    return null
  }
  const w: Workout = {
    id: s.id, date: s.date, title: s.title, entries,
    exerciseIds: [...new Set(entries.map(e => e.exerciseId))],
    updatedAt: Date.now(),
  }
  await db.transaction('rw', db.workouts, db.kv, async () => {
    // Le même jour, l'ancienne app regroupait tout dans une séance : on fait pareil pour ne pas dédoubler l'historique
    const same = await db.workouts.where('date').equals(s.date).first()
    if (same) {
      const merged = [...same.entries, ...entries]
      await db.workouts.put({ ...same, entries: merged, exerciseIds: [...new Set(merged.map(e => e.exerciseId))], updatedAt: Date.now() })
      w.id = same.id
    } else {
      await db.workouts.add(w)
    }
    await db.kv.delete(KEY)
  })
  return w
}
