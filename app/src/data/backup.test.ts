// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll, exportAll, getProfile, saveProfile } from './db'
import { checkBackup, restoreBackup } from './backup'

beforeEach(async () => { await eraseAll() })

const fill = async () => {
  await db.workouts.add({ id: 'w1', date: '2026-10-01', exerciseIds: ['squat'], updatedAt: 1, entries: [{ exerciseId: 'squat', group: 'g1', sets: [{ weight: 60, reps: 8, type: 'warmup', feel: 'easy', done: true }] }] })
  await db.measures.add({ id: 'm1', date: '2026-10-01', values: { weight: 61 }, updatedAt: 1 })
  await db.measureKinds.add({ id: 'perso-mollet', name: 'Mollet', unit: 'cm' })
  await db.plans.add({ weekday: 2, title: 'Haut', items: [{ exerciseId: 'tractions', sets: 2, types: ['warmup', null] }], updatedAt: 1 })
  await db.goals.add({ id: 'g', metric: 'max-weight:squat', target: 80, by: '2026-12-01', start: 60, direction: 'up', updatedAt: 1 })
  await db.exercises.add({ id: 'perso-x', name: 'X', kind: 'strength', group: 'Mes exercices', primary: ['quads'], secondary: [], custom: true })
  await db.notes.add({ exerciseId: 'squat', text: 'pieds écartés', updatedAt: 1 })
  await saveProfile({ name: 'Laura', effortMode: 'rpe' })
}

describe('sauvegarde NextRep', () => {
  it('restaure à l’identique une sauvegarde exportée', async () => {
    await fill()
    const before = await exportAll()
    await eraseAll()
    const b = checkBackup(JSON.stringify(before))
    expect(b.skipped).toBe(0)
    await restoreBackup(b)
    const after = await exportAll()
    expect(after.data).toEqual(before.data)
    expect((await getProfile()).effortMode).toBe('rpe')
  })

  it('refuse ce qui n’est pas une sauvegarde NextRep', () => {
    expect(() => checkBackup('pas du json')).toThrow('pas une sauvegarde')
    expect(() => checkBackup(JSON.stringify({ sets: [], body: [] }))).toThrow('pas une sauvegarde')
    expect(() => checkBackup(JSON.stringify({ app: 'NextRep', format: 9, data: {} }))).toThrow('plus récente')
    expect(() => checkBackup(JSON.stringify({ app: 'NextRep', format: 2, data: { workouts: 'x' } }))).toThrow('abîmée')
  })

  it('écarte les lignes invalides et les champs inconnus', () => {
    const b = checkBackup(JSON.stringify({
      app: 'NextRep', format: 2, data: {
        workouts: [
          { id: 'ok', date: '2026-10-01', entries: [{ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, done: true, evil: '<script>' }] }], exerciseIds: ['autre'], updatedAt: 1, hack: 1 },
          { id: 'bad', date: 'demain', entries: [] },
          { id: '<img src=x>', date: '2026-10-01', entries: [] },
          { id: 'big', date: '2026-10-01', entries: [{ exerciseId: 'squat', sets: [{ weight: 'beaucoup', done: true }] }] },
        ],
        kv: [{ key: 'session', value: {} }, { key: 'profile', value: { name: 'L', restSec: -5, admin: true } }],
      },
    }))
    expect(b.rows.workouts).toEqual([{ id: 'ok', date: '2026-10-01', entries: [{ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, done: true }] }], exerciseIds: ['squat'], updatedAt: 1 }])
    expect(b.rows.kv).toEqual([{ key: 'profile', value: { name: 'L', nutritionTargets: {} } }])
    // 3 séances invalides et la séance en cours ; les champs invalides du profil sont seulement ignorés
    expect(b.skipped).toBe(4)
  })

  it('reprend une sauvegarde de la version précédente (technique par exercice)', () => {
    const b = checkBackup(JSON.stringify({ app: 'NextRep', format: 1, data: { workouts: [{ id: 'w', date: '2026-10-01', updatedAt: 1, entries: [{ exerciseId: 'squat', technique: 'Pyramidal', sets: [{ weight: 60, reps: 8, done: true }] }] }] } }))
    expect(b.rows.workouts[0].entries[0]).toEqual({ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, type: 'pyramid', done: true }] })
  })

  it('garde la séance en cours', async () => {
    await db.kv.put({ key: 'session', value: { id: 's' } })
    await restoreBackup(checkBackup(JSON.stringify({ app: 'NextRep', format: 2, data: {} })))
    expect(await db.kv.get('session')).toEqual({ key: 'session', value: { id: 's' } })
  })
})
