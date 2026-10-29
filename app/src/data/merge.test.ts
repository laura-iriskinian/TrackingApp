// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

describe('catalogue élargi', () => {
  it('fusionne un exercice perso avec le nouvel exercice du même nom', async () => {
    const old = new Dexie('nextrep')
    old.version(2).stores({ workouts: 'id, date, *exerciseIds', measures: 'id, date', measureKinds: 'id', foods: 'id, date', plans: 'weekday', goals: 'id', exercises: 'id', notes: 'exerciseId', kv: 'key' })
    await old.table('exercises').bulkAdd([
      { id: 'perso-curl-halteres', name: 'Curl haltères', kind: 'strength', group: 'Mes exercices', primary: [], secondary: [], custom: true },
      { id: 'perso-tirage-bizarre', name: 'Tirage bizarre', kind: 'strength', group: 'Mes exercices', primary: [], secondary: [], custom: true },
    ])
    await old.table('workouts').add({ id: 'w1', date: '2026-10-01', exerciseIds: ['perso-curl-halteres', 'perso-tirage-bizarre'], updatedAt: 1, entries: [
      { exerciseId: 'perso-curl-halteres', sets: [{ weight: 12, reps: 10, done: true }] },
      { exerciseId: 'perso-tirage-bizarre', sets: [{ weight: 30, reps: 10, done: true }] },
    ] })
    await old.table('plans').add({ weekday: 0, title: 'Bras', updatedAt: 1, items: [{ exerciseId: 'perso-curl-halteres', sets: 3 }] })
    await old.table('goals').add({ id: 'g', metric: 'max-weight:perso-curl-halteres', target: 15, by: '2026-12-01', start: 12, direction: 'up', updatedAt: 1 })
    await old.table('notes').add({ exerciseId: 'perso-curl-halteres', text: 'banc incliné', updatedAt: 1 })
    old.close()

    const { db } = await import('./db')
    const w = await db.workouts.get('w1')
    expect(w?.exerciseIds).toEqual(['curl-halteres', 'perso-tirage-bizarre'])
    expect((await db.plans.get(0))?.items[0].exerciseId).toBe('curl-halteres')
    expect((await db.goals.get('g'))?.metric).toBe('max-weight:curl-halteres')
    expect((await db.notes.get('curl-halteres'))?.text).toBe('banc incliné')
    expect(await db.notes.get('perso-curl-halteres')).toBeUndefined()
    expect((await db.exercises.toArray()).map(e => e.id)).toEqual(['perso-tirage-bizarre'])
  })
})
