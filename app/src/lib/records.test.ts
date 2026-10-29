import { describe, expect, it } from 'vitest'
import { bestOf, e1rm, recordBeaten, seriesOf } from './records'
import { currentValue, isReached, progress } from './goals'
import type { Goal, Workout } from '../data/types'

const w = (date: string, sets: Workout['entries'][0]['sets'], exerciseId = 'squat'): Workout =>
  ({ id: date, date, entries: [{ exerciseId, sets }], exerciseIds: [exerciseId], updatedAt: 0 })
const S = (weight: number, reps: number, type?: 'warmup') => ({ weight, reps, done: true, ...(type ? { type } : {}) })

describe('records et progression', () => {
  it('estime la charge sur une répétition', () => {
    expect(e1rm(S(100, 1))).toBe(100)
    expect(e1rm(S(60, 10))).toBe(80)
  })

  it('ignore l’échauffement dans les records', () => {
    expect(bestOf([S(100, 1, 'warmup'), S(60, 8)]).weight).toBe(60)
  })

  it('détecte un record de charge ou de 1RM estimé', () => {
    const before = [S(60, 8), S(65, 5)]
    expect(recordBeaten(before, S(67.5, 3))).toBe('weight')
    expect(recordBeaten(before, S(60, 12))).toBe('e1rm')
    expect(recordBeaten(before, S(60, 8))).toBeNull()
    expect(recordBeaten([], S(60, 8))).toBeNull() // première fois : pas de célébration
    expect(recordBeaten(before, S(80, 5, 'warmup'))).toBeNull()
  })

  it('donne une valeur par séance', () => {
    const list = [w('2026-10-05', [S(65, 5)]), w('2026-10-01', [S(20, 10, 'warmup'), S(60, 8), S(60, 8)])]
    expect(seriesOf(list, 'squat', 'weight')).toEqual([{ x: '2026-10-01', y: 60 }, { x: '2026-10-05', y: 65 }])
    expect(seriesOf(list, 'squat', 'volume')[0].y).toBe(960)
  })

  it('suit un objectif', () => {
    const g: Goal = { id: 'g', metric: 'max-weight:squat', target: 80, by: '2026-12-01', start: 60, direction: 'up', updatedAt: 0 }
    const cur = currentValue(g.metric, [w('2026-10-01', [S(70, 5)])], [])
    expect(cur).toBe(70)
    expect(progress(g, cur)).toBe(.5)
    expect(isReached(g, 80)).toBe(true)
    const m: Goal = { ...g, metric: 'measure:weight', target: 60, start: 64, direction: 'down' }
    const measures = [{ id: 'a', date: '2026-10-01', values: { weight: 64 }, updatedAt: 0 }, { id: 'b', date: '2026-10-20', values: { weight: 62 }, updatedAt: 0 }]
    expect(currentValue(m.metric, [], measures)).toBe(62)
    expect(progress(m, 62)).toBe(.5)
  })
})
