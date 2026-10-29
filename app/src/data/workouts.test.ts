// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll } from './db'
import { deleteWorkout, saveWorkout } from './workouts'

beforeEach(async () => {
  await eraseAll()
  await db.workouts.add({
    id: 'w1', date: '2026-10-01', exerciseIds: ['squat'], updatedAt: 1, note: 'bonne forme',
    entries: [{ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, done: true }] }],
  })
})

describe('séances passées', () => {
  it('modifie une séance et met à jour son index d’exercices', async () => {
    const r = await saveWorkout({
      id: 'w1', date: '2026-10-01',
      entries: [
        { exerciseId: 'squat', sets: [{ weight: 62.5, reps: 8, done: true }, { done: true }] },
        { exerciseId: 'course', sets: [{ km: 5, min: 28, done: false }] },
      ],
    })
    expect(r?.merged).toBe(false)
    const w = await db.workouts.get('w1')
    expect(w?.entries.map(e => e.sets)).toEqual([[{ weight: 62.5, reps: 8, done: true }], [{ km: 5, min: 28, done: true }]])
    expect(w?.exerciseIds).toEqual(['squat', 'course'])
    expect(w?.note).toBe('bonne forme') // les champs non modifiés sont gardés
  })

  it('ajoute une séance à une date passée', async () => {
    const r = await saveWorkout({ date: '2026-09-20', entries: [{ exerciseId: 'squat', sets: [{ weight: 50, reps: 10, done: true }] }] })
    expect(r?.merged).toBe(false)
    expect(await db.workouts.count()).toBe(2)
    expect((await db.workouts.get(r!.w.id))?.date).toBe('2026-09-20')
  })

  it('regroupe avec la séance existante du même jour', async () => {
    const r = await saveWorkout({ date: '2026-10-01', entries: [{ exerciseId: 'course', sets: [{ km: 3, done: true }] }] })
    expect(r).toMatchObject({ merged: true, w: { id: 'w1' } })
    expect(await db.workouts.count()).toBe(1)
    expect((await db.workouts.get('w1'))?.exerciseIds).toEqual(['squat', 'course'])
  })

  it('déplace une séance sur un jour déjà pris en les regroupant', async () => {
    await db.workouts.add({ id: 'w2', date: '2026-10-03', exerciseIds: ['course'], updatedAt: 1, entries: [{ exerciseId: 'course', sets: [{ km: 3, done: true }] }] })
    const r = await saveWorkout({ id: 'w2', date: '2026-10-01', entries: [{ exerciseId: 'course', sets: [{ km: 3, done: true }] }] })
    expect(r?.w.id).toBe('w1')
    expect(await db.workouts.get('w2')).toBeUndefined()
    expect((await db.workouts.get('w1'))?.entries).toHaveLength(2)
  })

  it('refuse une séance vide', async () => {
    expect(await saveWorkout({ id: 'w1', date: '2026-10-01', entries: [{ exerciseId: 'squat', sets: [{ done: true }] }] })).toBeNull()
    expect((await db.workouts.get('w1'))?.entries[0].sets).toHaveLength(1)
  })

  it('supprime une séance', async () => {
    await deleteWorkout('w1')
    expect(await db.workouts.count()).toBe(0)
  })
})
