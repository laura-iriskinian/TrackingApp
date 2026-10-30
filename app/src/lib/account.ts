// Compte et synchronisation. Le client Supabase n'est chargé que si un serveur est configuré :
// sans serveur, l'app reste exactement celle d'avant, sans compte.
import { useSyncExternalStore } from 'react'
import Dexie from 'dexie'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CONSENT_VERSION, SUPABASE_KEY, SUPABASE_URL } from '../config'
import { resetSyncState, sync, type Choice, type Remote, type RemoteRecord } from '../data/sync'

export const accountsEnabled = !!(SUPABASE_URL && SUPABASE_KEY)

export interface AccountState {
  ready: boolean
  email?: string
  userId?: string
  status: 'idle' | 'syncing' | 'offline' | 'error' | 'choose'
  lastSync?: number
  choose?: { remote: number; local: number } // premier envoi : données des deux côtés
  error?: string
}

let state: AccountState = { ready: !accountsEnabled, status: 'idle' }
const listeners = new Set<() => void>()
const set = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}
export const useAccount = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)

let clientP: Promise<SupabaseClient> | undefined
function client() {
  clientP ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
    // Clé préfixée « nextrep » : « Supprimer toutes mes données » efface aussi la connexion
    auth: { storageKey: 'nextrep-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }))
  return clientP
}

const PAGE = 1000
function remote(c: SupabaseClient, userId: string): Remote {
  return {
    async pull(after) {
      const { data, error } = await c.from('records').select('kind,id,data,updated_at,deleted,seq').gt('seq', after).order('seq').limit(PAGE)
      if (error) throw error
      return (data ?? []) as RemoteRecord[]
    },
    async push(rows) {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map(r => ({ ...r, user_id: userId }))
        const { error } = await c.from('records').upsert(chunk, { onConflict: 'user_id,kind,id' })
        if (error) throw error
      }
    },
  }
}

let running: Promise<void> | undefined
let again = false

// Lance une synchronisation. Si une autre est en cours, une seule autre suivra.
export function syncNow(choice?: Choice): Promise<void> {
  if (!accountsEnabled || !state.userId) return Promise.resolve()
  if (running) { again = true; return running }
  running = (async () => {
    set({ status: 'syncing', error: undefined })
    try {
      const r = await sync(remote(await client(), state.userId!), choice)
      if (r.status === 'choose') set({ status: 'choose', choose: { remote: r.remote, local: r.local } })
      else set({ status: 'idle', choose: undefined, lastSync: Date.now() })
    } catch (e) {
      set(navigator.onLine === false ? { status: 'offline' } : { status: 'error', error: (e as Error).message })
    } finally {
      running = undefined
    }
    if (again && state.status === 'idle') { again = false; await syncNow() }
    again = false
  })()
  return running
}

let timer: number | undefined
const later = () => {
  clearTimeout(timer)
  timer = window.setTimeout(() => { if (state.status !== 'choose' && state.status !== 'syncing') syncNow() }, 4000)
}

// Au démarrage : reprend la connexion enregistrée, puis synchronise à chaque modification, au retour du réseau
// et quand l'app revient au premier plan
export async function initAccount() {
  if (!accountsEnabled) return
  const c = await client()
  const { data } = await c.auth.getSession()
  set({ ready: true, email: data.session?.user.email, userId: data.session?.user.id })
  c.auth.onAuthStateChange((_e, session) => {
    const changed = session?.user.id !== state.userId
    set({ email: session?.user.email, userId: session?.user.id })
    if (changed && session) syncNow()
  })
  Dexie.on('storagemutated', later)
  addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  if (state.userId) syncNow()
}

// Connexion sans mot de passe : un code à 6 chiffres est envoyé par e-mail
export async function sendCode(email: string) {
  const { error } = await (await client()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw new Error(error.status === 429 ? 'Trop de demandes. Patiente une minute avant de redemander un code.' : 'Le code n’a pas pu être envoyé. Vérifie l’adresse et ta connexion.')
}

export async function verifyCode(email: string, token: string) {
  const c = await client()
  const { data, error } = await c.auth.verifyOtp({ email, token, type: 'email' })
  if (error || !data.user) throw new Error('Code incorrect ou expiré.')
  // Consentement explicite donné juste avant l'envoi du code, enregistré avec la version du texte
  const { error: e2 } = await c.from('consents').upsert({ user_id: data.user.id, kind: 'health', version: CONSENT_VERSION }, { onConflict: 'user_id,kind,version', ignoreDuplicates: true })
  if (e2) throw new Error('Ton accord n’a pas pu être enregistré. Réessaie.')
  await resetSyncState()
  set({ email: data.user.email, userId: data.user.id })
}

// Déconnexion : les données restent sur ce téléphone, mais ne sont plus synchronisées
export async function signOut() {
  if (!accountsEnabled) return
  await (await client()).auth.signOut({ scope: 'local' })
  await resetSyncState()
  set({ email: undefined, userId: undefined, status: 'idle', choose: undefined, lastSync: undefined })
}

// Supprime le compte et toutes les données du serveur. Celles du téléphone restent.
export async function deleteAccount() {
  const { error } = await (await client()).rpc('delete_account')
  if (error) throw new Error('La suppression n’a pas abouti. Vérifie ta connexion et réessaie.')
  await signOut()
}
