import { describe, expect, it } from 'vitest'
import { phaseAt, phases, totalSec } from './intervals'

describe('minuteur par intervalles', () => {
  const c = { work: 30, rest: 10, rounds: 3, prep: 5 }
  it('enchaîne préparation, exercice et repos, sans repos après le dernier tour', () => {
    expect(phases(c).map(p => p.kind)).toEqual(['prep', 'work', 'rest', 'work', 'rest', 'work'])
    expect(totalSec(c)).toBe(5 + 3 * 30 + 2 * 10)
    expect(phases({ ...c, prep: 0, rest: 0 }).map(p => p.kind)).toEqual(['work', 'work', 'work'])
  })
  it('trouve la phase en cours', () => {
    const l = phases(c)
    expect(phaseAt(l, 0)).toEqual({ i: 0, left: 5 })
    expect(phaseAt(l, 6)).toEqual({ i: 1, left: 29 })
    expect(phaseAt(l, 36)).toEqual({ i: 2, left: 9 })
    expect(phaseAt(l, 125)).toBeNull()
  })
})
