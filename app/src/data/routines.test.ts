// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll } from './db'
import { CATALOG } from './exercises'
import { daysLabel, plansToTemplates, saveRoutine, sessionForDay, suggestRoutine } from './routines'
import type { Template, Workout } from './types'

beforeEach(async () => { await eraseAll() })

let n = 0
const id = () => 'id' + ++n
const T = (title: string, exerciseId: string, days?: number[]): Template => ({ id: title, title, items: [{ exerciseId, sets: 3 }], ...(days ? { days } : {}), updatedAt: 1 })

describe('séances enregistrées', () => {
  it('convertit l’ancien planning : deux jours identiques donnent une séance prévue deux fois', () => {
    const items = [{ exerciseId: 'squat', sets: 3 }]
    const out = plansToTemplates([
      { weekday: 3, title: 'Corps entier', items, updatedAt: 2 },
      { weekday: 0, title: 'Corps entier', items, updatedAt: 1 },
      { weekday: 5, title: '', items: [{ exerciseId: 'course' }], updatedAt: 1 },
      { weekday: 6, title: '', items: [], updatedAt: 1 },
    ], [T('Jambes', 'squat', [5])], id)
    expect(out.map(t => [t.title, t.days]).sort()).toEqual([['Corps entier', [0, 3]], ['Jambes', undefined], ['Séance du samedi', [5]]])
  })

  it('un jour n’a qu’une séance : le choisir le retire de l’autre', async () => {
    await db.templates.bulkPut([T('Haut', 'tractions', [0, 3]), T('Bas', 'squat')])
    const moved = await saveRoutine({ ...T('Bas', 'squat'), days: [3, 1] }, n => db.table(n))
    expect(moved.map(t => t.title)).toEqual(['Haut'])
    const list = await db.templates.toArray()
    expect(sessionForDay(list, 3)?.title).toBe('Bas')
    expect(sessionForDay(list, 0)?.title).toBe('Haut')
    expect(list.find(t => t.title === 'Bas')?.days).toEqual([1, 3])
    await saveRoutine({ ...T('Bas', 'squat'), days: [] }, n => db.table(n))
    expect((await db.templates.get('Bas'))?.days).toBeUndefined()
  })

  it('écrit les jours en clair', () => {
    expect(daysLabel()).toBe('Pas de jour fixe')
    expect(daysLabel([3, 0])).toBe('Lundi et jeudi')
    expect(daysLabel([0, 2, 4])).toBe('Lundi, mercredi et vendredi')
  })

  it('conseille la séance dont les muscles sont les plus reposés', () => {
    const list = [T('Jambes', 'squat'), T('Haut', 'developpe-couche')]
    const legsYesterday: Workout = { id: 'w', date: '2026-11-13', title: 'Jambes', exerciseIds: ['squat'], updatedAt: 1,
      entries: [{ exerciseId: 'squat', sets: [1, 2, 3].map(() => ({ weight: 60, reps: 8, done: true })) }] }
    expect(suggestRoutine(list, [legsYesterday], CATALOG, '2026-11-14')?.title).toBe('Haut')
    // Rien de fait récemment, aucune séance jamais faite : pas de conseil
    expect(suggestRoutine(list, [], CATALOG, '2026-11-14')).toBeUndefined()
    // Une seule séance : rien à conseiller
    expect(suggestRoutine([list[0]], [legsYesterday], CATALOG, '2026-11-14')).toBeUndefined()
  })
})
