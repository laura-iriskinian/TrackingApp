import { describe, expect, it } from 'vitest'
import { checkBackup } from '../data/backup'
import { CATALOG } from '../data/exercises'
import { nextPart } from '../data/sets'
import { deloadEntry } from './cycle'
import { bestOf } from './records'
import { entrySummary, setLine, volume } from './summary'

const squat = CATALOG.find(e => e.id === 'squat')
const gainage = CATALOG.find(e => e.id === 'gainage')
const drop = { weight: 60, reps: 8, type: 'drop' as const, parts: [{ weight: 45, reps: 6 }, { weight: 30, reps: 5 }], done: true }
const rp = { weight: 60, reps: 8, type: 'restpause' as const, parts: [{ reps: 4 }, { reps: 3 }], done: true }

describe('séries à plusieurs étapes', () => {
  it('écrit chaque palier ou reprise', () => {
    expect(setLine(drop)).toBe('60 kg × 8 → 45 kg × 6 → 30 kg × 5')
    expect(setLine(rp)).toBe('60 kg × 8 + 4 + 3')
    expect(entrySummary({ exerciseId: 'squat', sets: [drop, drop] }, squat)).toBe('2 × (60 kg × 8 → 45 kg × 6 → 30 kg × 5) dégressive')
    expect(entrySummary({ exerciseId: 'squat', sets: [rp] }, squat)).toBe('60 kg × 8 + 4 + 3 rest-pause')
  })

  it('compte toutes les étapes dans le volume, pas dans les records', () => {
    expect(volume([drop])).toBe(480 + 270 + 150)
    expect(volume([rp])).toBe(60 * 15)
    expect(bestOf([drop]).weight).toBe(60)
    expect(bestOf([rp]).e1rm).toBeCloseTo(60 * (1 + 8 / 30))
  })

  it('propose un palier 20 % plus léger, arrondi à 2,5 kg', () => {
    expect(nextPart('drop', { weight: 60, reps: 8 })).toEqual({ weight: 47.5, reps: 8 })
    expect(nextPart('restpause', { weight: 60, reps: 8 })).toEqual({})
  })

  it('allège aussi les paliers en semaine allégée', () => {
    expect(deloadEntry({ exerciseId: 'squat', sets: [drop] }).sets[0].parts?.[0].weight).toBe(27.5)
  })

  it('note les exercices tenus en secondes', () => {
    expect(entrySummary({ exerciseId: 'gainage', sets: [{ reps: 30, done: true }, { reps: 30, done: true }] }, gainage)).toBe('2 × 30 s')
  })

  it('reprend les paliers d’une sauvegarde et écarte ceux qui sont invalides', () => {
    const file = (sets: unknown[]) => JSON.stringify({ app: 'NextRep', format: 2, data: { workouts: [{ id: 'w', date: '2026-10-01', entries: [{ exerciseId: 'squat', sets }] }] } })
    const ok = checkBackup(file([drop]))
    expect(ok.rows.workouts[0].entries[0].sets[0].parts).toEqual(drop.parts)
    expect(checkBackup(file([{ ...drop, parts: [{ weight: 'x', reps: 3 }] }])).skipped).toBe(1)
  })
})
