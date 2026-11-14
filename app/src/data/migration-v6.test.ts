// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

describe('mise à jour de la base, planning vers liste de séances', () => {
  it('garde le planning, les modèles et l’historique', async () => {
    // Base telle qu'enregistrée par la version précédente de l'app : un planning sur trois jours et deux modèles
    const old = new Dexie('nextrep')
    old.version(5).stores({ workouts: 'id, date, *exerciseIds', measures: 'id, date', measureKinds: 'id', foods: 'id, date', plans: 'weekday', goals: 'id', exercises: 'id', kv: 'key', notes: 'exerciseId', sync: 'key', templates: 'id', photos: 'id, date' })
    const haut = [{ exerciseId: 'developpe-couche', sets: 4 }, { exerciseId: 'tractions', sets: 3 }]
    await old.table('plans').bulkAdd([
      { weekday: 0, title: 'Haut du corps', items: haut, updatedAt: 1 },
      { weekday: 2, title: 'Jambes', items: [{ exerciseId: 'squat', sets: 4 }], updatedAt: 1 },
      { weekday: 4, title: 'Haut du corps', items: haut, updatedAt: 1 },
    ])
    await old.table('templates').bulkAdd([
      { id: 't1', title: 'Cardio', items: [{ exerciseId: 'course' }], updatedAt: 1 },
      { id: 't2', title: 'Jambes', items: [{ exerciseId: 'squat', sets: 4 }], updatedAt: 1 },
    ])
    await old.table('workouts').add({ id: 'w1', date: '2026-11-10', title: 'Jambes', exerciseIds: ['squat'], updatedAt: 1, entries: [] })
    old.close()

    const { db } = await import('./db')
    const list = (await db.templates.toArray()).map(t => [t.title, t.days, t.items.length]).sort()
    expect(list).toEqual([
      ['Cardio', undefined, 1],
      ['Haut du corps', [0, 4], 2],
      ['Jambes', [2], 1], // le modèle identique reçoit le jour du planning, pas de doublon
    ])
    expect(await db.plans.count()).toBe(0)
    expect(await db.workouts.get('w1')).toBeTruthy()
  })
})
