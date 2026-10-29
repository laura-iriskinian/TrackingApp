import { describe, expect, it } from 'vitest'
import { migrateEntries, migrateItems, typesSummary } from './sets'
import { entrySummary, volume } from '../lib/summary'

describe('type de chaque série', () => {
  it('reprend la technique d’un exercice sur chacune de ses séries', () => {
    const [e] = migrateEntries([{ exerciseId: 'squat', technique: 'Pyramidal', sets: [{ weight: 60, reps: 8, done: true }, { weight: 70, reps: 6, done: true }] }])
    expect(e).toEqual({ exerciseId: 'squat', sets: [{ weight: 60, reps: 8, type: 'pyramid', done: true }, { weight: 70, reps: 6, type: 'pyramid', done: true }] })
  })

  it('transforme les « Superset » consécutifs en exercices enchaînés', () => {
    const items = migrateItems([
      { exerciseId: 'a', technique: 'Superset' }, { exerciseId: 'b', technique: 'Superset' },
      { exerciseId: 'c' }, { exerciseId: 'd', technique: 'Superset' }, { exerciseId: 'e', technique: 'Superset' },
    ])
    expect(items[0].group).toBeTruthy()
    expect(items[1].group).toBe(items[0].group)
    expect(items[2].group).toBeUndefined()
    expect(items[3].group).toBe(items[4].group)
    expect(items[3].group).not.toBe(items[0].group)
    expect(items.some(i => 'technique' in i)).toBe(false)
  })

  it('prévoit le type pour chaque série du planning', () => {
    expect(migrateItems([{ exerciseId: 'a', sets: 2, technique: 'Dégressif' }])[0].types).toEqual(['drop', 'drop'])
    expect(typesSummary(['warmup', null, 'pyramid', 'pyramid'])).toBe('1 échauffement, 2 pyramidales')
  })

  it('affiche le type et exclut l’échauffement du volume', () => {
    const sets = [{ weight: 20, reps: 12, type: 'warmup' as const, done: true }, { weight: 60, reps: 8, done: true }, { weight: 60, reps: 8, done: true }]
    expect(entrySummary({ exerciseId: 'squat', sets })).toBe('1 × 12 · 20 kg échauffement / 2 × 8 · 60 kg')
    expect(volume(sets)).toBe(960)
  })
})
