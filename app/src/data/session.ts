import { db, getProfile, newId } from './db'
import { cycleWeek, deloadEntry } from '../lib/cycle'
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
  restEx?: boolean // le repos en cours sépare deux exercices
  deload?: boolean // semaine allégée du cycle
  forDate?: string // jour du planning dont vient la séance, si ce n'est pas aujourd'hui
}

const KEY = 'session'
const DEFAULT_SETS = 3

// Durées proposées pour le repos, en secondes
export const REST_CHOICES = [60, 90, 120, 180, 300]
export const restLabel = (sec: number) => (sec < 120 ? sec + ' s' : sec / 60 + ' min')

export async function getSession(): Promise<ActiveSession | undefined> {
  return (await db.kv.get(KEY))?.value as ActiveSession | undefined
}

export const saveSession = (s: ActiveSession) => db.kv.put({ key: KEY, value: s })
export const dropSession = () => db.kv.delete(KEY)

// Séries de la dernière séance où l'exercice a été fait. Les séances de semaine allégée sont passées.
export async function lastSets(exerciseId: string): Promise<SetLog[]> {
  const list = await db.workouts.where('exerciseIds').equals(exerciseId).sortBy('date')
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].deload) continue
    const e = list[i].entries.find(x => x.exerciseId === exerciseId)
    if (e?.sets.length) return e.sets
  }
  return []
}

// Prépare un exercice : nombre et type des séries prévus, valeurs reprises de la dernière fois.
// Sans planning, le type de chaque série est aussi repris de la dernière fois.
// Pour un exercice jamais fait, les répétitions partent du bas de l'objectif prévu (« 8-12 » → 8).
export function buildEntry(ex: Exercise, last: SetLog[], item?: Pick<PlanItem, 'sets' | 'types' | 'group' | 'target'>): Entry {
  const n = item?.sets || item?.types?.length || last.length || (ex.kind === 'cardio' ? 1 : DEFAULT_SETS)
  const goal = parseInt(item?.target ?? '')
  const sets: SetLog[] = Array.from({ length: n }, (_, i) => {
    const p = last[Math.min(i, last.length - 1)]
    const type = item?.types ? item.types[i] ?? undefined : item?.sets ? undefined : p?.type
    const s: SetLog = ex.kind === 'cardio'
      ? { km: p?.km, min: p?.min, done: false }
      : { weight: p?.weight, reps: p?.reps ?? (goal > 0 ? goal : undefined), done: false }
    if (type) s.type = type
    if (p?.parts && p.type === type) s.parts = p.parts // mêmes paliers que la dernière fois
    return s
  })
  const e: Entry = { exerciseId: ex.id, sets }
  if (item?.group) e.group = item.group
  if (item?.target) e.target = item.target
  return e
}

export async function startSession(title: string | undefined, items: PlanItem[], exercises: Exercise[], forDate?: string) {
  const deload = !!cycleWeek((await getProfile()).cycle, today())?.deload
  const entries: Entry[] = []
  for (const it of items) {
    const ex = exercises.find(e => e.id === it.exerciseId)
    if (ex) {
      const e = buildEntry(ex, await lastSets(ex.id), it)
      entries.push(deload ? deloadEntry(e) : e)
    }
  }
  const s: ActiveSession = { id: newId(), date: today(), title, startedAt: Date.now(), entries, cur: 0 }
  if (deload) s.deload = true
  if (forDate) s.forDate = forDate
  await saveSession(s)
  return s
}

export const nextSetIndex = (e: Entry) => e.sets.findIndex(s => !s.done)

// Exercices enchaînés avec celui-ci (superset ou circuit), dans l'ordre de la séance
export const groupOf = (entries: Entry[], ei: number) =>
  entries[ei]?.group ? [...entries.keys()].filter(i => entries[i].group === entries[ei].group) : [ei]

// Après une série de l'exercice ei, l'exercice suivant du même tour s'il en reste un (on enchaîne sans repos)
export function nextInRound(entries: Entry[], ei: number): number | undefined {
  const g = groupOf(entries, ei)
  return g.slice(g.indexOf(ei) + 1).find(i => nextSetIndex(entries[i]) >= 0)
}

// Valide une série. Les séries suivantes qui avaient les mêmes valeurs suivent la modification :
// si on monte à 62,5 kg à la première série, les autres passent aussi à 62,5 kg.
// Dans un superset, on passe à l'exercice suivant du tour ; à la fin du tour, on revient au premier.
export function completeSet(s: ActiveSession, ei: number, si: number, values: Omit<SetLog, 'done'>): ActiveSession {
  const entries = s.entries.map((e, i) => {
    if (i !== ei) return e
    const before = e.sets[si]
    const sets = e.sets.map((x, j) => {
      if (j === si) return { ...x, ...values, done: true }
      if (j > si && !x.done && sameValues(x, before)) {
        // Pyramide : la série suivante en fait partie, mais avec sa propre charge
        if (values.type === 'pyramid') return { ...x, type: values.type }
        return { ...x, weight: values.weight, reps: values.reps, km: values.km, min: values.min, ...(x.type === values.type && values.parts ? { parts: values.parts } : {}) }
      }
      return x
    })
    return { ...e, sets }
  })
  let cur = s.cur
  const g = groupOf(entries, ei)
  const inRound = nextInRound(entries, ei)
  const restart = g.find(i => nextSetIndex(entries[i]) >= 0)
  if (inRound != null) cur = inRound
  else if (g.length > 1 && restart != null) cur = restart
  // Exercice terminé : on passe au suivant qui a encore des séries à faire
  else if (nextSetIndex(entries[ei]) < 0) {
    const order = [...entries.keys()].slice(ei + 1).concat([...entries.keys()].slice(0, ei))
    cur = order.find(i => nextSetIndex(entries[i]) >= 0) ?? ei
  }
  return { ...s, entries, cur }
}

// Repos après une série, une fois validée : aucun dans un tour de superset ni en fin de séance,
// sinon la durée entre deux séries, ou entre deux exercices si on change d'exercice (ou de superset).
export function restAfter(next: ActiveSession, ei: number, restSec: number, restExSec: number) {
  if (isFinished(next) || nextInRound(next.entries, ei) != null) return { sec: 0, between: false }
  const between = !groupOf(next.entries, ei).includes(next.cur)
  return { sec: between ? restExSec : restSec, between }
}

const sameValues = (a: SetLog, b: SetLog) => a.weight === b.weight && a.reps === b.reps && a.km === b.km && a.min === b.min && a.type === b.type

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
  if (s.deload) w.deload = true
  if (s.forDate) w.forDate = s.forDate
  await db.transaction('rw', db.workouts, db.kv, async () => {
    // Le même jour, l'ancienne app regroupait tout dans une séance : on fait pareil pour ne pas dédoubler l'historique
    const same = await db.workouts.where('date').equals(s.date).first()
    if (same) {
      const merged = [...same.entries, ...entries]
      const forDate = same.forDate ?? s.forDate
      await db.workouts.put({ ...same, ...(forDate ? { forDate } : {}), entries: merged, exerciseIds: [...new Set(merged.map(e => e.exerciseId))], updatedAt: Date.now() })
      w.id = same.id
    } else {
      await db.workouts.add(w)
    }
    await db.kv.delete(KEY)
  })
  return w
}
