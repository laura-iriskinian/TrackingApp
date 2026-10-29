import { describe, expect, it } from 'vitest'
import { alternatives, suggestNext, warmupSets } from './coach'
import { platesFor } from './plates'
import { recovery } from './recovery'
import { streak } from './streak'
import { remindersIcs } from './ics'
import { CATALOG } from '../data/exercises'

const S = (weight: number | undefined, reps: number, more = {}) => ({ weight, reps, done: true, ...more })
const ex = (id: string) => CATALOG.find(e => e.id === id)!

describe('progression suggérée', () => {
  it('propose 2,5 kg de plus quand tout est réussi', () => {
    expect(suggestNext([S(20, 12, { type: 'warmup' }), S(60, 8), S(60, 8), S(60, 9)])).toEqual({ weight: 62.5, reps: 8 })
    expect(suggestNext([S(8, 12), S(8, 12)])).toEqual({ weight: 9, reps: 12 })
    expect(suggestNext([S(undefined, 10), S(undefined, 10)])).toEqual({ reps: 11 })
  })
  it('ne propose rien si une série a manqué ou était à la limite', () => {
    expect(suggestNext([S(60, 8), S(60, 6)])).toBeNull()
    expect(suggestNext([S(60, 8), S(60, 8, { feel: 'max' })])).toBeNull()
    expect(suggestNext([S(60, 8, { rpe: 10 })])).toBeNull()
    expect(suggestNext([S(60, 8, { type: 'failure' })])).toBeNull()
    expect(suggestNext([])).toBeNull()
  })
})

describe('échauffement, remplacement, disques', () => {
  it('propose 50, 70 et 85 % arrondis', () => {
    expect(warmupSets(100).map(s => [s.weight, s.reps, s.type])).toEqual([[50, 8, 'warmup'], [70, 5, 'warmup'], [85, 3, 'warmup']])
    expect(warmupSets(40).map(s => s.weight)).toEqual([20, 27.5, 35])
    expect(warmupSets(25)).toEqual([])
  })
  it('trouve des exercices pour les mêmes muscles', () => {
    const alt = alternatives(ex('developpe-couche'), CATALOG)
    expect(alt[0].primary).toContain('pecs')
    expect(alt.every(e => e.primary.includes('pecs') || e.primary.includes('triceps') || e.primary.includes('delts'))).toBe(true)
    expect(alternatives(ex('course'), CATALOG).map(e => e.id)).toEqual(['marche'])
  })
  it('calcule les disques de chaque côté', () => {
    expect(platesFor(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({ side: [25, 15], rest: 0 })
    expect(platesFor(62.5, 20, [25, 20, 10, 5, 2.5, 1.25])).toEqual({ side: [20, 1.25], rest: 0 })
    expect(platesFor(61, 20, [20, 10, 5])).toEqual({ side: [20], rest: 1 })
    expect(platesFor(15, 20, [20])).toBeNull()
  })
})

describe('récupération et régularité', () => {
  const w = (date: string, exerciseId: string, n = 3) => ({ id: date + exerciseId, date, exerciseIds: [exerciseId], updatedAt: 0, entries: [{ exerciseId, sets: Array.from({ length: n }, () => S(60, 8)) }] })
  it('colore les muscles travaillés récemment, puis les estompe', () => {
    const r = recovery([w('2026-10-29', 'squat'), w('2026-10-27', 'curl-barre'), w('2026-10-20', 'developpe-couche')], CATALOG, '2026-10-29')
    expect(r.quads).toBe(3)
    expect(r.hams).toBe(2) // secondaire
    expect(r.biceps).toBe(2) // il y a 2 jours
    expect(r.forearms).toBe(1) // secondaire, il y a 2 jours
    expect(r.pecs).toBeUndefined() // récupéré
  })
  it('compte les semaines d’affilée, sans casser pour la semaine en cours ni une pause', () => {
    // semaines commençant le lundi : 5, 12, 19 et 26 octobre
    const dates = ['2026-10-05', '2026-10-07', '2026-10-19', '2026-10-21', '2026-10-26']
    expect(streak(dates, 2, [], '2026-10-29')).toEqual({ weeks: 1, thisWeek: 1, paused: false })
    expect(streak(dates, 2, ['2026-10-12'], '2026-10-29').weeks).toBe(2)
    expect(streak([...dates, '2026-10-28'], 2, ['2026-10-12'], '2026-10-29').weeks).toBe(3)
    expect(streak([], 2, [], '2026-10-29').weeks).toBe(0)
  })
  it('crée un rappel par jour prévu', () => {
    const ics = remindersIcs([{ weekday: 0, title: 'Jambes, fessiers', items: [{ exerciseId: 'squat' }], updatedAt: 0 }, { weekday: 3, title: '', items: [], updatedAt: 0 }], '18:30', '2026-10-29')
    expect(ics).toContain('DTSTART:20261102T183000')
    expect(ics).toContain('SUMMARY:Séance : Jambes\\, fessiers')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(remindersIcs([{ weekday: 0, title: 'A\\B; C', items: [{ exerciseId: 'squat' }], updatedAt: 0 }], '07:00', '2026-10-29')).toContain('SUMMARY:Séance : A\\\\B\\; C')
  })
})
