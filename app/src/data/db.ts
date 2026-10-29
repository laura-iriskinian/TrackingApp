import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, Food, Goal, KV, Measure, MeasureKind, Plan, Profile, Workout } from './types'
import { CATALOG } from './exercises'

export const db = new Dexie('nextrep') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  measures: EntityTable<Measure, 'id'>
  measureKinds: EntityTable<MeasureKind, 'id'>
  foods: EntityTable<Food, 'id'>
  plans: EntityTable<Plan, 'weekday'>
  goals: EntityTable<Goal, 'id'>
  exercises: EntityTable<Exercise, 'id'> // exercices créés par l'utilisateur
  kv: EntityTable<KV, 'key'>
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

export const DATA_TABLES = [db.workouts, db.measures, db.measureKinds, db.foods, db.plans, db.goals, db.exercises, db.kv]

export const newId = () => crypto.randomUUID()

export const DEFAULT_PROFILE: Profile = {
  weekStart: 0,
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
  return { app: 'NextRep', format: 1, exportedAt: new Date().toISOString(), data }
}

// Droit à l'effacement : supprime tout ce que NextRep a enregistré sur cet appareil
export async function eraseAll() {
  await db.transaction('rw', DATA_TABLES, async () => {
    for (const t of DATA_TABLES) await t.clear()
  })
  for (const k of Object.keys(localStorage)) if (k.startsWith('nextrep')) localStorage.removeItem(k)
}
