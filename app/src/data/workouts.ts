import { db, newId } from './db'
import type { Entry, SetLog, Workout } from './types'

export interface WorkoutDraft {
  id?: string // absent pour une séance ajoutée après coup
  date: string
  title?: string
  entries: Entry[]
}

const filled = (s: SetLog) => s.weight != null || s.reps != null || s.km != null || s.min != null

// Garde les séries qui ont au moins une valeur, et les exercices qui ont au moins une série
export const cleanEntries = (entries: Entry[]): Entry[] =>
  entries
    .map(e => ({ ...e, sets: e.sets.filter(filled).map(s => ({ ...s, done: true })) }))
    .filter(e => e.sets.length)

const idsOf = (entries: Entry[]) => [...new Set(entries.map(e => e.exerciseId))]

// Enregistre une séance modifiée ou ajoutée à une date passée.
// Une seule séance par jour, comme à la fin d'une séance guidée : si la date tombe sur un jour
// qui a déjà une séance, les deux sont regroupées. Renvoie la séance enregistrée, ou null si elle est vide.
export async function saveWorkout(d: WorkoutDraft): Promise<{ w: Workout; merged: boolean } | null> {
  const entries = cleanEntries(d.entries)
  if (!entries.length) return null
  return db.transaction('rw', db.workouts, async () => {
    const other = (await db.workouts.where('date').equals(d.date).toArray()).find(w => w.id !== d.id)
    if (other) {
      const all = [...other.entries, ...entries]
      const w: Workout = { ...other, title: other.title || d.title, entries: all, exerciseIds: idsOf(all), updatedAt: Date.now() }
      await db.workouts.put(w)
      if (d.id) await db.workouts.delete(d.id)
      return { w, merged: true }
    }
    const prev = d.id ? await db.workouts.get(d.id) : undefined
    const w: Workout = {
      ...prev, id: d.id ?? newId(), date: d.date, title: d.title, entries, exerciseIds: idsOf(entries), updatedAt: Date.now(),
    }
    await db.workouts.put(w)
    return { w, merged: false }
  })
}

export const deleteWorkout = (id: string) => db.workouts.delete(id)
