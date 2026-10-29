import { isWork } from '../data/sets'
import type { Exercise, Muscle, Workout } from '../data/types'
import { parse } from './dates'

export const RECOVERY_DAYS = 3

// Fatigue de chaque muscle, de 1 (niveau 3 : travaillé aujourd'hui ou hier) à rien (récupéré).
// Un muscle principal compte plein, un secondaire à moitié, et la fatigue s'estompe sur 3 jours.
export function recovery(workouts: Workout[], exercises: Exercise[], today: string): Partial<Record<Muscle, 1 | 2 | 3>> {
  const fatigue: Partial<Record<Muscle, number>> = {}
  for (const w of workouts) {
    const days = Math.round((parse(today).getTime() - parse(w.date).getTime()) / 864e5)
    const fade = 1 - days / RECOVERY_DAYS
    if (days < 0 || fade <= 0) continue
    for (const e of w.entries) {
      const ex = exercises.find(x => x.id === e.exerciseId)
      if (!ex) continue
      const load = Math.min(1, e.sets.filter(isWork).length / 3)
      const add = (m: Muscle, k: number) => { fatigue[m] = Math.min(1, (fatigue[m] ?? 0) + load * k * fade) }
      ex.primary.forEach(m => add(m, 1))
      ex.secondary.forEach(m => add(m, .5))
    }
  }
  const out: Partial<Record<Muscle, 1 | 2 | 3>> = {}
  for (const [m, f] of Object.entries(fatigue) as [Muscle, number][]) {
    if (f >= .6) out[m] = 3
    else if (f >= .3) out[m] = 2
    else if (f > .05) out[m] = 1
  }
  return out
}
