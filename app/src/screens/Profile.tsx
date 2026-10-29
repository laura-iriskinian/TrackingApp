import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { APP_NAME, THEME_KEY } from '../config'
import { db, eraseAll, exportAll, getProfile, saveProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { today } from '../lib/dates'
import { applyTheme, type Theme } from '../lib/theme'
import { ConfirmSheet, useToast } from '../components/ui'
import { Mark } from '../components/Logo'

type Sheet = 'legacy' | 'erase' | null

export function Profile() {
  const profile = useLiveQuery(getProfile)
  const counts = useLiveQuery(async () => ({ workouts: await db.workouts.count(), measures: await db.measures.count() }))
  const imported = useLiveQuery(() => db.kv.get('legacyImportedAt'))
  const legacy = useMemo(legacySummary, [])
  const toast = useToast()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || 'auto')

  const pickTheme = (t: Theme) => { setTheme(t); applyTheme(t) }

  const exportData = async () => {
    const json = JSON.stringify(await exportAll(), null, 1)
    const file = new File([json], `nextrep-${today()}.json`, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Sauvegarde ${APP_NAME}` })
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="screen">
      <header className="head"><h1>Profil</h1></header>

      <section className="card">
        <div className="field">
          <label htmlFor="pf-name">Prénom</label>
          <input id="pf-name" className="input" autoComplete="given-name" placeholder="Ton prénom"
            defaultValue={profile?.name ?? ''} key={profile ? 'ready' : 'loading'}
            onChange={e => saveProfile({ name: e.target.value.trim() || undefined })} />
        </div>
        <div className="field">
          <span className="sub" id="th-l">Apparence</span>
          <div className="seg" role="group" aria-labelledby="th-l">
            {([['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']] as [Theme, string][]).map(([v, l]) => (
              <button key={v} aria-pressed={theme === v} onClick={() => pickTheme(v)}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Tes données</h2>
        <p className="sub">
          Tout est enregistré uniquement sur ce téléphone : {counts?.workouts ?? 0} séances et {counts?.measures ?? 0} mesures.
          Rien n'est envoyé sur internet. Pense à faire une sauvegarde de temps en temps.
        </p>
        <button className="btn" onClick={exportData}>Exporter une sauvegarde</button>
        {legacy && (
          <button className="btn soft" onClick={() => setSheet('legacy')}>
            {imported ? 'Récupérer à nouveau depuis Suivi sport' : 'Récupérer mes données de Suivi sport'}
          </button>
        )}
        <button className="btn danger" onClick={() => setSheet('erase')}>Supprimer toutes mes données</button>
      </section>

      <footer className="about">
        <Mark size={22} /><span>{APP_NAME} · version de test</span>
      </footer>

      {sheet === 'legacy' && (
        <ConfirmSheet
          title="Récupérer depuis Suivi sport ?"
          text={`Les données de ${APP_NAME} seront remplacées par une copie de celles de Suivi sport (${legacy?.sessions} jours d'entraînement, ${legacy?.measures} mesures). Suivi sport n'est pas modifiée.`}
          confirmLabel="Remplacer par Suivi sport"
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            try { const r = await importLegacy(); toast(`${r.workouts} séances récupérées`) }
            catch (e) { toast((e as Error).message) }
            setSheet(null)
          }}
        />
      )}
      {sheet === 'erase' && (
        <ConfirmSheet
          danger
          title="Supprimer toutes tes données ?"
          text={`Séances, mesures, nutrition, planning et profil seront effacés de ce téléphone. C'est définitif. Exporte une sauvegarde avant si tu veux les garder. Suivi sport n'est pas touchée.`}
          confirmLabel="Tout supprimer"
          onClose={() => setSheet(null)}
          onConfirm={async () => { await eraseAll(); pickTheme('auto'); setSheet(null); toast('Toutes tes données ont été supprimées') }}
        />
      )}
      <style>{'.about{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--mute);font-size:.8rem;padding:8px 0}'}</style>
    </div>
  )
}
