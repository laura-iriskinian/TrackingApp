// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { allExercises, db, eraseAll } from './db'
import { buildEntry, completeSet, finishSession, getSession, isFinished, startSession } from './session'
import { CATALOG } from './exercises'
import { today } from '../lib/dates'

const squat = CATALOG.find(e => e.id === 'squat')!
const course = CATALOG.find(e => e.id === 'course')!

beforeEach(async () => { await eraseAll() })

describe('séance guidée', () => {
  it('reprend les valeurs de la dernière fois', async () => {
    await db.workouts.add({
      id: 'w1', date: '2026-10-01', exerciseIds: ['squat'], updatedAt: 1,
      entries: [{ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, done: true }, { weight: 65, reps: 6, done: true }] }],
    })
    const s = await startSession('Jambes', [{ exerciseId: 'squat', sets: 3 }, { exerciseId: 'inconnu' }], await allExercises())
    expect(s.entries).toHaveLength(1) // l'exercice inconnu est ignoré
    expect(s.entries[0].sets).toEqual([
      { weight: 60, reps: 8, done: false },
      { weight: 65, reps: 6, done: false },
      { weight: 65, reps: 6, done: false },
    ])
    expect(await getSession()).toEqual(s)
  })

  it('prévoit 3 séries pour un exercice jamais fait, 1 pour le cardio', () => {
    expect(buildEntry(squat, []).sets).toHaveLength(3)
    expect(buildEntry(course, []).sets).toEqual([{ km: undefined, min: undefined, done: false }])
  })

  it('propage une nouvelle charge aux séries suivantes identiques', async () => {
    const s = { id: 's', date: today(), startedAt: 0, cur: 0, entries: [buildEntry(squat, [{ weight: 60, reps: 8, done: true }], { sets: 3 })] }
    const n = completeSet(s, 0, 0, { weight: 62.5, reps: 8 })
    expect(n.entries[0].sets.map(x => [x.weight, x.done])).toEqual([[62.5, true], [62.5, false], [62.5, false]])
  })

  it('passe à l’exercice suivant quand le premier est fini', () => {
    let s = { id: 's', date: today(), startedAt: 0, cur: 0, entries: [buildEntry(squat, []), buildEntry(course, [])] }
    for (const i of [0, 1, 2]) s = completeSet(s, 0, i, { weight: 50, reps: 10 })
    expect(s.cur).toBe(1)
    expect(isFinished(s)).toBe(false)
    s = completeSet(s, 1, 0, { km: 5, min: 30 })
    expect(isFinished(s)).toBe(true)
  })

  it('enregistre uniquement les séries faites, et fusionne avec la séance du même jour', async () => {
    await db.workouts.add({
      id: 'matin', date: today(), exerciseIds: ['course'], updatedAt: 1,
      entries: [{ exerciseId: 'course', sets: [{ km: 3, min: 20, done: true }] }],
    })
    let s = await startSession(undefined, [{ exerciseId: 'squat' }], await allExercises())
    s = completeSet(s, 0, 0, { weight: 40, reps: 10 })
    const w = await finishSession(s)
    expect(w?.id).toBe('matin')
    const saved = await db.workouts.get('matin')
    expect(saved?.entries.map(e => [e.exerciseId, e.sets.length])).toEqual([['course', 1], ['squat', 1]])
    expect(saved?.exerciseIds).toEqual(['course', 'squat'])
    expect(await getSession()).toBeUndefined()
  })

  it('n’enregistre rien sans série validée', async () => {
    const s = await startSession(undefined, [{ exerciseId: 'squat' }], await allExercises())
    expect(await finishSession(s)).toBeNull()
    expect(await db.workouts.count()).toBe(0)
    expect(await getSession()).toBeUndefined()
  })
})
