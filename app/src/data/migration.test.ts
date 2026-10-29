// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

describe('mise à jour de la base', () => {
  it('passe les techniques au niveau des séries sans rien perdre', async () => {
    // Base telle qu'enregistrée par la version précédente de l'app
    const old = new Dexie('nextrep')
    old.version(1).stores({ workouts: 'id, date, *exerciseIds', measures: 'id, date', measureKinds: 'id', foods: 'id, date', plans: 'weekday', goals: 'id', exercises: 'id', kv: 'key' })
    await old.table('workouts').add({ id: 'w1', date: '2026-10-01', exerciseIds: ['squat'], updatedAt: 1, entries: [{ exerciseId: 'squat', technique: 'Dégressif', sets: [{ weight: 60, reps: 8, done: true }] }] })
    await old.table('plans').add({ weekday: 0, title: 'Jambes', updatedAt: 1, items: [{ exerciseId: 'squat', sets: 2, technique: 'Superset' }, { exerciseId: 'fentes', technique: 'Superset' }] })
    await old.table('kv').add({ key: 'session', value: { id: 's', entries: [{ exerciseId: 'squat', technique: 'À l\'échec', sets: [{ done: false }] }] } })
    old.close()

    const { db } = await import('./db')
    const w = await db.workouts.get('w1')
    expect(w?.entries[0]).toEqual({ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, type: 'drop', done: true }] })
    const p = await db.plans.get(0)
    expect(p?.items[0].group).toBeTruthy()
    expect(p?.items[1].group).toBe(p?.items[0].group)
    const s = (await db.kv.get('session'))?.value as { entries: { sets: { type?: string }[] }[] }
    expect(s.entries[0].sets[0].type).toBe('failure')
    expect(await db.notes.count()).toBe(0)
  })
})
