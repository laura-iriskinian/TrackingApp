import { db } from './db'
import type { Level, Place, Plan, PlanItem, TrainingGoal } from './types'

// Programmes tout prêts : une séance par jour d'entraînement, appliquées au planning de la semaine
export interface Program {
  id: string
  name: string
  about: string
  goals: TrainingGoal[] // le premier est l'objectif principal
  level: Level
  place: Place
  sessions: { title: string; items: PlanItem[] }[]
}

const X = (exerciseId: string, sets: number, target: string, group?: string): PlanItem =>
  group ? { exerciseId, sets, target, group } : { exerciseId, sets, target }
const CARDIO = (exerciseId: string, target: string): PlanItem => ({ exerciseId, target })

export const GOALS: { id: TrainingGoal; label: string; text: string }[] = [
  { id: 'muscle', label: 'Prendre du muscle', text: 'Devenir plus fort et plus musclé.' },
  { id: 'fit', label: 'Être en forme', text: 'Bouger régulièrement, se sentir mieux.' },
  { id: 'loss', label: 'Perdre du poids', text: 'Dépenser plus, en gardant ses muscles.' },
]
export const LEVELS: { id: Level; label: string; text: string }[] = [
  { id: 'beginner', label: 'Je débute', text: 'Pas ou peu de musculation jusqu’ici.' },
  { id: 'trained', label: 'J’ai l’habitude', text: 'Plusieurs mois d’entraînement régulier.' },
]
export const PLACES: { id: Place; label: string }[] = [
  { id: 'gym', label: 'En salle' },
  { id: 'home', label: 'À la maison' },
]

export const PROGRAMS: Program[] = [
  {
    id: 'decouverte-2', name: 'Découverte, 2 séances', goals: ['fit', 'muscle', 'loss'], level: 'beginner', place: 'gym',
    about: 'Pour découvrir la salle : deux séances complètes par semaine, surtout sur machines, où le geste est guidé.',
    sessions: [
      { title: 'Corps entier A', items: [
        X('presse-a-cuisses', 3, '10-12'), X('presse-pectoraux', 3, '10-12'), X('tirage-vertical', 3, '10-12'),
        X('developpe-epaules-machine', 2, '10-12'), X('leg-curl', 2, '10-12'), X('gainage', 3, '20-30 s'),
      ] },
      { title: 'Corps entier B', items: [
        X('squat-gobelet', 3, '10-12'), X('rowing-machine', 3, '10-12'), X('pompes-inclinees', 3, '8-12'),
        X('extension-lombaires', 2, '12'), X('elevations-laterales', 2, '12-15'), X('crunch', 3, '15'),
      ] },
    ],
  },
  {
    id: 'corps-entier-3', name: 'Corps entier, 3 séances', goals: ['muscle', 'fit'], level: 'beginner', place: 'gym',
    about: 'Tout le corps à chaque séance, trois fois par semaine. La meilleure façon de progresser vite les premiers mois.',
    sessions: [
      { title: 'Corps entier A', items: [
        X('squat-gobelet', 3, '8-12'), X('developpe-couche-halteres', 3, '8-12'), X('tirage-vertical', 3, '10-12'),
        X('leg-curl', 2, '12'), X('elevations-laterales', 2, '12-15'), X('gainage', 3, '30 s'),
      ] },
      { title: 'Corps entier B', items: [
        X('presse-a-cuisses', 3, '10-12'), X('rowing-haltere', 3, '10-12'), X('developpe-epaules-halteres', 3, '10-12'),
        X('souleve-de-terre-roumain', 3, '10'), X('curl-halteres', 2, '12'), X('extension-triceps-poulie', 2, '12'),
      ] },
      { title: 'Corps entier C', items: [
        X('fentes', 3, '10'), X('presse-pectoraux', 3, '10-12'), X('tirage-horizontal', 3, '10-12'),
        X('hip-thrust', 3, '10-12'), X('face-pull', 2, '15'), X('dead-bug', 3, '10'),
      ] },
    ],
  },
  {
    id: 'circuits-cardio-3', name: 'Circuits et cardio', goals: ['loss', 'fit'], level: 'beginner', place: 'gym',
    about: 'Des exercices enchaînés sans repos, puis un peu de cardio. On dépense beaucoup tout en gardant ses muscles.',
    sessions: [
      { title: 'Circuit A', items: [
        X('presse-a-cuisses', 3, '12-15', 'a'), X('presse-pectoraux', 3, '12-15', 'a'), X('tirage-vertical', 3, '12-15', 'a'), X('crunch', 3, '15', 'a'),
        CARDIO('velo', '20 min'),
      ] },
      { title: 'Circuit B', items: [
        X('squat-gobelet', 3, '12', 'b'), X('rowing-machine', 3, '12', 'b'), X('developpe-epaules-machine', 3, '12', 'b'), X('gainage', 3, '30 s', 'b'),
        CARDIO('rameur', '15 min'),
      ] },
      { title: 'Circuit C', items: [
        X('fentes', 3, '10', 'c'), X('pompes-inclinees', 3, '10-12', 'c'), X('tirage-horizontal', 3, '12', 'c'), X('mountain-climbers', 3, '30 s', 'c'),
        CARDIO('elliptique', '20 min'),
      ] },
    ],
  },
  {
    id: 'maison-3', name: 'À la maison, sans matériel', goals: ['fit', 'loss', 'muscle'], level: 'beginner', place: 'home',
    about: 'Trois séances au poids du corps, avec une table solide et un mur. La troisième est un circuit.',
    sessions: [
      { title: 'Maison A', items: [
        X('squat-poids-du-corps', 3, '15'), X('pompes-genoux', 3, '8-12'), X('rowing-inverse', 3, '8-12'),
        X('pont-fessier', 3, '15'), X('gainage', 3, '30 s'),
      ] },
      { title: 'Maison B', items: [
        X('fentes', 3, '10'), X('pompes-inclinees', 3, '10-12'), X('superman', 3, '12'),
        X('chaise', 3, '30 s'), X('dead-bug', 3, '10'),
      ] },
      { title: 'Circuit maison', items: [
        X('squat-poids-du-corps', 3, '15', 'm'), X('pompes-genoux', 3, '10', 'm'), X('mountain-climbers', 3, '30 s', 'm'), X('pont-fessier', 3, '15', 'm'),
        X('gainage-lateral', 2, '20 s'),
      ] },
    ],
  },
  {
    id: 'maison-halteres-3', name: 'À la maison avec haltères', goals: ['muscle', 'fit'], level: 'trained', place: 'home',
    about: 'Une paire d’haltères réglables et un banc ou une chaise solide suffisent.',
    sessions: [
      { title: 'Maison A', items: [
        X('squat-gobelet', 4, '10-12'), X('developpe-couche-halteres', 4, '8-12'), X('rowing-haltere', 4, '10-12'),
        X('elevations-laterales', 3, '12-15'), X('gainage', 3, '45 s'),
      ] },
      { title: 'Maison B', items: [
        X('fentes-bulgares', 3, '10'), X('pompes', 4, '8-15'), X('montees-banc', 3, '10'),
        X('curl-halteres', 3, '10-12'), X('extension-triceps-haltere', 3, '10-12'), X('pont-fessier', 3, '15'),
      ] },
      { title: 'Maison C', items: [
        X('squat-gobelet', 3, '12'), X('developpe-epaules-halteres', 3, '10'), X('rowing-haltere', 3, '12'),
        X('pompes-pike', 3, '6-10'), X('dead-bug', 3, '10'), X('mountain-climbers', 3, '30 s'),
      ] },
    ],
  },
  {
    id: 'force-cardio-3', name: 'Force et cardio', goals: ['fit', 'loss'], level: 'trained', place: 'gym',
    about: 'Les grands mouvements avec barre, suivis d’un temps de cardio. Pour rester fort et endurant.',
    sessions: [
      { title: 'Force A', items: [
        X('squat', 3, '8'), X('developpe-couche', 3, '8'), X('rowing-barre', 3, '8'), X('gainage', 3, '45 s'),
        CARDIO('rameur', '15 min'),
      ] },
      { title: 'Force B', items: [
        X('souleve-de-terre', 3, '5'), X('developpe-militaire', 3, '8'), X('tractions', 3, '6-10'),
        X('fentes', 3, '10', 'f'), X('mountain-climbers', 3, '30 s', 'f'),
        CARDIO('course', '20 min'),
      ] },
      { title: 'Force C', items: [
        X('presse-a-cuisses', 3, '10'), X('developpe-incline-halteres', 3, '10'), X('tirage-vertical', 3, '10'), X('releve-de-jambes', 3, '12'),
        CARDIO('velo', '20 min'),
      ] },
    ],
  },
  {
    id: 'push-pull-legs-3', name: 'Poussée, tirage, jambes', goals: ['muscle'], level: 'trained', place: 'gym',
    about: 'Chaque séance cible une famille de muscles : ceux qui poussent, ceux qui tirent, puis les jambes.',
    sessions: [
      { title: 'Poussée', items: [
        X('developpe-couche', 4, '6-8'), X('developpe-incline-halteres', 3, '8-10'), X('developpe-militaire', 3, '8-10'),
        X('elevations-laterales', 3, '12-15'), X('dips', 3, '8-12'), X('extension-triceps-poulie', 2, '12'),
      ] },
      { title: 'Tirage', items: [
        X('tractions', 4, '6-10'), X('rowing-barre', 3, '8-10'), X('tirage-horizontal', 3, '10-12'),
        X('face-pull', 3, '15'), X('curl-barre', 3, '10-12'), X('curl-marteau', 2, '12'),
      ] },
      { title: 'Jambes', items: [
        X('squat', 4, '6-8'), X('souleve-de-terre-roumain', 3, '8-10'), X('presse-a-cuisses', 3, '10-12'),
        X('leg-curl', 3, '10-12'), X('mollets-debout', 4, '12-15'), X('releve-de-jambes', 3, '12'),
      ] },
    ],
  },
  {
    id: 'haut-bas-4', name: 'Haut et bas, 4 séances', goals: ['muscle'], level: 'trained', place: 'gym',
    about: 'Deux séances pour le haut du corps, deux pour le bas. Chaque muscle est travaillé deux fois par semaine.',
    sessions: [
      { title: 'Haut 1', items: [
        X('developpe-couche', 4, '6-8'), X('rowing-barre', 4, '6-8'), X('developpe-epaules-halteres', 3, '8-10'),
        X('tirage-vertical', 3, '10-12'), X('curl-barre', 2, '10-12'), X('extension-triceps-poulie', 2, '10-12'),
      ] },
      { title: 'Bas 1', items: [
        X('squat', 4, '6-8'), X('souleve-de-terre-roumain', 3, '8-10'), X('presse-a-cuisses', 3, '10-12'),
        X('leg-curl', 3, '10-12'), X('mollets-debout', 3, '12-15'), X('releve-de-jambes', 3, '12'),
      ] },
      { title: 'Haut 2', items: [
        X('developpe-incline-halteres', 4, '8-10'), X('tractions', 4, '6-10'), X('elevations-laterales', 3, '12-15'),
        X('rowing-haltere', 3, '10-12'), X('curl-marteau', 2, '12'), X('barre-au-front', 2, '10-12'),
      ] },
      { title: 'Bas 2', items: [
        X('souleve-de-terre', 3, '5'), X('fentes-bulgares', 3, '8-10'), X('hip-thrust', 3, '10-12'),
        X('leg-extension', 3, '12-15'), X('mollets-assis', 3, '15'), X('gainage', 3, '45 s'),
      ] },
    ],
  },
]

// « Prendre du muscle · débutant · en salle · 3 séances par semaine »
export const programTags = (p: Program) => [
  GOALS.find(g => g.id === p.goals[0])?.label, p.level === 'beginner' ? 'débutant' : 'confirmé',
  PLACES.find(x => x.id === p.place)?.label.toLowerCase(), `${p.sessions.length} séances par semaine`,
].join(' · ')

export interface Wish { goal?: TrainingGoal; level?: Level; place?: Place; days?: number }

// Programmes classés du plus adapté au moins adapté. Un débutant ne se voit pas proposer d'abord un programme confirmé.
export function rankPrograms(w: Wish): Program[] {
  const score = (p: Program) =>
    (w.goal && p.goals.includes(w.goal) ? 4 + (p.goals[0] === w.goal ? 1 : 0) : 0)
    + (w.place === p.place ? 6 : 0)
    + (w.level === p.level ? 3 : w.level === 'beginner' ? -6 : 0)
    - (w.days ? Math.abs(p.sessions.length - w.days) * 2 : 0)
  return PROGRAMS.map((p, i) => ({ p, s: score(p), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p)
}

// Jours proposés selon le nombre de séances : un jour de repos entre deux séances quand c'est possible
export function defaultDays(n: number): number[] {
  return ({ 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5] } as Record<number, number[]>)[n] ?? [0, 2, 4]
}

export function programPlans(p: Program, days: number[]): Plan[] {
  const now = Date.now()
  return p.sessions.map((s, i) => ({ weekday: days[i], title: s.title, items: s.items.map(x => ({ ...x })), updatedAt: now }))
}

// Remplace le planning de la semaine par le programme, et règle l'objectif de séances
export async function applyProgram(p: Program, days: number[]) {
  const plans = programPlans(p, [...days].sort((a, b) => a - b))
  await db.transaction('rw', db.plans, db.kv, async () => {
    await db.plans.clear()
    await db.plans.bulkPut(plans)
    const row = await db.kv.get('profile')
    await db.kv.put({ key: 'profile', value: { ...(row?.value as object | undefined), program: p.id, weeklyTarget: plans.length } })
  })
}
