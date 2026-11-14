import type { Table } from 'dexie'
import type { Exercise, Muscle, Plan, Template, Workout } from './types'
import { DAYS } from '../lib/dates'
import { recovery } from '../lib/recovery'

// Les séances enregistrées forment une liste. Chacune peut être prévue certains jours de la semaine,
// sans obligation : une séance sans jour se lance quand on veut. Un jour n'a qu'une séance prévue au plus.

export const sessionForDay = (list: Template[], wd: number) => list.find(t => t.days?.includes(wd))

const sortDays = (d: number[]) => [...new Set(d)].sort((a, b) => a - b)
const sameItems = (a: Template | Plan, b: Template | Plan) => a.title === b.title && JSON.stringify(a.items) === JSON.stringify(b.items)

// Ancien planning (une séance par jour) → liste de séances. Deux jours identiques donnent une seule séance prévue
// ces deux jours-là ; un modèle identique à un jour du planning reçoit ce jour.
export function plansToTemplates(plans: Plan[], existing: Template[], newId: () => string): Template[] {
  const out = existing.map(t => ({ ...t }))
  const changed = new Set<Template>()
  for (const p of [...plans].sort((a, b) => a.weekday - b.weekday)) {
    if (!p.items.length && !p.title) continue
    const named = { ...p, title: p.title || `Séance du ${DAYS[p.weekday].toLowerCase()}` }
    // Le jour est retiré d'une autre séance qui l'aurait déjà
    for (const t of out) if (t.days?.includes(p.weekday)) { t.days = t.days.filter(d => d !== p.weekday); changed.add(t) }
    const same = out.find(t => sameItems(t, named))
    if (same) {
      same.days = sortDays([...(same.days ?? []), p.weekday])
      same.updatedAt = Math.max(same.updatedAt, p.updatedAt)
      changed.add(same)
    } else {
      const t: Template = { id: newId(), title: named.title, items: p.items.map(x => ({ ...x })), days: [p.weekday], updatedAt: p.updatedAt || Date.now() }
      out.push(t)
      changed.add(t)
    }
  }
  return [...changed].map(t => (t.days?.length ? t : withoutDays(t)))
}

const withoutDays = ({ days: _, ...t }: Template): Template => t

// Déplace ce qui reste dans l'ancienne table du planning vers la liste des séances.
// Sert à la mise à jour de la base, après une restauration, un import de Suivi sport ou une synchronisation.
export async function absorbPlans(table: (name: string) => Table) {
  const plans = (await table('plans').toArray()) as Plan[]
  if (!plans.length) return false
  const existing = (await table('templates').toArray()) as Template[]
  await table('templates').bulkPut(plansToTemplates(plans, existing, () => crypto.randomUUID()))
  await table('plans').clear()
  return true
}

// Enregistre une séance. Les jours choisis sont retirés des autres séances (un jour, une séance).
export async function saveRoutine(t: Template, table: (name: string) => Table) {
  const days = t.days?.length ? sortDays(t.days) : undefined
  const others = ((await table('templates').toArray()) as Template[]).filter(o => o.id !== t.id && o.days?.some(d => days?.includes(d)))
  const now = Date.now()
  for (const o of others) {
    const left = o.days!.filter(d => !days!.includes(d))
    await table('templates').put(left.length ? { ...o, days: left, updatedAt: now } : { ...withoutDays(o), updatedAt: now })
  }
  await table('templates').put(days ? { ...t, days, updatedAt: now } : { ...withoutDays(t), updatedAt: now })
  return others
}

// « Lundi et jeudi », « Pas de jour fixe »
export function daysLabel(days?: number[]): string {
  if (!days?.length) return 'Pas de jour fixe'
  const names = sortDays(days).map((d, i) => (i ? DAYS[d].toLowerCase() : DAYS[d]))
  return names.length > 1 ? names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1] : names[0]
}

// Dernière fois qu'une séance a été faite : séance passée du même nom
export function lastDone(t: Template, workouts: Workout[]): string | undefined {
  let best: string | undefined
  for (const w of workouts) if (w.title === t.title && (!best || w.date > best)) best = w.date
  return best
}

// Séance conseillée : celle dont les muscles sont les plus reposés. À égalité, celle faite il y a le plus longtemps.
// Rien n'est conseillé si toutes les séances sollicitent autant des muscles encore fatigués, ou s'il n'y a qu'une séance.
export function suggestRoutine(list: Template[], workouts: Workout[], exercises: Exercise[], today: string): Template | undefined {
  const ready = list.filter(t => t.items.length)
  if (ready.length < 2) return
  const tired = recovery(workouts, exercises, today)
  const score = (t: Template) => {
    const muscles = new Map<Muscle, number>()
    for (const it of t.items) {
      const ex = exercises.find(e => e.id === it.exerciseId)
      ex?.primary.forEach(m => muscles.set(m, 1))
      ex?.secondary.forEach(m => { if (!muscles.has(m)) muscles.set(m, .5) })
    }
    let s = 0
    for (const [m, k] of muscles) s += (tired[m] ?? 0) * k
    return muscles.size ? s / muscles.size : 0
  }
  const ranked = ready
    .map(t => ({ t, s: score(t), last: lastDone(t, workouts) ?? '' }))
    .sort((a, b) => a.s - b.s || a.last.localeCompare(b.last))
  if (ranked[0].s === ranked[ranked.length - 1].s && !ranked.some(r => r.last)) return
  return ranked[0].t
}
