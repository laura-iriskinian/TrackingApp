// Récupération des données de l'ancienne app « Suivi sport ».
// Elle est servie sur le même domaine, donc son stockage est lisible ici. On ne fait que lire.
import { LEGACY_KEY, LEGACY_PREFS_KEY } from '../config'
import { db, DATA_TABLES, newId, DEFAULT_PROFILE } from './db'
import { findByName, slug } from './exercises'
import type { Exercise, Food, Goal, Measure, MeasureKind, Plan, Profile, Workout } from './types'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : [])
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined)
const str = (v: unknown, max = 100) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)

const OLD_MEASURES: Record<string, string> = { bw: 'weight', ventre: 'waist', poitrine: 'chest', hanches: 'hips', bras: 'arm', cuisse: 'thigh' }

function read(): Obj | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const p = obj(JSON.parse(raw))
    return Array.isArray(p.sets) && Array.isArray(p.body) ? p : null
  } catch {
    return null
  }
}

export function legacySummary() {
  const p = read()
  if (!p) return null
  const sessions = new Set([...arr(p.sets), ...arr(p.runs)].map(s => date(s.d)).filter(Boolean)).size
  return { sessions, measures: arr(p.body).length, foods: arr(p.food).length }
}

export async function importLegacy() {
  const p = read()
  if (!p) throw new Error('Aucune donnée de Suivi sport trouvée sur cet appareil.')
  const now = Date.now()

  // Exercices : on rattache chaque nom au catalogue, sinon on crée un exercice personnel
  const custom: Exercise[] = []
  const exId = (name: string) => {
    const known = findByName(name, custom)
    if (known) return known.id
    const e: Exercise = { id: 'perso-' + slug(name), name, kind: 'strength', group: 'Mes exercices', primary: [], secondary: [], custom: true }
    custom.push(e)
    return e.id
  }

  // Séances : toutes les lignes d'un même jour deviennent une séance
  const byDay = new Map<string, Workout>()
  const workout = (d: string) => {
    let w = byDay.get(d)
    if (!w) byDay.set(d, (w = { id: newId(), date: d, entries: [], exerciseIds: [], updatedAt: now }))
    return w
  }
  const entry = (w: Workout, exerciseId: string) => {
    let e = w.entries.find(x => x.exerciseId === exerciseId)
    if (!e) {
      w.entries.push((e = { exerciseId, sets: [] }))
      w.exerciseIds.push(exerciseId)
    }
    return e
  }
  for (const s of arr(p.sets)) {
    const d = date(s.d), name = str(s.ex), weight = num(s.w), reps = num(s.r)
    if (!d || !name || weight == null || reps == null) continue
    const e = entry(workout(d), exId(name))
    const n = Math.max(1, Math.round(num(s.n) ?? 1))
    for (let i = 0; i < n; i++) e.sets.push({ weight, reps: Math.round(reps), done: true })
  }
  for (const r of arr(p.runs)) {
    const d = date(r.d)
    if (!d || (r.type !== 'course' && r.type !== 'marche')) continue
    entry(workout(d), r.type).sets.push({ km: num(r.km), min: num(r.min), done: true })
  }

  // Mensurations, y compris les mesures personnalisées
  const kinds: MeasureKind[] = arr(p.custom)
    .filter(c => typeof c.k === 'string' && str(c.n))
    .map(c => ({ id: 'perso-' + String(c.k).slice(1), name: str(c.n, 60)!, unit: 'cm' as const }))
  const keyMap: Record<string, string> = { ...OLD_MEASURES }
  arr(p.custom).forEach((c, i) => { if (kinds[i]) keyMap[String(c.k)] = kinds[i].id })
  const measures: Measure[] = arr(p.body).flatMap(b => {
    const d = date(b.d)
    if (!d) return []
    const values: Record<string, number> = {}
    for (const [k, v] of Object.entries(keyMap)) { const n = num(b[k]); if (n != null) values[v] = n }
    return Object.keys(values).length ? [{ id: newId(), date: d, values, updatedAt: now }] : []
  })

  const foods: Food[] = arr(p.food).flatMap(f => {
    const d = date(f.d)
    return d ? [{ id: newId(), date: d, name: str(f.n), kcal: num(f.kcal), protein: num(f.p), carbs: num(f.g), fat: num(f.l), updatedAt: now }] : []
  })

  // L'ancienne app numérotait les jours à partir du lundi, comme NextRep
  const plans: Plan[] = Object.entries(obj(p.plan)).flatMap(([i, v]) => {
    if (!/^[0-6]$/.test(i)) return []
    const pl = obj(v)
    const items = arr(pl.ex).flatMap(x =>
      x.c === 'course' || x.c === 'marche' ? [{ exerciseId: x.c }]
        : str(x.n) ? [{ exerciseId: exId(str(x.n)!), sets: num(x.s), technique: str(x.t, 40) }] : [])
    return [{ weekday: +i, title: str(pl.name) ?? '', items, updatedAt: now }]
  })

  const goals: Goal[] = arr(p.goals).flatMap(g => {
    const k = str(g.k, 200), target = num(g.target ?? g.t), by = date(g.by)
    if (!k || target == null || !by) return []
    const [type, rest] = [k.split(':')[0], k.slice(k.indexOf(':') + 1)]
    const metric = type === 'ex' ? 'max-weight:' + exId(rest)
      : type === 'run' ? 'distance:' + rest
      : type === 'runt' ? 'duration:' + rest
      : 'measure:' + (keyMap[rest] ?? rest)
    return [{ id: newId(), metric, target, by, start: num(g.s) ?? null, direction: g.dir === 'down' ? 'down' : 'up', reachedAt: date(g.done), updatedAt: now } as Goal]
  })

  const prof = obj(p.prof), ng = obj(p.ng)
  let prefs: Obj = {}
  try { prefs = obj(JSON.parse(localStorage.getItem(LEGACY_PREFS_KEY) || '{}')) } catch { /* préférences illisibles : on les ignore */ }
  const profile: Profile = {
    ...DEFAULT_PROFILE,
    name: str(prefs.n, 40),
    age: num(prof.age),
    heightCm: num(prof.h),
    sex: prof.sex === 'f' || prof.sex === 'h' ? prof.sex : undefined,
    weekStart: Number.isInteger(prof.ws) ? (prof.ws as number) : 0,
    nutritionTargets: {
      kcal: num(ng.kcal) ?? DEFAULT_PROFILE.nutritionTargets.kcal,
      protein: num(ng.p) ?? DEFAULT_PROFILE.nutritionTargets.protein,
      carbs: num(ng.g) ?? DEFAULT_PROFILE.nutritionTargets.carbs,
      fat: num(ng.l) ?? DEFAULT_PROFILE.nutritionTargets.fat,
    },
  }

  const workouts = [...byDay.values()]
  await db.transaction('rw', DATA_TABLES, async () => {
    for (const t of DATA_TABLES) await t.clear()
    await db.workouts.bulkAdd(workouts)
    await db.measures.bulkAdd(measures)
    await db.measureKinds.bulkAdd(kinds)
    await db.foods.bulkAdd(foods)
    await db.plans.bulkAdd(plans)
    await db.goals.bulkAdd(goals)
    await db.exercises.bulkAdd(custom)
    await db.kv.put({ key: 'profile', value: profile })
    await db.kv.put({ key: 'legacyImportedAt', value: new Date().toISOString() })
  })
  return { workouts: workouts.length, measures: measures.length, foods: foods.length }
}
