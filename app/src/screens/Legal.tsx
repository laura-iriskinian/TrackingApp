import type { ReactNode } from 'react'
import { APP_NAME, CONTACT_EMAIL, SERVER_REGION } from '../config'
import { accountsEnabled } from '../lib/account'
import licence from '../../licences/body-highlighter.txt?raw'
import './Session.css'

const SECTIONS = [
  { id: 'confidentialite', label: 'Confidentialité' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'mentions', label: 'Mentions légales' },
  { id: 'credits', label: 'Crédits' },
] as const
const UPDATED = '29 octobre 2026'

const Contact = () => (CONTACT_EMAIL ? <p>Contact : <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>.</p> : null)

// Politique de confidentialité, conditions d'utilisation, mentions légales et crédits
export function Legal({ section, onClose }: { section?: string; onClose: () => void }) {
  const cur = SECTIONS.find(s => s.id === section)?.id ?? 'confidentialite'
  const pages: Record<typeof cur, ReactNode> = {
    confidentialite: <Privacy />,
    conditions: <Terms />,
    mentions: <Notice />,
    credits: <Credits />,
  }
  return (
    <div className="screen session legal">
      <header className="ses-bar"><button className="link" onClick={onClose}>‹ Retour</button></header>
      <div className="head">
        <h1>{SECTIONS.find(s => s.id === cur)!.label}</h1>
        <span className="sub">Mis à jour le {UPDATED}</span>
      </div>
      <div className="chips ob-alt" role="tablist" aria-label="Informations légales">
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" aria-selected={s.id === cur} aria-pressed={s.id === cur}
            onClick={() => { history.replaceState(null, '', '#infos/' + s.id); dispatchEvent(new HashChangeEvent('hashchange')) }}>{s.label}</button>
        ))}
      </div>
      <article className="card legal-text">{pages[cur]}</article>
    </div>
  )
}

function Privacy() {
  return (
    <>
      <h2>En bref</h2>
      <p>
        Sans compte, tout ce que tu notes dans {APP_NAME} reste sur ton téléphone : rien n'est envoyé sur internet.
        Avec un compte, tes données sont copiées sur un serveur situé dans l'{SERVER_REGION}, uniquement pour les retrouver sur tes autres appareils.
        Elles ne sont ni vendues, ni partagées, ni utilisées pour de la publicité.
      </p>

      <h2>Responsable du traitement</h2>
      <p>Laura Iriskinian, éditrice de {APP_NAME}, à titre personnel.</p>
      <Contact />

      <h2>Données concernées</h2>
      <ul>
        <li>Ton adresse e-mail, si tu crées un compte.</li>
        <li>Tes séances, séries, charges, ressentis d'effort et notes.</li>
        <li>Tes mesures du corps (poids, mensurations) et tes objectifs.</li>
        <li>Ton planning, tes réglages et ton profil (prénom, silhouette des schémas, objectif, niveau).</li>
      </ul>
      <p>
        Les séances et les mesures du corps peuvent révéler des informations sur ta santé. Ce sont des données sensibles au sens du RGPD
        (article 9) : elles ne sont envoyées au serveur qu'avec ton accord explicite, donné au moment de créer ton compte.
      </p>

      <h2>Pourquoi et sur quelle base</h2>
      <ul>
        <li>Synchroniser tes données entre tes appareils et les sauvegarder : sur la base de ton consentement explicite.</li>
        <li>Gérer ton compte (connexion par code envoyé par e-mail) : nécessaire pour te fournir le service.</li>
      </ul>

      <h2>Où et combien de temps</h2>
      <p>
        Les données du compte sont hébergées par Supabase, notre sous-traitant, sur des serveurs situés dans l'{SERVER_REGION}.
        Elles sont conservées tant que ton compte existe, et effacées dès que tu le supprimes.
        Les connexions sont chiffrées (HTTPS) et chaque compte ne peut accéder qu'à ses propres données.
      </p>

      <h2>Tes droits</h2>
      <ul>
        <li>Accès et portabilité : Profil, « Exporter une sauvegarde » te donne toutes tes données dans un fichier.</li>
        <li>Rectification : tout se modifie directement dans l'app.</li>
        <li>Effacement et retrait du consentement : Profil, « Supprimer mon compte » efface tout ce qui est sur le serveur. « Supprimer toutes mes données » efface ce téléphone.</li>
        <li>Tu peux aussi adresser une réclamation à la CNIL (cnil.fr).</li>
      </ul>

      <h2>Âge minimum</h2>
      <p>Il faut avoir 15 ans ou plus pour créer un compte.</p>

      <h2>Cookies et traceurs</h2>
      <p>
        {APP_NAME} n'utilise ni cookie publicitaire ni outil de mesure d'audience. Le stockage du navigateur sert seulement à faire fonctionner l'app
        {accountsEnabled ? ' et à garder ta connexion' : ''}. L'hébergeur des pages (GitHub Pages) peut enregistrer des données techniques de connexion, comme l'adresse IP, pour la sécurité de son service.
      </p>
    </>
  )
}

function Terms() {
  return (
    <>
      <h2>Le service</h2>
      <p>
        {APP_NAME} t'aide à noter et suivre tes entraînements. L'app est gratuite et en cours de développement : des fonctions peuvent changer ou être retirées.
      </p>
      <h2>Ce n'est pas un avis médical</h2>
      <p>
        Les programmes, fiches d'exercices et suggestions de charge sont donnés à titre indicatif. Ils ne remplacent pas l'avis d'un médecin
        ou d'un professionnel du sport. Demande conseil à ton médecin avant de commencer, surtout en cas de douleur, de blessure ou de problème de santé.
        Arrête un exercice s'il fait mal.
      </p>
      <h2>Ton compte</h2>
      <p>
        Ton compte est personnel. Tu es responsable de l'adresse e-mail utilisée pour te connecter. Tu peux le supprimer à tout moment depuis le Profil.
      </p>
      <h2>Tes données</h2>
      <p>
        Tes données t'appartiennent. Pense à exporter une sauvegarde de temps en temps : malgré le soin apporté, une perte de données reste possible,
        notamment si le navigateur efface le stockage du téléphone.
      </p>
      <h2>Responsabilité</h2>
      <p>
        L'éditrice fait son possible pour que l'app fonctionne correctement, sans pouvoir le garantir. Elle ne peut pas être tenue responsable
        d'une blessure liée à la pratique sportive, ni d'une interruption du service.
      </p>
      <h2>Évolution</h2>
      <p>Ces conditions peuvent évoluer. La date de mise à jour figure en haut de la page.</p>
    </>
  )
}

function Notice() {
  return (
    <>
      <h2>Éditrice</h2>
      <p>Laura Iriskinian, à titre personnel. Directrice de la publication : Laura Iriskinian.</p>
      <Contact />
      <h2>Hébergement de l'app</h2>
      <p>GitHub Pages, service de GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
      {accountsEnabled && (
        <>
          <h2>Hébergement des comptes</h2>
          <p>Supabase, serveurs situés dans l'{SERVER_REGION}.</p>
        </>
      )}
    </>
  )
}

function Credits() {
  return (
    <>
      <h2>Schémas anatomiques</h2>
      <p>
        Les silhouettes et les muscles sont tirés du projet open source react-native-body-highlighter, de ELABBASSI Hicham, sous licence MIT :
      </p>
      <pre className="licence">{licence.trim().replace(/(?<!\n)\n(?!\n)/g, ' ')}</pre>
      <h2>Polices</h2>
      <p>Schibsted Grotesk, Instrument Sans et IBM Plex Mono, sous licence SIL Open Font License 1.1.</p>
    </>
  )
}
