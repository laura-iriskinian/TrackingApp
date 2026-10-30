// Synchronisation entre appareils. L'app reste entièrement utilisable hors ligne : la base locale fait foi,
// et le serveur n'est qu'un relais entre les appareils d'un même compte.
//
// Principe : on retient l'empreinte de chaque ligne telle qu'elle était à la dernière synchronisation.
// Une ligne dont l'empreinte a changé a été modifiée sur ce téléphone et doit être envoyée ; une ligne disparue
// a été supprimée. Le serveur renvoie les lignes modifiées depuis la dernière fois (numéro « seq »).
// Si une ligne a changé des deux côtés, la modification la plus récente l'emporte.
import { db } from './db'
import { ROWS } from './backup'

export const KINDS = ['workouts', 'measures', 'measureKinds', 'foods', 'plans', 'goals', 'exercises', 'notes', 'templates', 'kv'] as const
export type Kind = (typeof KINDS)[number]
// Seuls ces réglages voyagent : la séance en cours et la date de récupération restent sur l'appareil
const KV_KEYS = ['profile', 'intervals']

export interface RemoteRecord {
  kind: string
  id: string
  data: unknown
  updated_at: number
  deleted: boolean
  seq: number
}
export type Outgoing = Omit<RemoteRecord, 'seq'>

export interface Remote {
  pull(after: number): Promise<RemoteRecord[]> // une page de lignes plus récentes que « after », dans l'ordre
  push(rows: Outgoing[]): Promise<void>
}

// Premier envoi sur un appareil qui a déjà des données, vers un compte qui en a aussi
export type Choice = 'merge' | 'account' | 'device'
export type SyncResult =
  | { status: 'done'; pulled: number; pushed: number }
  | { status: 'choose'; remote: number; local: number }

type Row = Record<string, unknown>
interface Local { kind: Kind; id: string; row: Row }
interface State { cursor: number; hashes: Record<string, string> }

const STATE_KEY = 'state'
const isKind = (k: string): k is Kind => (KINDS as readonly string[]).includes(k)
const keyOf = (kind: string, id: string) => kind + ':' + id
const idOf = (kind: Kind, row: Row) => String(kind === 'plans' ? row.weekday : kind === 'notes' ? row.exerciseId : kind === 'kv' ? row.key : row.id)
const dbKey = (kind: Kind, id: string) => (kind === 'plans' ? Number(id) : id)
const table = (kind: Kind) => db.table(kind)

// Écriture stable : le serveur range les champs dans son propre ordre
export function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(k => (v as Row)[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + canon((v as Row)[k])).join(',') + '}'
  }
  return JSON.stringify(v) ?? 'null'
}

// Empreinte courte (cyrb53)
export function hash(v: unknown): string {
  const s = canon(v)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// Une ligne venue du serveur est vérifiée comme une sauvegarde : champs connus et valeurs plausibles seulement
function check(kind: Kind, data: unknown): Row | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return
  const r = (ROWS[kind] as (v: Row) => unknown)(data as Row) as Row | undefined
  if (r && kind === 'kv' && !KV_KEYS.includes(String(r.key))) return
  return r
}

// Les lignes locales sont comparées sous leur forme vérifiée, comme celles du serveur
async function readLocal(): Promise<Map<string, Local>> {
  const out = new Map<string, Local>()
  for (const kind of KINDS) {
    for (const raw of (await table(kind).toArray()) as Row[]) {
      if (kind === 'kv' && !KV_KEYS.includes(String(raw.key))) continue
      const row = check(kind, raw) ?? raw
      const id = idOf(kind, row)
      out.set(keyOf(kind, id), { kind, id, row })
    }
  }
  return out
}

export const hasSynced = async () => !!(await db.sync.get(STATE_KEY))
export const resetSyncState = () => db.sync.clear()

export async function sync(remote: Remote, choice?: Choice): Promise<SyncResult> {
  const state = (await db.sync.get(STATE_KEY))?.value as State | undefined
  const first = !state
  const hashes: Record<string, string> = { ...state?.hashes }
  let cursor = state?.cursor ?? 0

  // Nouveautés du serveur, page par page. On garde la dernière version de chaque ligne.
  const latest = new Map<string, RemoteRecord>()
  for (;;) {
    const page = await remote.pull(cursor)
    if (!page.length) break
    for (const r of page) latest.set(keyOf(r.kind, r.id), r)
    cursor = page[page.length - 1].seq
  }
  const remoteLive = [...latest.values()].filter(r => !r.deleted && isKind(r.kind))

  let local = await readLocal()
  if (first && !choice && remoteLive.length && local.size) {
    const count = (list: { kind: string }[]) => list.filter(x => x.kind === 'workouts').length
    return { status: 'choose', remote: count(remoteLive), local: count([...local.values()]) }
  }

  const tables = KINDS.map(table)
  let pulled = 0
  await db.transaction('rw', tables, async () => {
    if (first && choice === 'account') {
      for (const kind of KINDS) {
        if (kind === 'kv') await db.kv.bulkDelete(KV_KEYS)
        else await table(kind).clear()
      }
      local = new Map()
    }
    if (first && choice === 'device') return // ce téléphone remplace le compte : rien n'est repris du serveur
    for (const [key, r] of latest) {
      if (!isKind(r.kind)) continue
      const data = r.deleted ? undefined : check(r.kind, r.data)
      if (!r.deleted && !data) continue // ligne illisible : ignorée
      const remoteHash = data ? hash(data) : undefined
      const l = local.get(key)
      const localHash = l ? hash(l.row) : undefined
      // Le serveur n'a rien de neuf : c'est la version envoyée la dernière fois (ce téléphone a pu la modifier depuis)
      if (remoteHash === hashes[key]) continue
      if (remoteHash !== localHash) {
        // Modifiée des deux côtés : la plus récente gagne, la version locale sera alors envoyée
        const localChanged = localHash !== hashes[key]
        if (localChanged && l && Number(l.row.updatedAt ?? 0) > r.updated_at) continue
        if (data) {
          await table(r.kind).put(data)
          local.set(key, { kind: r.kind, id: r.id, row: data })
        } else {
          await table(r.kind).delete(dbKey(r.kind, r.id))
          local.delete(key)
        }
        pulled++
      }
      if (remoteHash) hashes[key] = remoteHash
      else delete hashes[key]
    }
  })

  // Ce qui a changé sur ce téléphone depuis la dernière fois
  const now = Date.now()
  const out: Outgoing[] = []
  for (const [key, l] of local) {
    if (hash(l.row) === hashes[key]) continue
    const at = Number(l.row.updatedAt) || now
    out.push({ kind: l.kind, id: l.id, data: l.row, updated_at: first && choice === 'device' ? Math.max(now, at) : at, deleted: false })
  }
  const gone = new Set(Object.keys(hashes).filter(k => !local.has(k)))
  if (first && choice === 'device') for (const r of remoteLive) if (!local.has(keyOf(r.kind, r.id))) gone.add(keyOf(r.kind, r.id))
  for (const key of gone) {
    const i = key.indexOf(':')
    out.push({ kind: key.slice(0, i), id: key.slice(i + 1), data: null, updated_at: now, deleted: true })
  }
  if (out.length) await remote.push(out)
  for (const o of out) {
    const key = keyOf(o.kind, o.id)
    if (o.deleted) delete hashes[key]
    else hashes[key] = hash(o.data)
  }
  await db.sync.put({ key: STATE_KEY, value: { cursor, hashes } satisfies State })
  return { status: 'done', pulled, pushed: out.length }
}
