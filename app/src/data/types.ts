// Modèle de données local. Chaque type correspondra plus tard à une table du serveur :
// les identifiants sont des UUID et chaque ligne garde sa date de modification pour la synchronisation.

export type Muscle =
  | 'pecs' | 'delts' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques'
  | 'quads' | 'calves' | 'traps' | 'lats' | 'lowback' | 'glutes' | 'hams'

export type ExerciseKind = 'strength' | 'cardio'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'

export interface Exercise {
  id: string
  name: string
  kind: ExerciseKind
  group: string
  primary: Muscle[]
  secondary: Muscle[]
  equipment?: Equipment // absent pour le cardio et les exercices créés par l'utilisateur
  custom?: boolean
}

// Façon de faire une série. Absent = série normale.
export type SetType = 'warmup' | 'failure' | 'drop' | 'restpause' | 'pyramid'

// Ressenti d'effort, facultatif : simple, RPE (1 à 10) ou répétitions en réserve
export type Feel = 'easy' | 'hard' | 'max'

export interface SetLog {
  weight?: number
  reps?: number
  km?: number
  min?: number
  type?: SetType
  feel?: Feel
  rpe?: number
  rir?: number
  done: boolean
}

export interface Entry {
  exerciseId: string
  group?: string // exercices enchaînés en superset ou circuit : même valeur, à la suite dans la séance
  target?: string // répétitions visées, reprises du planning
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
  types?: (SetType | null)[] // type de chaque série prévue, null = normale
  group?: string
  target?: string // répétitions visées, en clair : « 8-12 », « 30 s »
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

export type TrainingGoal = 'muscle' | 'fit' | 'loss'
export type Level = 'beginner' | 'trained'
export type Place = 'gym' | 'home'

export interface Profile {
  name?: string
  goal?: TrainingGoal // objectif choisi au premier lancement
  level?: Level
  place?: Place
  program?: string // programme tout prêt appliqué au planning
  onboarded?: boolean // false : premier lancement à refaire
  age?: number
  heightCm?: number
  sex?: 'f' | 'h'
  weekStart: number
  restSec: number // repos par défaut entre deux séries
  effortMode: 'off' | 'simple' | 'rpe' | 'rir'
  barKg: number // poids de la barre, pour le calcul des disques
  plates: number[] // disques disponibles
  weeklyTarget: number // objectif de séances par semaine
  pauseWeeks: string[] // semaines de pause (date du premier jour)
  reminderTime: string // HH:MM
  nutritionTargets: { kcal: number; protein: number; carbs: number; fat: number }
}

export interface ExerciseNote {
  exerciseId: string
  text: string
  updatedAt: number
}

export interface KV {
  key: string
  value: unknown
}
