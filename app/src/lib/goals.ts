import type { Goal, Measure, Workout } from '../data/types'
import { bestOf, setsOf } from './records'

// Valeur actuelle d'un objectif : meilleure charge, plus longue distance ou durée, dernière mesure
export function currentValue(metric: string, workouts: Workout[], measures: Measure[]): number | null {
  const i = metric.indexOf(':'), type = metric.slice(0, i), id = metric.slice(i + 1)
  if (type === 'measure') {
    const last = [...measures].sort((a, b) => b.date.localeCompare(a.date)).find(m => m.values[id] != null)
    return last ? last.values[id] : null
  }
  const b = bestOf(setsOf(workouts, id))
  const v = type === 'max-weight' ? b.weight : type === 'distance' ? b.km : type === 'duration' ? b.min : 0
  return v || null
}

export const isReached = (g: Goal, cur: number | null) =>
  cur != null && (g.direction === 'up' ? cur >= g.target : cur <= g.target)

// Avancement de 0 à 1 entre la valeur de départ et la cible
export function progress(g: Goal, cur: number | null): number {
  if (cur == null) return 0
  if (isReached(g, cur)) return 1
  const start = g.start ?? (g.direction === 'up' ? 0 : cur)
  const span = g.target - start
  return span ? Math.max(0, Math.min(1, (cur - start) / span)) : 0
}
