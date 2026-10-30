import type { Entry, Exercise, Muscle, PlanItem, SetLog } from '../data/types'
import { fmtNum } from './dates'
import { isWork, typeShort, typesSummary } from '../data/sets'
import { isTimed } from '../data/exercises'

const pace = (min: number, km: number) => {
  let m = Math.floor(min / km), s = Math.round((min / km - m) * 60)
  if (s === 60) { m++; s = 0 }
  return `${m}:${String(s).padStart(2, '0')} /km`
}

const repsText = (r: number | undefined, timed: boolean) => (r == null ? '?' : timed ? r + ' s' : String(r))

// Une série : « 60 kg × 8 », « 60 kg × 8 → 45 kg × 6 » en dégressive, « 60 kg × 8 + 4 + 3 » en rest-pause
export function setLine(s: SetLog, timed = false): string {
  const main = `${s.weight != null ? fmtNum(s.weight) + ' kg' : 'poids du corps'} × ${repsText(s.reps, timed)}`
  return main + (s.parts ?? []).map(p => (p.weight != null ? ` → ${fmtNum(p.weight)} kg × ${repsText(p.reps, timed)}` : ` + ${repsText(p.reps, timed)}`)).join('')
}

// Résumé lisible d'un exercice : « 3 × 8 · 60 kg », ou « 5 km · 28 min · 5:36 /km ».
// Le type des séries non normales est précisé : « 1 × 12 · 20 kg échauffement / 3 × 8 · 60 kg ».
// Les séries à plusieurs étapes sont détaillées : « 2 × (60 kg × 8 → 45 kg × 6) dégressive ».
export function entrySummary(e: Entry, ex?: Exercise): string {
  if (ex?.kind === 'cardio') {
    return e.sets.map((s: SetLog) => [
      s.km ? fmtNum(s.km) + ' km' : '',
      s.min ? fmtNum(s.min) + ' min' : '',
      s.km && s.min ? pace(s.min, s.km) : '',
    ].filter(Boolean).join(' · ')).join(' / ')
  }
  const timed = isTimed(ex)
  const groups: { s: SetLog; key: string; t: string; n: number }[] = []
  for (const s of e.sets) {
    const last = groups[groups.length - 1], t = typeShort(s.type), key = JSON.stringify([s.weight, s.reps, s.parts])
    if (last && last.key === key && last.t === t) last.n++
    else groups.push({ s, key, t, n: 1 })
  }
  return groups.map(({ s, t, n }) => {
    const text = s.parts?.length
      ? (n > 1 ? `${n} × (${setLine(s, timed)})` : setLine(s, timed))
      : `${n} × ${repsText(s.reps, timed)}${s.weight != null ? ' · ' + fmtNum(s.weight) + ' kg' : ''}`
    return text + (t ? ' ' + t : '')
  }).join(' / ')
}

// Chaque palier ou reprise compte, à sa charge ou à celle de la série
export const volume = (sets: SetLog[]) => sets.filter(isWork).reduce((a, s) =>
  a + (s.weight ?? 0) * (s.reps ?? 0) + (s.parts ?? []).reduce((b, p) => b + (p.weight ?? s.weight ?? 0) * (p.reps ?? 0), 0), 0)

// Muscles travaillés par un ensemble d'exercices : un muscle principal quelque part n'est plus secondaire
export function musclesOf(list: (Exercise | undefined)[]) {
  const primary = new Set<Muscle>(), secondary = new Set<Muscle>()
  for (const e of list) {
    e?.primary.forEach(m => primary.add(m))
    e?.secondary.forEach(m => secondary.add(m))
  }
  return { primary: [...primary], secondary: [...secondary].filter(m => !primary.has(m)) }
}

// Répétitions visées : « 8-12 » s'affiche « 8–12 »
export const fmtTarget = (t: string) => t.replace(/(\d)\s*-\s*(\d)/, '$1–$2')

// Ligne d'un exercice prévu : « 3 × 8–12 · 1 échauffement · superset », « 20 min » pour le cardio
export function planLine(it: PlanItem, ex?: Exercise): string {
  const n = it.sets || it.types?.length || 0
  const t = it.target ? fmtTarget(it.target) : ''
  const main = ex?.kind === 'cardio' ? t : n ? (t ? `${n} × ${t}` : `${n} séries`) : ''
  return [main, typesSummary(it.types ?? []), it.group ? 'enchaîné' : ''].filter(Boolean).join(' · ')
}
