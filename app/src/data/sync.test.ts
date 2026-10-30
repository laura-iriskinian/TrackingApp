// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, eraseAll } from './db'
import { canon, hash, sync, type Outgoing, type Remote, type RemoteRecord } from './sync'
import type { Workout } from './types'

// Serveur en mémoire qui se comporte comme la table « records » : il garde la version la plus récente
class FakeServer implements Remote {
  rows = new Map<string, RemoteRecord>()
  seq = 0
  pageSize = 2
  async pull(after: number) {
    return [...this.rows.values()].filter(r => r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, this.pageSize)
  }
  async push(rows: Outgoing[]) {
    for (const r of rows) this.put(r)
  }
  put(r: Outgoing) {
    const k = r.kind + ':' + r.id, old = this.rows.get(k)
    if (old && r.updated_at < old.updated_at) return
    this.rows.set(k, { ...JSON.parse(JSON.stringify(r)), seq: ++this.seq })
  }
  get(kind: string, id: string) { return this.rows.get(kind + ':' + id) }
}

const w = (id: string, date: string, updatedAt: number, reps = 8): Workout => ({
  id, date, updatedAt, exerciseIds: ['squat'], entries: [{ exerciseId: 'squat', sets: [{ weight: 60, reps, done: true }] }],
})

let server: FakeServer
beforeEach(async () => {
  await eraseAll()
  server = new FakeServer()
})

describe('synchronisation', () => {
  it('écrit les champs dans un ordre stable', () => {
    expect(canon({ b: 1, a: [{ d: 2, c: undefined }] })).toBe('{"a":[{"d":2}],"b":1}')
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 }))
  })

  it('envoie les données du téléphone, puis seulement ce qui change', async () => {
    await db.workouts.add(w('w1', '2026-10-01', 10))
    await db.kv.put({ key: 'profile', value: { name: 'Laura' } })
    await db.kv.put({ key: 'session', value: { id: 's' } })
    expect(await sync(server)).toEqual({ status: 'done', pulled: 0, pushed: 2 })
    expect(server.get('workouts', 'w1')?.data).toMatchObject({ date: '2026-10-01' })
    expect(server.get('kv', 'session')).toBeUndefined() // la séance en cours reste sur l'appareil
    expect(await sync(server)).toEqual({ status: 'done', pulled: 0, pushed: 0 })

    await db.workouts.update('w1', { updatedAt: 20, entries: w('w1', '2026-10-01', 20, 10).entries })
    expect((await sync(server)).status).toBe('done')
    expect(server.get('workouts', 'w1')?.updated_at).toBe(20)
  })

  it('récupère les changements faits sur un autre appareil, page par page', async () => {
    await sync(server)
    for (const i of [1, 2, 3]) server.put({ kind: 'workouts', id: 'w' + i, data: w('w' + i, `2026-10-0${i}`, 5), updated_at: 5, deleted: false })
    server.put({ kind: 'plans', id: '2', data: { weekday: 2, title: 'Jambes', items: [], updatedAt: 5 }, updated_at: 5, deleted: false })
    const r = await sync(server)
    expect(r).toEqual({ status: 'done', pulled: 4, pushed: 0 })
    expect(await db.workouts.count()).toBe(3)
    expect((await db.plans.get(2))?.title).toBe('Jambes')

    server.put({ kind: 'workouts', id: 'w2', data: null, updated_at: 9, deleted: true })
    await sync(server)
    expect(await db.workouts.get('w2')).toBeUndefined()
  })

  it('transmet les suppressions faites sur le téléphone', async () => {
    await db.workouts.add(w('w1', '2026-10-01', 10))
    await sync(server)
    await db.workouts.delete('w1')
    expect((await sync(server)).status).toBe('done')
    expect(server.get('workouts', 'w1')?.deleted).toBe(true)
  })

  it('garde la modification la plus récente quand les deux côtés ont changé', async () => {
    await db.workouts.add(w('w1', '2026-10-01', 10))
    await db.workouts.add(w('w2', '2026-10-02', 10))
    await sync(server)
    // w1 : l'autre appareil est plus récent ; w2 : ce téléphone est plus récent
    await db.workouts.update('w1', { updatedAt: 20, entries: w('w1', '', 20, 5).entries })
    server.put({ kind: 'workouts', id: 'w1', data: w('w1', '2026-10-01', 30, 12), updated_at: 30, deleted: false })
    await db.workouts.update('w2', { updatedAt: 40, entries: w('w2', '', 40, 6).entries })
    server.put({ kind: 'workouts', id: 'w2', data: w('w2', '2026-10-02', 35, 15), updated_at: 35, deleted: false })
    await sync(server)
    expect((await db.workouts.get('w1'))?.entries[0].sets[0].reps).toBe(12)
    expect((await db.workouts.get('w2'))?.entries[0].sets[0].reps).toBe(6)
    expect((server.get('workouts', 'w2')!.data as Workout).entries[0].sets[0].reps).toBe(6)
  })

  it('ignore une ligne illisible venue du serveur', async () => {
    server.put({ kind: 'workouts', id: 'bad', data: { id: 'bad', date: 'demain', entries: [] }, updated_at: 1, deleted: false })
    server.put({ kind: 'kv', id: 'session', data: { key: 'session', value: {} }, updated_at: 1, deleted: false })
    server.put({ kind: 'inconnu', id: 'x', data: {}, updated_at: 1, deleted: false })
    await sync(server)
    expect(await db.workouts.count()).toBe(0)
    expect(await db.kv.get('session')).toBeUndefined()
  })

  describe('premier envoi avec des données des deux côtés', () => {
    beforeEach(async () => {
      server.put({ kind: 'workouts', id: 'compte', data: w('compte', '2026-09-01', 5), updated_at: 5, deleted: false })
      await db.workouts.add(w('tel', '2026-10-01', 10))
    })

    it('demande quoi faire', async () => {
      expect(await sync(server)).toEqual({ status: 'choose', remote: 1, local: 1 })
      expect(await db.workouts.count()).toBe(1)
    })
    it('fusionne', async () => {
      await sync(server, 'merge')
      expect((await db.workouts.toArray()).map(x => x.id).sort()).toEqual(['compte', 'tel'])
      expect(server.get('workouts', 'tel')).toBeTruthy()
    })
    it('garde le compte', async () => {
      await sync(server, 'account')
      expect((await db.workouts.toArray()).map(x => x.id)).toEqual(['compte'])
      expect(server.get('workouts', 'tel')).toBeUndefined()
    })
    it('garde le téléphone', async () => {
      await sync(server, 'device')
      expect((await db.workouts.toArray()).map(x => x.id)).toEqual(['tel'])
      expect(server.get('workouts', 'compte')?.deleted).toBe(true)
      expect(server.get('workouts', 'tel')?.deleted).toBe(false)
    })
  })
})
