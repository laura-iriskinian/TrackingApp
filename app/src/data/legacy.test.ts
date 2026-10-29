// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll, getProfile } from './db'
import { importLegacy, legacySummary } from './legacy'
import { LEGACY_KEY, LEGACY_PREFS_KEY } from '../config'

// Données au format de l'ancienne app « Suivi sport »
const OLD = {
  sets: [
    { id: 'a1', d: '2026-10-01', ex: 'Squat', w: 80, r: 8, n: 3 },
    { id: 'a2', d: '2026-10-01', ex: 'developpe couche', w: 60, r: 10, n: 2 },
    { id: 'a3', d: '2026-10-03', ex: 'Mon exo maison', w: 12, r: 15 },
  ],
  runs: [{ id: 'r1', d: '2026-10-01', type: 'course', km: 5, min: 28 }],
  body: [{ id: 'b1', d: '2026-10-01', bw: 70.2, ventre: 80, xk1: 33 }],
  custom: [{ k: 'xk1', n: 'Mollet' }],
  plan: { 0: { name: 'Jambes', ex: [{ n: 'Squat', s: 4, t: 'Pyramidal' }, { c: 'course' }] } },
  chk: {},
  goals: [{ id: 'g1', k: 'ex:Squat', t: 100, by: '2026-12-01', s: 80, dir: 'up' }],
  myex: ['Mon exo maison'],
  prof: { age: 30, h: 170, sex: 'f', ws: 2 },
  food: [{ id: 'f1', d: '2026-10-01', n: 'Riz', kcal: 300, p: 6 }],
  ng: { kcal: 1800, p: 120, g: 200, l: 60 },
}

beforeEach(async () => {
  localStorage.clear()
  await eraseAll()
})

describe('récupération depuis Suivi sport', () => {
  it("ne propose rien quand l'ancienne app n'a pas de données", () => {
    expect(legacySummary()).toBeNull()
  })

  it('copie séances, mesures, planning, objectifs et profil', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(OLD))
    localStorage.setItem(LEGACY_PREFS_KEY, JSON.stringify({ n: 'Laura' }))
    expect(legacySummary()).toEqual({ sessions: 2, measures: 1, foods: 1 })

    const r = await importLegacy()
    expect(r.workouts).toBe(2)

    const [d1, d3] = await db.workouts.orderBy('date').toArray()
    expect(d1.exerciseIds).toEqual(['squat', 'developpe-couche', 'course'])
    expect(d1.entries[0].sets).toHaveLength(3)
    expect(d1.entries[0].sets[0]).toEqual({ weight: 80, reps: 8, done: true })
    expect(d1.entries[2].sets[0]).toMatchObject({ km: 5, min: 28 })
    expect(d3.entries[0].exerciseId).toBe('perso-mon-exo-maison')
    expect(await db.exercises.count()).toBe(1)

    const m = (await db.measures.toArray())[0]
    expect(m.values).toEqual({ weight: 70.2, waist: 80, 'perso-k1': 33 })
    expect((await db.measureKinds.toArray())[0]).toMatchObject({ id: 'perso-k1', name: 'Mollet' })

    const plan = await db.plans.get(0)
    expect(plan?.items).toEqual([{ exerciseId: 'squat', sets: 4, technique: 'Pyramidal' }, { exerciseId: 'course' }])

    expect((await db.goals.toArray())[0]).toMatchObject({ metric: 'max-weight:squat', target: 100, start: 80, direction: 'up' })

    const p = await getProfile()
    expect(p).toMatchObject({ name: 'Laura', age: 30, heightCm: 170, sex: 'f', weekStart: 2 })
    expect(p.nutritionTargets.protein).toBe(120)
  })

  it("ne modifie jamais les données de l'ancienne app", async () => {
    const raw = JSON.stringify(OLD)
    localStorage.setItem(LEGACY_KEY, raw)
    await importLegacy()
    await eraseAll()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(raw)
  })

  it('remplace au lieu de dupliquer quand on récupère deux fois', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(OLD))
    await importLegacy()
    await importLegacy()
    expect(await db.workouts.count()).toBe(2)
  })

  it('ignore les lignes invalides sans planter', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...OLD, sets: [{ d: 'pas une date', ex: '<img>', w: 'x', r: 1 }, ...OLD.sets] }))
    const r = await importLegacy()
    expect(r.workouts).toBe(2)
  })
})
