import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { APP_NAME, THEME_KEY } from '../config'
import { db, eraseAll, exportAll, getProfile, saveProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { longDate, nb, today } from '../lib/dates'
import { checkBackup, MAX_BACKUP_BYTES, restoreBackup, type CheckedBackup } from '../data/backup'
import { applyTheme, type Theme } from '../lib/theme'
import { ConfirmSheet, useToast } from '../components/ui'
import { Mark } from '../components/Logo'

type Sheet = 'legacy' | 'erase' | 'restore' | 'paste' | null

export function Profile() {
  const profile = useLiveQuery(getProfile)
  const counts = useLiveQuery(async () => ({ workouts: await db.workouts.count(), measures: await db.measures.count() }))
  const imported = useLiveQuery(() => db.kv.get('legacyImportedAt'))
  // Séances notées dans NextRep depuis la dernière récupération : elles seraient perdues en récupérant à nouveau
  const ownWorkouts = useLiveQuery(async () => {
    const at = Date.parse(String((await db.kv.get('legacyImportedAt'))?.value ?? '')) || 0
    return db.workouts.filter(w => w.updatedAt > at).count()
  })
  const [backup, setBackup] = useState<CheckedBackup | null>(null)
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

  const openBackup = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) { toast('Ce fichier est trop gros pour être une sauvegarde.'); return }
    openText(await file.text())
  }
  const openText = (text: string) => {
    try {
      setBackup(checkBackup(text.trim()))
      setSheet('restore')
    } catch (e) {
      toast((e as Error).message)
    }
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
          <span className="sub" id="sx-l">Silhouette des schémas</span>
          <div className="seg" role="group" aria-labelledby="sx-l">
            {([['f', 'Femme'], ['h', 'Homme']] as const).map(([v, l]) => (
              <button key={v} aria-pressed={(profile?.sex ?? 'h') === v} onClick={() => saveProfile({ sex: v })}>{l}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="sub" id="wt-l">Objectif de séances par semaine</span>
          <div className="seg" role="group" aria-labelledby="wt-l">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button key={n} aria-pressed={(profile?.weeklyTarget ?? 3) === n} onClick={() => saveProfile({ weeklyTarget: n })}>{n}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="sub" id="ef-l">Ressenti d'effort après chaque série</span>
          <div className="seg" role="group" aria-labelledby="ef-l">
            {([['off', 'Non'], ['simple', 'Simple'], ['rpe', 'RPE'], ['rir', 'RIR']] as const).map(([v, l]) => (
              <button key={v} aria-pressed={(profile?.effortMode ?? 'off') === v} onClick={() => saveProfile({ effortMode: v })}>{l}</button>
            ))}
          </div>
          <span className="data">
            {{ off: 'Pas de question après les séries.', simple: 'Facile, dur ou limite.', rpe: 'Effort de 6 à 10 : 10 = impossible d\'en faire une de plus.', rir: 'Nombre de répétitions que tu aurais encore pu faire.' }[profile?.effortMode ?? 'off']}
          </span>
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
        <label className="btn soft file-btn">
          Restaurer une sauvegarde
          <input type="file" accept="application/json,text/plain,.json,.txt" onChange={e => { openBackup(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <p className="data">Fonctionne aussi avec une sauvegarde de Suivi sport. <button className="link inline-link" onClick={() => setSheet('paste')}>Coller le texte d'une sauvegarde</button></p>
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
          text={`Les données de ${APP_NAME} seront remplacées par une copie de celles de Suivi sport (${legacy?.sessions} jours d'entraînement, ${legacy?.measures} mesures). Suivi sport n'est pas modifiée.`
            + (ownWorkouts ? ` Attention : ${ownWorkouts} séance${ownWorkouts > 1 ? 's' : ''} notée${ownWorkouts > 1 ? 's' : ''} ou modifiée${ownWorkouts > 1 ? 's' : ''} dans ${APP_NAME} ser${ownWorkouts > 1 ? 'ont' : 'a'} perdue${ownWorkouts > 1 ? 's' : ''}. Exporte une sauvegarde avant.` : '')}
          danger={!!ownWorkouts}
          confirmLabel="Remplacer par Suivi sport"
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            try { const r = await importLegacy(); toast(`${r.workouts} séances récupérées`) }
            catch (e) { toast((e as Error).message) }
            setSheet(null)
          }}
        />
      )}
      {sheet === 'paste' && <PasteSheet onClose={() => setSheet(null)} onText={openText} />}
      {sheet === 'restore' && backup && (
        <ConfirmSheet
          danger
          title="Restaurer cette sauvegarde ?"
          text={(backup.source === 'suivi-sport' ? 'Sauvegarde de Suivi sport' : `Sauvegarde${backup.exportedAt ? ' du ' + longDate(backup.exportedAt.slice(0, 10)).toLowerCase() : ''}`) + ` : ${nb(backup.rows.workouts.length, 'séance')} et ${nb(backup.rows.measures.length, 'mesure')}. `
            + `Elle remplacera toutes les données actuelles de ${APP_NAME} (${nb(counts?.workouts ?? 0, 'séance')}).`
            + (backup.skipped ? ` ${backup.skipped} élément${backup.skipped > 1 ? 's' : ''} illisible${backup.skipped > 1 ? 's' : ''} ser${backup.skipped > 1 ? 'ont' : 'a'} ignoré${backup.skipped > 1 ? 's' : ''}.` : '')}
          confirmLabel="Restaurer"
          onClose={() => { setSheet(null); setBackup(null) }}
          onConfirm={async () => {
            await restoreBackup(backup)
            setSheet(null); setBackup(null)
            toast('Sauvegarde restaurée')
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
      <style>{'.file-btn{position:relative;text-align:center;cursor:pointer}.file-btn input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.file-btn:focus-within{outline:2px solid var(--effort);outline-offset:3px}.inline-link{padding:0;font:inherit;color:var(--ink);text-decoration:underline}.paste{min-height:140px;font:500 .8rem var(--f-data);resize:vertical}.about{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--mute);font-size:.8rem;padding:8px 0}'}</style>
    </div>
  )
}

// Pour une sauvegarde de Suivi sport copiée dans une note plutôt qu'enregistrée en fichier
function PasteSheet({ onText, onClose }: { onText: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ps-t" onClick={e => e.stopPropagation()}>
        <h2 id="ps-t">Coller une sauvegarde</h2>
        <p>Colle ici le texte copié depuis Suivi sport ou NextRep.</p>
        <textarea className="input paste" autoFocus value={text} onChange={e => setText(e.target.value)} aria-label="Texte de la sauvegarde" />
        <button className="btn" disabled={!text.trim()} onClick={() => onText(text)}>Continuer</button>
        <button className="btn soft" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}
