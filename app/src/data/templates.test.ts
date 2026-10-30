// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll, exportAll, saveProfile } from './db'
import { checkBackup } from './backup'
import { finishSession, lastSets, startSession } from './session'
import { CATALOG } from './exercises'
import { today, weekStartOf, addDays } from '../lib/dates'

beforeEach(async () => { await eraseAll() })

describe('modèles, cycle et photos', () => {
  it('garde les modèles et le cycle dans une sauvegarde', () => {
    const b = checkBackup(JSON.stringify({ app: 'NextRep', format: 2, data: {
      templates: [{ id: 't1', title: 'Jambes', items: [{ exerciseId: 'squat', sets: 3, target: '8-12' }], updatedAt: 1 }, { id: 't2', items: [] }],
      kv: [{ key: 'profile', value: { cycle: { start: '2026-10-05', weeks: 4, deload: true } } }],
    } }))
    expect(b.rows.templates).toEqual([{ id: 't1', title: 'Jambes', items: [{ exerciseId: 'squat', sets: 3, target: '8-12' }], updatedAt: 1 }])
    expect(b.skipped).toBe(1)
    expect((b.rows.kv[0].value as { cycle: unknown }).cycle).toEqual({ start: '2026-10-05', weeks: 4, deload: true })
  })

  it('n’exporte jamais les photos', async () => {
    await db.photos.add({ id: 'p', date: '2026-10-01', pose: 'face', blob: new Blob(['x']), updatedAt: 1 })
    const out = await exportAll()
    expect(Object.keys(out.data)).not.toContain('photos')
    expect(Object.keys(out.data)).toContain('templates')
    await eraseAll()
    expect(await db.photos.count()).toBe(0)
  })

  it('allège la séance en semaine de deload, puis l’ignore pour la suite', async () => {
    await db.workouts.add({ id: 'w0', date: '2026-01-01', exerciseIds: ['squat'], updatedAt: 1, entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5, done: true }, { weight: 100, reps: 5, done: true }] }] })
    // Aujourd'hui tombe dans la 4e et dernière semaine du cycle
    await saveProfile({ cycle: { start: addDays(weekStartOf(today()), -21), weeks: 4, deload: true } })
    const s = await startSession('Jambes', [{ exerciseId: 'squat', sets: 4 }], CATALOG)
    expect(s.deload).toBe(true)
    expect(s.entries[0].sets.map(x => x.weight)).toEqual([60, 60])
    await finishSession({ ...s, entries: s.entries.map(e => ({ ...e, sets: e.sets.map(x => ({ ...x, done: true })) })) })
    expect((await db.workouts.where('date').equals(today()).first())?.deload).toBe(true)
    expect((await lastSets('squat'))[0].weight).toBe(100)
  })
})
