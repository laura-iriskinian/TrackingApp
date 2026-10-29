import { addDays, weekStartOf } from './dates'

// Régularité : nombre de semaines d'affilée où l'objectif de séances est atteint.
// La semaine en cours compte dès que l'objectif est atteint, mais ne casse rien tant qu'elle n'est pas finie.
// Une semaine de pause ne compte pas et ne casse pas la série.
export function streak(dates: string[], target: number, pauses: string[], today: string, weekStart = 0) {
  const perWeek = new Map<string, number>()
  for (const d of new Set(dates)) {
    const k = weekStartOf(d, weekStart)
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1)
  }
  const first = [...perWeek.keys()].sort()[0]
  const cur = weekStartOf(today, weekStart)
  let n = 0
  for (let w = cur; first && w >= first; w = addDays(w, -7)) {
    const ok = (perWeek.get(w) ?? 0) >= target
    if (ok) n++
    else if (w !== cur && !pauses.includes(w)) break
  }
  return { weeks: n, thisWeek: perWeek.get(cur) ?? 0, paused: pauses.includes(cur) }
}
