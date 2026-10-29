// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CATALOG, MUSCLE_LABEL } from './exercises'
import { GUIDES } from './guides'
import { applyProgram, defaultDays, PROGRAMS, rankPrograms } from './programs'
import { db, eraseAll, getProfile } from './db'
import { buildEntry } from './session'
import { checkBackup } from './backup'

const byId = new Map(CATALOG.map(e => [e.id, e]))

describe('catalogue et fiches', () => {
  it('a des identifiants uniques et des muscles connus', () => {
    expect(byId.size).toBe(CATALOG.length)
    for (const e of CATALOG) {
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLE_LABEL[m], e.id).toBeTruthy()
      expect(e.primary.length, e.id).toBeGreaterThan(0)
      if (e.kind === 'strength') expect(e.equipment, e.id).toBeTruthy()
    }
  })

  it('a une fiche pour chaque exercice, et aucune fiche orpheline', () => {
    for (const e of CATALOG) {
      const g = GUIDES[e.id]
      expect(g, e.id).toBeTruthy()
      expect(g.how.length, e.id).toBeGreaterThan(0)
      expect(g.mistakes.length, e.id).toBeGreaterThan(0)
    }
    for (const id of Object.keys(GUIDES)) expect(byId.has(id), id).toBe(true)
  })
})

describe('programmes', () => {
  it('n’utilisent que des exercices du catalogue, avec des supersets cohérents', () => {
    for (const p of PROGRAMS) {
      expect(p.sessions.length).toBeGreaterThan(0)
      expect(defaultDays(p.sessions.length)).toHaveLength(p.sessions.length)
      for (const s of p.sessions) {
        s.items.forEach((it, i) => {
          const ex = byId.get(it.exerciseId)
          expect(ex, `${p.id} : ${it.exerciseId}`).toBeTruthy()
          if (ex!.kind === 'cardio') expect(it.sets).toBeUndefined()
          // Un exercice enchaîné l'est avec son voisin
          if (it.group) expect(s.items[i - 1]?.group === it.group || s.items[i + 1]?.group === it.group).toBe(true)
        })
      }
    }
  })

  it('propose d’abord le programme le plus adapté', () => {
    expect(rankPrograms({ goal: 'fit', level: 'beginner', place: 'home', days: 3 })[0].id).toBe('maison-3')
    expect(rankPrograms({ goal: 'muscle', level: 'trained', place: 'gym', days: 4 })[0].id).toBe('haut-bas-4')
    expect(rankPrograms({ goal: 'loss', level: 'beginner', place: 'gym', days: 3 })[0].id).toBe('circuits-cardio-3')
    expect(rankPrograms({ goal: 'muscle', level: 'beginner', place: 'gym', days: 4 })[0].level).toBe('beginner')
  })

  beforeEach(async () => { await eraseAll() })

  it('remplace le planning et règle l’objectif de séances', async () => {
    await db.plans.put({ weekday: 6, title: 'Ancien', items: [{ exerciseId: 'squat' }], updatedAt: 1 })
    const p = PROGRAMS.find(x => x.id === 'corps-entier-3')!
    await applyProgram(p, [4, 0, 2])
    const plans = await db.plans.orderBy('weekday').toArray()
    expect(plans.map(x => [x.weekday, x.title])).toEqual([[0, 'Corps entier A'], [2, 'Corps entier B'], [4, 'Corps entier C']])
    const prof = await getProfile()
    expect(prof.program).toBe('corps-entier-3')
    expect(prof.weeklyTarget).toBe(3)
  })

  it('part du bas de l’objectif pour un exercice jamais fait', () => {
    const squat = byId.get('squat')!
    const e = buildEntry(squat, [], { sets: 2, target: '8-12' })
    expect(e.target).toBe('8-12')
    expect(e.sets.map(s => s.reps)).toEqual([8, 8])
    expect(buildEntry(squat, [{ weight: 60, reps: 10, done: true }], { sets: 1, target: '8-12' }).sets[0].reps).toBe(10)
  })

  it('garde l’objectif et le profil dans une sauvegarde', () => {
    const b = checkBackup(JSON.stringify({
      app: 'NextRep', format: 2, data: {
        plans: [{ weekday: 0, title: 'A', items: [{ exerciseId: 'squat', sets: 3, target: '8-12' }] }],
        kv: [{ key: 'profile', value: { goal: 'loss', level: 'beginner', place: 'home', program: 'maison-3', onboarded: true, sex: 'x' } }],
      },
    }))
    expect(b.rows.plans[0].items[0].target).toBe('8-12')
    expect(b.rows.kv[0].value).toMatchObject({ goal: 'loss', level: 'beginner', place: 'home', program: 'maison-3', onboarded: true })
    expect((b.rows.kv[0].value as { sex?: string }).sex).toBeUndefined()
  })
})
