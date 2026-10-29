import { isWork } from '../data/sets'
import type { Exercise, SetLog } from '../data/types'

// Progression suggérée : si toutes les séries de travail de la dernière fois ont atteint les répétitions
// de la première série, sans effort maximal, on propose un peu plus de charge (ou une répétition de plus sans charge).
// Rien n'est proposé après des séries à l'échec, dégressives, rest-pause ou pyramidales : leur but est ailleurs.
export function suggestNext(last: SetLog[]): { weight?: number; reps: number } | null {
  const work = last.filter(isWork)
  if (!work.length || work.some(s => s.type)) return null
  const target = work[0].reps
  if (!target || work.some(s => (s.reps ?? 0) < target)) return null
  const hard = (s: SetLog) => s.feel === 'max' || (s.rpe != null && s.rpe >= 9.5) || s.rir === 0
  if (work.some(hard)) return null
  const w = Math.max(...work.map(s => s.weight ?? 0))
  if (!w) return { reps: target + 1 }
  return { weight: Math.round((w + (w < 10 ? 1 : 2.5)) * 100) / 100, reps: target }
}

const round = (n: number, step: number) => Math.round(n / step) * step

// Séries d'échauffement proposées avant une charge de travail : 50 %, 70 % puis 85 %
export function warmupSets(work: number, bar = 20): SetLog[] {
  if (work < bar + 10) return []
  const steps: [number, number][] = [[.5, 8], [.7, 5], [.85, 3]]
  const out: SetLog[] = []
  for (const [p, reps] of steps) {
    const weight = Math.max(bar, round(work * p, 2.5))
    if (weight < work && !out.some(s => s.weight === weight)) out.push({ weight, reps, type: 'warmup', done: false })
  }
  return out
}

// Exercices qui travaillent les mêmes muscles, du plus proche au moins proche
export function alternatives(ex: Exercise, all: Exercise[], exclude: string[] = []): Exercise[] {
  const own = new Set([...ex.primary, ...ex.secondary])
  return all
    .filter(e => e.id !== ex.id && e.kind === ex.kind && !exclude.includes(e.id) && e.primary.some(m => ex.primary.includes(m)))
    .map(e => ({
      e,
      score: e.primary.filter(m => ex.primary.includes(m)).length * 3 + [...e.primary, ...e.secondary].filter(m => own.has(m)).length
        - e.primary.filter(m => !ex.primary.includes(m)).length + (e.group === ex.group ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'fr'))
    .slice(0, 8)
    .map(x => x.e)
}
