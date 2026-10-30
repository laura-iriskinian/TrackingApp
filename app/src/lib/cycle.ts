import type { Cycle, Entry } from '../data/types'
import { isWork } from '../data/sets'
import { parse } from './dates'

// Semaine du cycle pour une date : le cycle recommence tout seul après sa dernière semaine
export function cycleWeek(c: Cycle | undefined, date: string): { week: number; total: number; deload: boolean } | null {
  if (!c) return null
  const days = Math.round((parse(date).getTime() - parse(c.start).getTime()) / 86400000)
  if (days < 0) return null
  const week = (Math.floor(days / 7) % c.weeks) + 1
  return { week, total: c.weeks, deload: c.deload && week === c.weeks }
}

const round = (n: number) => Math.round(n / 2.5) * 2.5

// Semaine allégée : moitié moins de séries de travail, charges à 60 % environ. Le cardio ne change pas.
export function deloadEntry(e: Entry): Entry {
  const work = e.sets.filter(isWork)
  if (!work.length || work.every(s => s.weight == null && s.reps == null)) return e
  const keep = Math.ceil(work.length / 2)
  let n = 0
  const sets = e.sets
    .filter(s => !isWork(s) || n++ < keep)
    .map(s => (isWork(s) && s.weight ? {
      ...s, weight: Math.max(0, round(s.weight * 0.6)),
      ...(s.parts ? { parts: s.parts.map(p => (p.weight ? { ...p, weight: round(p.weight * 0.6) } : p)) } : {}),
    } : s))
  return { ...e, sets }
}
