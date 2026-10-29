import { isWork } from '../data/sets'
import type { Measure, SetLog, Workout } from '../data/types'
import { volume } from './summary'

// Charge maximale estimée sur une répétition (formule d'Epley), pour comparer des séries aux répétitions différentes
export const e1rm = (s: SetLog) =>
  s.weight && s.reps ? (s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30)) : 0

export interface Best { weight: number; e1rm: number; km: number; min: number }

// Meilleures valeurs sur un ensemble de séries, échauffements exclus
export function bestOf(sets: SetLog[]): Best {
  const b: Best = { weight: 0, e1rm: 0, km: 0, min: 0 }
  for (const s of sets.filter(isWork)) {
    b.weight = Math.max(b.weight, s.weight ?? 0)
    b.e1rm = Math.max(b.e1rm, e1rm(s))
    b.km = Math.max(b.km, s.km ?? 0)
    b.min = Math.max(b.min, s.min ?? 0)
  }
  return b
}

export const setsOf = (workouts: Workout[], exerciseId: string) =>
  workouts.flatMap(w => w.entries.filter(e => e.exerciseId === exerciseId).flatMap(e => e.sets))

// Record battu par cette série par rapport aux séries d'avant : charge, sinon 1RM estimé
export function recordBeaten(before: SetLog[], s: SetLog): 'weight' | 'e1rm' | null {
  if (!isWork(s) || !s.weight || !before.some(x => isWork(x) && x.weight)) return null
  const b = bestOf(before)
  if (s.weight > b.weight) return 'weight'
  if (e1rm(s) > b.e1rm + 0.01) return 'e1rm'
  return null
}

export type ExMetric = 'weight' | 'volume' | 'e1rm' | 'km' | 'min'

// Une valeur par séance, dans l'ordre des dates
export function seriesOf(workouts: Workout[], exerciseId: string, m: ExMetric) {
  return [...workouts].sort((a, b) => a.date.localeCompare(b.date)).flatMap(w => {
    const sets = w.entries.filter(e => e.exerciseId === exerciseId).flatMap(e => e.sets)
    const y = m === 'volume' ? volume(sets) : bestOf(sets)[m]
    return y > 0 ? [{ x: w.date, y }] : []
  })
}

export const measureSeries = (measures: Measure[], kind: string) =>
  [...measures].sort((a, b) => a.date.localeCompare(b.date)).flatMap(m => (m.values[kind] != null ? [{ x: m.date, y: m.values[kind] }] : []))
