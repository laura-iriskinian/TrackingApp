import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { APP_NAME } from '../config'
import { getProfile, saveProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { GOALS, LEVELS, PLACES, rankPrograms } from '../data/programs'
import { MuscleMap } from '../components/MuscleMap'
import { ProgramView } from '../components/ProgramView'
import { useToast } from '../components/ui'
import './Session.css'

const STEPS = 5

// Premier lancement : prénom, silhouette, objectif, niveau, puis un programme proposé.
// Tout est facultatif et modifiable ensuite dans le Profil.
export function Onboarding() {
  const profile = useLiveQuery(getProfile)
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState(0)
  const [days, setDays] = useState(3)
  const [busy, setBusy] = useState(false)
  const legacy = useMemo(legacySummary, [])
  const toast = useToast()
  if (!profile) return null

  const done = () => saveProfile({ onboarded: true })
  const next = () => { setStep(step + 1); scrollTo(0, 0) }
  const choose = (patch: Parameters<typeof saveProfile>[0]) => { saveProfile(patch); next() }
  const recover = async () => {
    setBusy(true)
    try {
      const r = await importLegacy()
      await done()
      toast(`${r.workouts} séances récupérées`)
    } catch (e) {
      toast((e as Error).message)
      setBusy(false)
    }
  }
  const ranked = rankPrograms({ goal: profile.goal, level: profile.level, place: profile.place, days }).slice(0, 3)
  const program = ranked[pick] ?? ranked[0]

  return (
    <div className="screen session onboarding">
      <header className="ses-bar">
        {step > 0 ? <button className="link" onClick={() => { setStep(step - 1); setPick(0) }}>‹ Retour</button> : <span />}
        <div className="ob-dots" aria-label={`Étape ${step + 1} sur ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <button className="link ob-skip" onClick={done}>Passer</button>
      </header>

      {step === 0 && (
        <>
          <div className="head">
            <span className="eyebrow">Bienvenue dans {APP_NAME}</span>
            <h1>Comment tu t’appelles ?</h1>
            <span className="sub">Quelques questions pour te proposer des séances adaptées. Tout reste sur ton téléphone.</span>
          </div>
          <section className="card">
            <div className="field">
              <label htmlFor="ob-name">Prénom</label>
              <input id="ob-name" className="input" autoComplete="given-name" placeholder="Ton prénom" maxLength={40}
                defaultValue={profile.name ?? ''} onChange={e => saveProfile({ name: e.target.value.trim() || undefined })}
                onKeyDown={e => { if (e.key === 'Enter') next() }} />
            </div>
            <button className="btn" onClick={next}>Continuer</button>
          </section>
          {legacy && (
            <section className="card">
              <h2>Tu utilisais Suivi sport ?</h2>
              <p className="sub">{legacy.sessions} jours d’entraînement sont enregistrés sur ce téléphone. Récupère-les pour commencer avec ton historique.</p>
              <button className="btn soft" disabled={busy} onClick={recover}>{busy ? 'Récupération…' : 'Récupérer mes données'}</button>
            </section>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <div className="head">
            <h1>Quelle silhouette pour les schémas ?</h1>
            <span className="sub">Elle sert à montrer les muscles travaillés.</span>
          </div>
          <div className="ob-sex">
            {([['f', 'Femme'], ['h', 'Homme']] as const).map(([v, l]) => (
              <button key={v} className="card ob-choice" aria-pressed={profile.sex === v} onClick={() => choose({ sex: v })}>
                <MuscleMap view="front" sex={v} primary={['abs', 'quads']} secondary={['pecs']} className="ob-fig" />
                <b>{l}</b>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="head"><h1>Quel est ton objectif ?</h1></div>
          {GOALS.map(g => (
            <button key={g.id} className="card ob-choice" aria-pressed={profile.goal === g.id} onClick={() => choose({ goal: g.id })}>
              <b>{g.label}</b><span className="sub">{g.text}</span>
            </button>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <div className="head"><h1>Où en es-tu ?</h1></div>
          <section className="card">
            <div className="field">
              <span className="sub" id="ob-lv">Niveau</span>
              <div className="ob-levels" role="group" aria-labelledby="ob-lv">
                {LEVELS.map(l => (
                  <button key={l.id} className="ob-level" aria-pressed={profile.level === l.id} onClick={() => saveProfile({ level: l.id })}>
                    <b>{l.label}</b><span>{l.text}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="sub" id="ob-pl">Où t’entraînes-tu ?</span>
              <div className="seg" role="group" aria-labelledby="ob-pl">
                {PLACES.map(x => <button key={x.id} aria-pressed={(profile.place ?? 'gym') === x.id} onClick={() => saveProfile({ place: x.id })}>{x.label}</button>)}
              </div>
            </div>
            <div className="field">
              <span className="sub" id="ob-d">Séances par semaine</span>
              <div className="seg" role="group" aria-labelledby="ob-d">
                {[2, 3, 4].map(n => <button key={n} aria-pressed={days === n} onClick={() => setDays(n)}>{n}</button>)}
              </div>
            </div>
            <button className="btn" onClick={() => { saveProfile({ place: profile.place ?? 'gym', level: profile.level ?? 'beginner', weeklyTarget: days }); next() }}>
              Voir mon programme
            </button>
          </section>
        </>
      )}

      {step === 4 && program && (
        <>
          <div className="head">
            <span className="eyebrow">Proposé pour toi</span>
            <h1>{profile.name ? `${profile.name}, voici ton programme` : 'Voici ton programme'}</h1>
          </div>
          {ranked.length > 1 && (
            <div className="chips ob-alt" role="group" aria-label="Autres programmes">
              {ranked.map((p, i) => <button key={p.id} aria-pressed={i === pick} onClick={() => setPick(i)}>{p.name}</button>)}
            </div>
          )}
          <ProgramView key={program.id} program={program} onApplied={done} />
          <button className="link danger-link" onClick={done}>Commencer sans programme</button>
        </>
      )}
    </div>
  )
}
