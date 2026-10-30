import { describe, expect, it } from 'vitest'
import { cycleWeek, deloadEntry } from './cycle'

describe('cycle', () => {
  const c = { start: '2026-10-05', weeks: 4, deload: true }
  it('compte les semaines et recommence', () => {
    expect(cycleWeek(c, '2026-10-04')).toBeNull()
    expect(cycleWeek(c, '2026-10-05')).toEqual({ week: 1, total: 4, deload: false })
    expect(cycleWeek(c, '2026-10-31')).toEqual({ week: 4, total: 4, deload: true })
    expect(cycleWeek(c, '2026-11-02')?.week).toBe(1)
    expect(cycleWeek({ ...c, deload: false }, '2026-10-31')?.deload).toBe(false)
  })
  it('allège une séance : moins de séries, charges plus légères', () => {
    const e = deloadEntry({ exerciseId: 'squat', sets: [
      { weight: 40, reps: 8, type: 'warmup', done: false },
      { weight: 100, reps: 5, done: false }, { weight: 100, reps: 5, done: false }, { weight: 100, reps: 5, done: false },
    ] })
    expect(e.sets.map(s => [s.weight, s.type])).toEqual([[40, 'warmup'], [60, undefined], [60, undefined]])
    const run = { exerciseId: 'course', sets: [{ km: 5, min: 30, done: false }] }
    expect(deloadEntry(run)).toBe(run)
  })
})
