// Modèle de données local. Chaque type correspondra plus tard à une table du serveur :
// les identifiants sont des UUID et chaque ligne garde sa date de modification pour la synchronisation.

export type Muscle =
  | 'pecs' | 'delts' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques'
  | 'quads' | 'calves' | 'traps' | 'lats' | 'lowback' | 'glutes' | 'hams'

export type ExerciseKind = 'strength' | 'cardio'

export interface Exercise {
  id: string
  name: string
  kind: ExerciseKind
  group: string
  primary: Muscle[]
  secondary: Muscle[]
  custom?: boolean
}

export interface SetLog {
  weight?: number
  reps?: number
  km?: number
  min?: number
  done: boolean
}

export interface Entry {
  exerciseId: string
  technique?: string
  sets: SetLog[]
}

export interface Workout {
  id: string
  date: string // AAAA-MM-JJ
  title?: string
  entries: Entry[]
  exerciseIds: string[] // index pour retrouver vite l'historique d'un exercice
  note?: string
  updatedAt: number
}

export interface Measure {
  id: string
  date: string
  values: Record<string, number> // 'weight' en kg, les autres en cm
  updatedAt: number
}

export interface MeasureKind {
  id: string
  name: string
  unit: 'kg' | 'cm'
}

export interface Food {
  id: string
  date: string
  name?: string
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  updatedAt: number
}

export interface PlanItem {
  exerciseId: string
  sets?: number
  technique?: string
}

export interface Plan {
  weekday: number // 0 = lundi
  title: string
  items: PlanItem[]
  updatedAt: number
}

export interface Goal {
  id: string
  metric: string // ex. 'max-weight:squat', 'distance:course', 'measure:weight'
  target: number
  by: string
  start: number | null
  direction: 'up' | 'down'
  reachedAt?: string
  updatedAt: number
}

export interface Profile {
  name?: string
  age?: number
  heightCm?: number
  sex?: 'f' | 'h'
  weekStart: number
  restSec: number // repos par défaut entre deux séries
  nutritionTargets: { kcal: number; protein: number; carbs: number; fat: number }
}

export interface KV {
  key: string
  value: unknown
}
