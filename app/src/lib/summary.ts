import type { Entry, Exercise, Muscle, SetLog } from '../data/types'
import { fmtNum } from './dates'

const pace = (min: number, km: number) => {
  let m = Math.floor(min / km), s = Math.round((min / km - m) * 60)
  if (s === 60) { m++; s = 0 }
  return `${m}:${String(s).padStart(2, '0')} /km`
}

// Résumé lisible d'un exercice : « 3 × 8 · 60 kg », ou « 5 km · 28 min · 5:36 /km »
export function entrySummary(e: Entry, ex?: Exercise): string {
  if (ex?.kind === 'cardio') {
    return e.sets.map((s: SetLog) => [
      s.km ? fmtNum(s.km) + ' km' : '',
      s.min ? fmtNum(s.min) + ' min' : '',
      s.km && s.min ? pace(s.min, s.km) : '',
    ].filter(Boolean).join(' · ')).join(' / ')
  }
  const groups: { w?: number; r?: number; n: number }[] = []
  for (const s of e.sets) {
    const last = groups[groups.length - 1]
    if (last && last.w === s.weight && last.r === s.reps) last.n++
    else groups.push({ w: s.weight, r: s.reps, n: 1 })
  }
  return groups.map(g => `${g.n} × ${g.r ?? '?'}${g.w != null ? ' · ' + fmtNum(g.w) + ' kg' : ''}`).join(' / ')
}

export const volume = (sets: SetLog[]) => sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0)

// Muscles travaillés par un ensemble d'exercices : un muscle principal quelque part n'est plus secondaire
export function musclesOf(list: (Exercise | undefined)[]) {
  const primary = new Set<Muscle>(), secondary = new Set<Muscle>()
  for (const e of list) {
    e?.primary.forEach(m => primary.add(m))
    e?.secondary.forEach(m => secondary.add(m))
  }
  return { primary: [...primary], secondary: [...secondary].filter(m => !primary.has(m)) }
}
