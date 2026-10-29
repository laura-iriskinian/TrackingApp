// Minuteur par intervalles, comme le chrono de Suivi sport : préparation, puis tours d'exercice séparés par un repos

export interface IntervalConfig { work: number; rest: number; rounds: number; prep: number } // en secondes
export type PhaseKind = 'prep' | 'work' | 'rest'
export interface Phase { kind: PhaseKind; sec: number; round: number }

export const DEFAULT_INTERVALS: IntervalConfig = { work: 30, rest: 15, rounds: 8, prep: 5 }

export function phases(c: IntervalConfig): Phase[] {
  const out: Phase[] = []
  if (c.prep > 0) out.push({ kind: 'prep', sec: c.prep, round: 0 })
  for (let i = 1; i <= c.rounds; i++) {
    out.push({ kind: 'work', sec: c.work, round: i })
    if (i < c.rounds && c.rest > 0) out.push({ kind: 'rest', sec: c.rest, round: i })
  }
  return out
}

export const totalSec = (c: IntervalConfig) => phases(c).reduce((a, p) => a + p.sec, 0)

// Phase en cours après `elapsed` secondes, ou null quand tout est fini
export function phaseAt(list: Phase[], elapsed: number): { i: number; left: number } | null {
  let t = 0
  for (let i = 0; i < list.length; i++) {
    t += list[i].sec
    if (elapsed < t) return { i, left: t - elapsed }
  }
  return null
}
