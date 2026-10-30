// Restauration d'une sauvegarde NextRep. Le fichier vient de l'extérieur : on ne garde que des champs connus,
// avec le bon type et des valeurs plausibles, pour qu'un fichier abîmé ou piégé ne puisse rien glisser d'autre.
import { db, DATA_TABLES, mergeIntoCatalog } from './db'
import { migrateEntries, migrateItems, SET_TYPES } from './sets'
import type {
  Entry, Exercise, ExerciseNote, Food, Goal, KV, Measure, MeasureKind, Muscle, Plan, PlanItem, Profile, SetLog, SetType, Template, Workout,
} from './types'
import { MUSCLE_LABEL } from './exercises'
import { convertLegacy, isLegacyExport } from './legacy'

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
const MAX_ROWS = 50000

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : undefined)
const id = (v: unknown) => (typeof v === 'string' && /^[\w.:-]{1,80}$/.test(v) ? v : undefined)
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : undefined)
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined)
const time = (v: unknown) => num(v, 0, 1e14) ?? 0
const list = (v: unknown, max: number): unknown[] | undefined => (Array.isArray(v) && v.length <= max ? v : undefined)
const oneOf = <T extends string>(v: unknown, values: readonly T[]) => (values.includes(v as T) ? (v as T) : undefined)
// Recopie seulement les champs définis, pour ne pas écrire de « undefined » dans la base
const pick = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

const SET_TYPE_IDS = SET_TYPES.flatMap(t => (t.id ? [t.id] : []))
const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[]

function setLog(v: unknown): SetLog | undefined {
  if (!isObj(v)) return
  const out = pick({
    weight: num(v.weight, 0, 2000), reps: num(v.reps, 0, 1000), km: num(v.km, 0, 1000), min: num(v.min, 0, 10000),
    type: oneOf(v.type, SET_TYPE_IDS), feel: oneOf(v.feel, ['easy', 'hard', 'max'] as const),
    rpe: num(v.rpe, 1, 10), rir: num(v.rir, 0, 20), done: v.done !== false,
  })
  // Une valeur présente mais invalide (texte, négative…) : la série entière est écartée
  for (const k of ['weight', 'reps', 'km', 'min', 'type', 'feel', 'rpe', 'rir'] as const) if (v[k] != null && out[k] === undefined) return
  return out
}

function entry(v: unknown): (Entry & { technique?: string }) | undefined {
  if (!isObj(v) || !id(v.exerciseId)) return
  const sets = list(v.sets, 100)?.map(setLog)
  if (!sets || sets.some(s => !s)) return
  return pick({ exerciseId: id(v.exerciseId)!, group: id(v.group), target: str(v.target, 20), technique: str(v.technique, 40), sets: sets as SetLog[] })
}

// Exercices prévus (planning, modèles) : la liste entière est écartée si un élément est invalide
function planItems(v: unknown): PlanItem[] | undefined {
  const items = list(v, 50)?.map((x): (PlanItem & { technique?: string }) | undefined => {
    if (!isObj(x) || !id(x.exerciseId)) return
    const types = list(x.types, 50)?.map(t => (t === null ? null : oneOf(t, SET_TYPE_IDS) ?? null)) as (SetType | null)[] | undefined
    return pick({ exerciseId: id(x.exerciseId)!, sets: num(x.sets, 1, 50), types, group: id(x.group), target: str(x.target, 20), technique: str(x.technique, 40) })
  })
  return items && !items.some(x => !x) ? migrateItems(items as PlanItem[]) : undefined
}

export const ROWS = {
  workouts(v: Obj): Workout | undefined {
    const entries = list(v.entries, 200)?.map(entry)
    if (!id(v.id) || !date(v.date) || !entries || entries.some(e => !e)) return
    const es = migrateEntries(entries as Entry[])
    return pick({
      id: id(v.id)!, date: date(v.date)!, title: str(v.title, 100), note: str(v.note, 2000), entries: es, deload: v.deload === true ? true : undefined, forDate: date(v.forDate),
      exerciseIds: [...new Set(es.map(e => e.exerciseId))], updatedAt: time(v.updatedAt),
    })
  },
  measures(v: Obj): Measure | undefined {
    if (!id(v.id) || !date(v.date) || !isObj(v.values)) return
    const values: Record<string, number> = {}
    for (const [k, x] of Object.entries(v.values)) {
      const n = num(x, 0, 1000)
      if (!id(k) || n == null) return
      values[k] = n
    }
    return { id: id(v.id)!, date: date(v.date)!, values, updatedAt: time(v.updatedAt) }
  },
  measureKinds(v: Obj): MeasureKind | undefined {
    const name = str(v.name, 60), unit = oneOf(v.unit, ['kg', 'cm'] as const)
    return id(v.id) && name && unit ? { id: id(v.id)!, name, unit } : undefined
  },
  foods(v: Obj): Food | undefined {
    if (!id(v.id) || !date(v.date)) return
    return pick({
      id: id(v.id)!, date: date(v.date)!, name: str(v.name, 100), kcal: num(v.kcal, 0, 20000), protein: num(v.protein, 0, 2000),
      carbs: num(v.carbs, 0, 2000), fat: num(v.fat, 0, 2000), updatedAt: time(v.updatedAt),
    })
  },
  plans(v: Obj): Plan | undefined {
    const weekday = num(v.weekday, 0, 6)
    const items = planItems(v.items)
    if (weekday == null || !Number.isInteger(weekday) || !items) return
    return { weekday, title: str(v.title, 100) ?? '', items, updatedAt: time(v.updatedAt) }
  },
  templates(v: Obj): Template | undefined {
    const items = planItems(v.items), title = str(v.title, 100)
    return id(v.id) && title && items ? { id: id(v.id)!, title, items, updatedAt: time(v.updatedAt) } : undefined
  },
  goals(v: Obj): Goal | undefined {
    const metric = typeof v.metric === 'string' && /^(max-weight|distance|duration|measure):[\w.:-]{1,80}$/.test(v.metric) ? v.metric : undefined
    const target = num(v.target, 0, 100000), direction = oneOf(v.direction, ['up', 'down'] as const)
    if (!id(v.id) || !metric || target == null || !date(v.by) || !direction) return
    return pick({
      id: id(v.id)!, metric, target, by: date(v.by)!, start: num(v.start, 0, 100000) ?? null, direction,
      reachedAt: date(v.reachedAt), updatedAt: time(v.updatedAt),
    })
  },
  exercises(v: Obj): Exercise | undefined {
    const name = str(v.name, 60), kind = oneOf(v.kind, ['strength', 'cardio'] as const)
    const muscles = (x: unknown) => list(x, 14)?.filter((m): m is Muscle => MUSCLES.includes(m as Muscle)) ?? []
    if (!id(v.id)?.startsWith('perso-') || !name || !kind) return
    return { id: id(v.id)!, name, kind, group: str(v.group, 40) ?? 'Mes exercices', primary: muscles(v.primary), secondary: muscles(v.secondary), custom: true }
  },
  notes(v: Obj): ExerciseNote | undefined {
    const text = str(v.text, 200)
    return id(v.exerciseId) && text ? { exerciseId: id(v.exerciseId)!, text, updatedAt: time(v.updatedAt) } : undefined
  },
  // Seuls le profil, le minuteur et la date de récupération sont repris. Une séance en cours ne l'est pas.
  kv(v: Obj): KV | undefined {
    if (v.key === 'legacyImportedAt') return typeof v.value === 'string' && v.value.length < 40 ? { key: v.key, value: v.value } : undefined
    if (v.key === 'intervals' && isObj(v.value)) {
      const x = v.value, n = (k: string, min: number) => num(x[k], min, 3600)
      const value = { work: n('work', 1), rest: n('rest', 0), rounds: n('rounds', 1), prep: n('prep', 0) }
      return Object.values(value).every(y => y != null) ? { key: 'intervals', value } : undefined
    }
    if (v.key === 'profile' && isObj(v.value)) {
      const p = v.value, nt = isObj(p.nutritionTargets) ? p.nutritionTargets : {}
      const value: Partial<Profile> = pick({
        name: str(p.name, 40), goal: oneOf(p.goal, ['muscle', 'fit', 'loss'] as const), level: oneOf(p.level, ['beginner', 'trained'] as const),
        place: oneOf(p.place, ['gym', 'home'] as const), program: id(p.program), onboarded: typeof p.onboarded === 'boolean' ? p.onboarded : undefined,
        age: num(p.age, 1, 120), heightCm: num(p.heightCm, 50, 260), sex: oneOf(p.sex, ['f', 'h'] as const),
        weekStart: num(p.weekStart, 0, 6), restSec: num(p.restSec, 0, 1800), restExSec: num(p.restExSec, 0, 1800), effortMode: oneOf(p.effortMode, ['off', 'simple', 'rpe', 'rir'] as const),
        barKg: num(p.barKg, 0, 50), weeklyTarget: num(p.weeklyTarget, 1, 14),
        plates: list(p.plates, 20)?.filter((x): x is number => num(x, 0.1, 50) != null),
        pauseWeeks: list(p.pauseWeeks, 1000)?.filter((x): x is string => !!date(x)),
        reminderTime: typeof p.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.reminderTime) ? p.reminderTime : undefined,
      })
      // Objectifs de nutrition : repris seulement s'ils sont complets, sinon ceux par défaut s'appliquent
      const targets = pick({ kcal: num(nt.kcal, 0, 20000), protein: num(nt.protein, 0, 2000), carbs: num(nt.carbs, 0, 2000), fat: num(nt.fat, 0, 2000) })
      const c = isObj(p.cycle) ? p.cycle : undefined
      const weeks = num(c?.weeks, 2, 12)
      if (c && date(c.start) && weeks != null && Number.isInteger(weeks)) value.cycle = { start: date(c.start)!, weeks, deload: c.deload === true }
      if (Object.keys(targets).length === 4) value.nutritionTargets = targets as Profile['nutritionTargets']
      return { key: 'profile', value }
    }
  },
} satisfies Record<string, (v: Obj) => unknown>

type TableName = keyof typeof ROWS
export interface CheckedBackup {
  source: 'nextrep' | 'suivi-sport'
  exportedAt?: string
  rows: { [K in TableName]: NonNullable<ReturnType<(typeof ROWS)[K]>>[] }
  skipped: number // lignes écartées car invalides
}

// Vérifie le texte d'une sauvegarde. Lève une erreur au message lisible si ce n'en est pas une.
export function checkBackup(text: string): CheckedBackup {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('Ce fichier est trop gros pour être une sauvegarde.')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('Ce fichier n\'est ni une sauvegarde NextRep ni une sauvegarde Suivi sport.') }
  // Un fichier exporté par Suivi sport est converti, puis vérifié comme une sauvegarde NextRep
  const legacy = isLegacyExport(raw)
  if (legacy) {
    const c = convertLegacy(raw as Obj)
    raw = {
      app: 'NextRep', format: 2, data: {
        workouts: c.workouts, measures: c.measures, measureKinds: c.kinds, foods: c.foods, plans: c.plans,
        goals: c.goals, exercises: c.custom,
        kv: [{ key: 'profile', value: c.profile }, { key: 'legacyImportedAt', value: new Date().toISOString() }],
      },
    }
  }
  if (!isObj(raw) || raw.app !== 'NextRep' || !isObj(raw.data)) throw new Error('Ce fichier n\'est ni une sauvegarde NextRep ni une sauvegarde Suivi sport.')
  if (raw.format !== 1 && raw.format !== 2) throw new Error('Cette sauvegarde vient d\'une version plus récente de NextRep. Mets l\'app à jour, puis réessaie.')
  let skipped = 0
  const rows = {} as Record<TableName, unknown[]>
  for (const name of Object.keys(ROWS) as TableName[]) {
    const src = raw.data[name] ?? []
    if (!Array.isArray(src) || src.length > MAX_ROWS) throw new Error('Cette sauvegarde est abîmée : elle ne peut pas être restaurée.')
    rows[name] = src.flatMap(v => {
      const r = isObj(v) ? ROWS[name](v) : undefined
      if (!r) skipped++
      return r ? [r] : []
    })
  }
  const exportedAt = typeof raw.exportedAt === 'string' && !isNaN(Date.parse(raw.exportedAt)) ? raw.exportedAt : undefined
  return { source: legacy ? 'suivi-sport' : 'nextrep', exportedAt, rows: rows as CheckedBackup['rows'], skipped }
}

// Remplace toutes les données de NextRep par celles de la sauvegarde. Une séance en cours est gardée.
export async function restoreBackup(b: CheckedBackup) {
  await db.transaction('rw', DATA_TABLES, async () => {
    const session = await db.kv.get('session')
    for (const t of DATA_TABLES) await t.clear()
    if (session) await db.kv.put(session)
    await db.workouts.bulkPut(b.rows.workouts)
    await db.measures.bulkPut(b.rows.measures)
    await db.measureKinds.bulkPut(b.rows.measureKinds)
    await db.foods.bulkPut(b.rows.foods)
    await db.plans.bulkPut(b.rows.plans)
    await db.goals.bulkPut(b.rows.goals)
    await db.exercises.bulkPut(b.rows.exercises)
    await db.notes.bulkPut(b.rows.notes)
    await db.templates.bulkPut(b.rows.templates)
    await db.kv.bulkPut(b.rows.kv)
    await mergeIntoCatalog(n => db.table(n))
  })
}
