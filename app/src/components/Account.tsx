import { useEffect, useState } from 'react'
import { APP_NAME, SERVER_REGION } from '../config'
import { accountsEnabled, deleteAccount, sendCode, signOut, syncNow, useAccount, verifyCode } from '../lib/account'
import { openLegal } from '../lib/nav'
import { nb } from '../lib/dates'
import { ConfirmSheet, useToast } from './ui'

const time = (ms: number) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(ms)

// Carte « Compte » du Profil. Absente tant qu'aucun serveur n'est configuré.
export function AccountCard() {
  const a = useAccount()
  const toast = useToast()
  const [sheet, setSheet] = useState<'signin' | 'signout' | 'delete' | null>(null)
  if (!accountsEnabled || !a.ready) return null

  return (
    <section className="card">
      <h2>Compte</h2>
      {a.userId ? (
        <>
          <p className="sub">
            Compte <b className="acc-mail">{a.email}</b>. Tes données sont synchronisées entre tes appareils.
          </p>
          <span className="data" role="status">
            {a.status === 'syncing' ? 'Synchronisation…'
              : a.status === 'offline' ? 'Hors ligne : la synchronisation reprendra au retour du réseau.'
              : a.status === 'error' ? 'La dernière synchronisation a échoué. Elle sera retentée.'
              : a.status === 'choose' ? 'En attente de ton choix.'
              : a.lastSync ? `Synchronisé à ${time(a.lastSync)}.` : ''}
          </span>
          <button className="btn soft" disabled={a.status === 'syncing'} onClick={() => syncNow()}>Synchroniser maintenant</button>
          <div className="row cur-tools">
            <button className="link" onClick={() => setSheet('signout')}>Se déconnecter</button>
            <button className="link" onClick={() => setSheet('delete')}>Supprimer mon compte</button>
          </div>
        </>
      ) : (
        <>
          <p className="sub">Crée un compte pour retrouver tes séances sur tous tes appareils. Sans compte, tout reste sur ce téléphone.</p>
          <button className="btn" onClick={() => setSheet('signin')}>Se connecter ou créer un compte</button>
        </>
      )}

      {sheet === 'signin' && <SignInSheet onClose={() => setSheet(null)} onDone={() => { setSheet(null); toast('Connexion réussie') }} />}
      {a.status === 'choose' && a.choose && <ChooseSheet {...a.choose} />}
      {sheet === 'signout' && (
        <ConfirmSheet title="Se déconnecter ?" text="Tes données restent sur ce téléphone, mais ne seront plus synchronisées. Celles du compte restent sur le serveur."
          confirmLabel="Se déconnecter" onClose={() => setSheet(null)}
          onConfirm={async () => { await signOut(); setSheet(null); toast('Compte déconnecté de ce téléphone') }} />
      )}
      {sheet === 'delete' && (
        <ConfirmSheet danger title="Supprimer ton compte ?"
          text={`Ton compte et toutes les données enregistrées sur le serveur de ${APP_NAME} seront effacés. C'est définitif. Les données de ce téléphone ne sont pas touchées.`}
          confirmLabel="Supprimer mon compte" onClose={() => setSheet(null)}
          onConfirm={async () => {
            try { await deleteAccount(); toast('Ton compte a été supprimé') } catch (e) { toast((e as Error).message) }
            setSheet(null)
          }} />
      )}
    </section>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
}

// E-mail et accord explicite, puis code reçu par e-mail
function SignInSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  useEscape(onClose)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [adult, setAdult] = useState(false)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="si-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="si-t">{sent ? 'Entre le code' : 'Ton compte'}</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list">
          {!sent ? (
            <>
              <p>Pas de mot de passe : on t'envoie un code à 6 chiffres par e-mail. Si tu n'as pas encore de compte, il est créé.</p>
              <div className="field">
                <label htmlFor="si-mail">Adresse e-mail</label>
                <input id="si-mail" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                <span>
                  J'accepte que {APP_NAME} enregistre mes séances, mes mesures du corps et mon profil sur son serveur, situé dans l'{SERVER_REGION},
                  pour les synchroniser entre mes appareils. Ces données peuvent révéler des informations sur ma santé.
                  Je peux retirer mon accord à tout moment en supprimant mon compte.
                </span>
              </label>
              <label className="check">
                <input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />
                <span>J'ai 15 ans ou plus.</span>
              </label>
              <button className="link inline-link acc-legal" onClick={() => openLegal('confidentialite')}>Lire la politique de confidentialité</button>
            </>
          ) : (
            <>
              <p>Un code a été envoyé à <b>{email.trim()}</b>. Il est valable une heure. Pense à regarder dans les indésirables.</p>
              <div className="field">
                <label htmlFor="si-code">Code reçu</label>
                <input id="si-code" className="input acc-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button className="link inline-link acc-legal" disabled={busy} onClick={() => run(async () => { await sendCode(email.trim()); setCode('') })}>Renvoyer un code</button>
            </>
          )}
          {error && <p className="acc-error" role="alert">{error}</p>}
        </div>
        {!sent
          ? <button className="btn" disabled={!valid || !consent || !adult || busy} onClick={() => run(async () => { await sendCode(email.trim()); setSent(true) })}>{busy ? 'Envoi…' : 'Recevoir un code'}</button>
          : <button className="btn" disabled={code.length !== 6 || busy} onClick={() => run(async () => { await verifyCode(email.trim(), code); onDone() })}>{busy ? 'Vérification…' : 'Valider'}</button>}
      </div>
    </div>
  )
}

// Premier envoi depuis un téléphone qui a déjà des données, vers un compte qui en a aussi
function ChooseSheet({ remote, local }: { remote: number; local: number }) {
  const [busy, setBusy] = useState(false)
  const pick = async (c: 'merge' | 'account' | 'device') => { setBusy(true); await syncNow(c); setBusy(false) }
  return (
    <div className="veil">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ch-t">
        <h2 id="ch-t">Ton compte a déjà des données</h2>
        <p>Le compte contient {nb(remote, 'séance')}, ce téléphone {nb(local, 'séance')}. Que veux-tu garder ?</p>
        <button className="btn" disabled={busy} onClick={() => pick('merge')}>Tout garder (fusionner)</button>
        <button className="btn soft" disabled={busy} onClick={() => pick('account')}>Garder le compte, remplacer ce téléphone</button>
        <button className="btn soft" disabled={busy} onClick={() => pick('device')}>Garder ce téléphone, remplacer le compte</button>
        <p className="data">Si les deux contiennent les mêmes séances (par exemple récupérées deux fois depuis Suivi sport), choisis l'un ou l'autre plutôt que de fusionner, pour éviter les doublons.</p>
      </div>
    </div>
  )
}
