import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Entry, Exercise, ExerciseNote, Food, Goal, KV, Measure, MeasureKind, Photo, Plan, Profile, Template, Workout } from './types'
import { CATALOG, norm } from './exercises'
import { migrateEntries, migrateItems } from './sets'

export const db = new Dexie('nextrep') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  measures: EntityTable<Measure, 'id'>
  measureKinds: EntityTable<MeasureKind, 'id'>
  foods: EntityTable<Food, 'id'>
  plans: EntityTable<Plan, 'weekday'>
  goals: EntityTable<Goal, 'id'>
  exercises: EntityTable<Exercise, 'id'> // exercices créés par l'utilisateur
  notes: EntityTable<ExerciseNote, 'exerciseId'> // note gardée d'une séance à l'autre
  kv: EntityTable<KV, 'key'>
  sync: EntityTable<KV, 'key'> // état de la synchronisation, propre à cet appareil (jamais exporté)
  templates: EntityTable<Template, 'id'>
  photos: EntityTable<Photo, 'id'> // jamais exportées ni synchronisées
}

db.version(1).stores({
  workouts: 'id, date, *exerciseIds',
  measures: 'id, date',
  measureKinds: 'id',
  foods: 'id, date',
  plans: 'weekday',
  goals: 'id',
  exercises: 'id',
  kv: 'key',
})

// Version 2 : le type se choisit par série (et non plus une technique pour tout l'exercice), supersets, notes
db.version(2).stores({ notes: 'exerciseId' }).upgrade(async tx => {
  await tx.table('workouts').toCollection().modify((w: Workout) => { w.entries = migrateEntries(w.entries) })
  await tx.table('plans').toCollection().modify((p: Plan) => { p.items = migrateItems(p.items) })
  await tx.table('kv').where('key').equals('session').modify((r: KV) => {
    const v = r.value as { entries?: Workout['entries'] }
    if (v?.entries) v.entries = migrateEntries(v.entries)
  })
})

// Version 3 : catalogue élargi. Un exercice créé par l'utilisateur qui porte le nom d'un nouvel exercice
// du catalogue est fusionné avec lui, pour garder un seul historique.
db.version(3).stores({}).upgrade(tx => mergeIntoCatalog(n => tx.table(n)))

// Version 4 : comptes et synchronisation
db.version(4).stores({ sync: 'key' })

// Version 5 : modèles de séances, photos de progression
db.version(5).stores({ templates: 'id', photos: 'id, date' })

export async function mergeIntoCatalog(table: (name: string) => Table) {
  const map = new Map<string, string>()
  for (const e of (await table('exercises').toArray()) as Exercise[]) {
    const known = CATALOG.find(c => norm(c.name) === norm(e.name))
    if (known) map.set(e.id, known.id)
  }
  if (!map.size) return
  const re = (id: string) => map.get(id) ?? id
  const fix = (entries: Entry[]) => entries.forEach(e => { e.exerciseId = re(e.exerciseId) })
  await table('workouts').toCollection().modify((w: Workout) => { fix(w.entries); w.exerciseIds = [...new Set(w.entries.map(e => e.exerciseId))] })
  await table('plans').toCollection().modify((p: Plan) => { p.items.forEach(i => { i.exerciseId = re(i.exerciseId) }) })
  await table('goals').toCollection().modify((g: Goal) => {
    const [type, id] = [g.metric.split(':')[0], g.metric.slice(g.metric.indexOf(':') + 1)]
    if (type === 'max-weight') g.metric = type + ':' + re(id)
  })
  await table('kv').where('key').equals('session').modify((r: KV) => {
    const v = r.value as { entries?: Entry[] }
    if (v?.entries) fix(v.entries)
  })
  for (const [from, to] of map) {
    const note = (await table('notes').get(from)) as ExerciseNote | undefined
    if (note && !(await table('notes').get(to))) await table('notes').put({ ...note, exerciseId: to })
    await table('notes').delete(from)
  }
  await table('exercises').bulkDelete([...map.keys()])
}

export const DATA_TABLES = [db.workouts, db.measures, db.measureKinds, db.foods, db.plans, db.goals, db.exercises, db.notes, db.templates, db.kv]

export const newId = () => crypto.randomUUID()

export const DEFAULT_PROFILE: Profile = {
  weekStart: 0,
  restSec: 90,
  effortMode: 'off',
  barKg: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  weeklyTarget: 3,
  pauseWeeks: [],
  reminderTime: '18:00',
  nutritionTargets: { kcal: 2000, protein: 100, carbs: 250, fat: 70 },
}

export async function getProfile(): Promise<Profile> {
  const row = await db.kv.get('profile')
  return { ...DEFAULT_PROFILE, ...(row?.value as Partial<Profile> | undefined) }
}

export async function saveProfile(patch: Partial<Profile>) {
  const cur = await getProfile()
  await db.kv.put({ key: 'profile', value: { ...cur, ...patch } })
}

export async function allExercises(): Promise<Exercise[]> {
  return [...CATALOG, ...(await db.exercises.toArray())]
}

export const BASE_MEASURES: MeasureKind[] = [
  { id: 'weight', name: 'Poids', unit: 'kg' },
  { id: 'waist', name: 'Ventre', unit: 'cm' },
  { id: 'chest', name: 'Poitrine', unit: 'cm' },
  { id: 'hips', name: 'Hanches', unit: 'cm' },
  { id: 'arm', name: 'Bras', unit: 'cm' },
  { id: 'thigh', name: 'Cuisse', unit: 'cm' },
]

export async function exportAll() {
  const data: Record<string, unknown[]> = {}
  for (const t of DATA_TABLES) data[t.name] = await t.toArray()
  return { app: 'NextRep', format: 2, exportedAt: new Date().toISOString(), data }
}

// Droit à l'effacement : supprime tout ce que NextRep a enregistré sur cet appareil
export async function eraseAll() {
  await db.transaction('rw', DATA_TABLES, async () => {
    for (const t of DATA_TABLES) await t.clear()
  })
  await db.sync.clear()
  await db.photos.clear()
  for (const k of Object.keys(localStorage)) if (k.startsWith('nextrep')) localStorage.removeItem(k)
}
