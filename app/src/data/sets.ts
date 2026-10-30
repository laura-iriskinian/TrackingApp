import type { Entry, Feel, PlanItem, SetLog, SetPart, SetType } from './types'

export const SET_TYPES: { id: SetType | undefined; label: string; short: string; plural?: string; hint?: string }[] = [
  { id: undefined, label: 'Normale', short: '' },
  { id: 'warmup', label: 'Échauffement', short: 'échauffement', plural: 'échauffements', hint: 'Ne compte ni dans le volume ni dans les records.' },
  { id: 'failure', label: 'À l’échec', short: 'à l’échec', hint: 'Note les répétitions vraiment réussies.' },
  { id: 'drop', label: 'Dégressive', short: 'dégressive', plural: 'dégressives', hint: 'Note chaque palier : la charge baisse, sans repos entre deux paliers.' },
  { id: 'restpause', label: 'Rest-pause', short: 'rest-pause', hint: 'Même charge, quelques secondes de pause entre deux reprises.' },
  { id: 'pyramid', label: 'Pyramidale', short: 'pyramidale', plural: 'pyramidales', hint: 'Chaque série a sa propre charge : règle-la avant de valider.' },
]

export const typeLabel = (t?: SetType | null) => SET_TYPES.find(x => x.id === (t ?? undefined))?.label ?? 'Normale'
export const typeShort = (t?: SetType | null) => SET_TYPES.find(x => x.id === (t ?? undefined))?.short ?? ''

// Les séries d'échauffement ne comptent ni dans le volume ni dans les records
export const isWork = (s: SetLog) => s.type !== 'warmup'

// Types de séries faits de plusieurs étapes
export const hasParts = (t?: SetType | null) => t === 'drop' || t === 'restpause'
export const partName = (t?: SetType | null) => (t === 'drop' ? 'Palier' : 'Reprise')

const round = (n: number) => Math.round(n / 2.5) * 2.5

// Étape proposée après la précédente. Dégressive : 20 % de charge en moins, mêmes répétitions.
export function nextPart(t: SetType | null | undefined, prev: SetPart): SetPart {
  if (t !== 'drop') return {}
  return { weight: prev.weight ? round(prev.weight * 0.8) : undefined, reps: prev.reps }
}

export const FEELS: { id: Feel; label: string }[] = [
  { id: 'easy', label: 'Facile' },
  { id: 'hard', label: 'Dur' },
  { id: 'max', label: 'Limite' },
]

export function effortLabel(s: SetLog): string {
  if (s.rpe != null) return 'RPE ' + String(s.rpe).replace('.', ',')
  if (s.rir != null) return s.rir + ' en réserve'
  return FEELS.find(f => f.id === s.feel)?.label.toLowerCase() ?? ''
}

// « 1 échauffement, 3 pyramidales » : les séries normales ne sont pas citées
export function typesSummary(types: (SetType | null | undefined)[]): string {
  const n = new Map<SetType, number>()
  for (const t of types) if (t) n.set(t, (n.get(t) ?? 0) + 1)
  return [...n].map(([t, c]) => {
    const x = SET_TYPES.find(y => y.id === t)!
    return `${c} ${c > 1 ? x.plural ?? x.short : x.short}`
  }).join(', ')
}

export const newGroupId = () => Math.random().toString(36).slice(2, 8)

// Anciennes données : une technique pour tout l'exercice (nom en clair, comme dans Suivi sport)
const OLD_TECH: Record<string, SetType> = {
  "à l'échec": 'failure', 'à l’échec': 'failure', 'dégressif': 'drop', 'pyramidal': 'pyramid', 'rest-pause': 'restpause',
}
const oldType = (t: unknown) => (typeof t === 'string' ? OLD_TECH[t.trim().toLowerCase()] : undefined)
const isSuperset = (t: unknown) => typeof t === 'string' && t.trim().toLowerCase() === 'superset'

// Les exercices consécutifs marqués « Superset » sont liés ensemble
function linkSupersets<T extends { group?: string }>(list: T[], techs: unknown[]): T[] {
  let g: string | undefined
  return list.map((x, i) => {
    if (!isSuperset(techs[i])) { g = undefined; return x }
    if (!g || !isSuperset(techs[i - 1])) g = newGroupId()
    return { ...x, group: g }
  })
}

type OldEntry = Entry & { technique?: unknown }
type OldItem = PlanItem & { technique?: unknown }

export function migrateEntries(entries: OldEntry[]): Entry[] {
  const techs = entries.map(e => e.technique)
  const out = entries.map(({ technique, ...e }) => {
    const t = oldType(technique)
    return t ? { ...e, sets: e.sets.map(s => ({ ...s, type: s.type ?? t })) } : e
  })
  return linkSupersets(out, techs)
}

export function migrateItems(items: OldItem[]): PlanItem[] {
  const techs = items.map(i => i.technique)
  const out = items.map(({ technique, ...it }) => {
    const t = oldType(technique)
    return t ? { ...it, types: Array.from({ length: it.sets || 3 }, () => t) } : it
  })
  return linkSupersets(out, techs)
}
