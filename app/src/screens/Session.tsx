import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { allExercises, getProfile, saveProfile } from '../data/db'
import {
  buildEntry, completeSet, doneCount, dropSession, finishSession, getSession, isFinished, lastSets, nextSetIndex,
  saveSession, type ActiveSession,
} from '../data/session'
import type { Entry, Exercise, SetLog, Workout } from '../data/types'
import { fmtNum, fmtThousands } from '../lib/dates'
import { keepAwake, restOver, unlockAudio } from '../lib/signal'
import { entrySummary, musclesOf, volume } from '../lib/summary'
import { ExercisePicker } from '../components/ExercisePicker'
import { MuscleMap } from '../components/MuscleMap'
import { ConfirmSheet, useToast } from '../components/ui'
import './Session.css'

const clock = (sec: number) => {
  sec = Math.max(0, Math.round(sec))
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0')
}

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const toNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

type Sheet = 'add' | 'finish' | 'quit' | null

export function Session({ onClose }: { onClose: () => void }) {
  const s = useLiveQuery(getSession, [], null)
  const exercises = useLiveQuery(allExercises) ?? []
  const profile = useLiveQuery(getProfile)
  const toast = useToast()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [summary, setSummary] = useState<{ w: Workout; minutes: number } | null>(null)
  const now = useNow(250)

  useEffect(() => {
    let release = () => {}
    keepAwake().then(r => { release = r })
    return () => release()
  }, [])

  // Fin du repos : signal une seule fois, même si l'écran se redessine
  const signaled = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (s?.restEndsAt && now >= s.restEndsAt && signaled.current !== s.restEndsAt) {
      signaled.current = s.restEndsAt
      if (now - s.restEndsAt < 5000) restOver() // pas de bip pour un repos fini depuis longtemps (app rouverte plus tard)
      saveSession({ ...s, restEndsAt: undefined, restTotal: undefined })
    }
  }, [now, s])

  if (summary) return <Summary {...summary} exercises={exercises} onClose={onClose} />
  if (s === null) return null
  if (!s) {
    return (
      <div className="screen">
        <section className="card">
          <h2>Aucune séance en cours</h2>
          <button className="btn" onClick={onClose}>Retour à l'accueil</button>
        </section>
      </div>
    )
  }

  const exById = (id: string) => exercises.find(e => e.id === id)
  const entry = s.entries[s.cur] as Entry | undefined
  const ex = entry && exById(entry.exerciseId)
  const restSec = profile?.restSec ?? 90
  const resting = s.restEndsAt && now < s.restEndsAt

  const validate = (ei: number, si: number, values: Omit<SetLog, 'done'>) => {
    unlockAudio()
    const next = completeSet(s, ei, si, values)
    const rest = !isFinished(next) && restSec > 0
    saveSession({ ...next, restEndsAt: rest ? Date.now() + restSec * 1000 : undefined, restTotal: rest ? restSec : undefined })
  }

  const patchEntry = (ei: number, fn: (e: Entry) => Entry | null) => {
    const entries = s.entries.flatMap((e, i) => (i === ei ? (fn(e) ?? []) : [e]))
    saveSession({ ...s, entries, cur: Math.min(s.cur, Math.max(0, entries.length - 1)) })
  }

  const addExercise = async (picked: Exercise) => {
    setSheet(null)
    const e = buildEntry(picked, await lastSets(picked.id))
    const cur = await getSession() // valeur fraîche : la liste a pu changer pendant le choix
    if (cur) await saveSession({ ...cur, entries: [...cur.entries, e], cur: cur.entries.length })
  }

  const finish = async () => {
    const w = await finishSession(s)
    setSheet(null)
    if (!w) { toast('Aucune série validée, rien n\'a été enregistré'); onClose(); return }
    setSummary({ w: { ...w, entries: s.entries.map(e => ({ ...e, sets: e.sets.filter(x => x.done) })).filter(e => e.sets.length) }, minutes: Math.round((Date.now() - s.startedAt) / 60000) })
  }

  const total = s.entries.reduce((a, e) => a + e.sets.length, 0)
  const done = doneCount(s)

  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onClose} aria-label="Réduire la séance, elle continue">‹ Réduire</button>
        <span className="data" role="timer" aria-label="Durée de la séance">{clock((now - s.startedAt) / 1000)}</span>
        <button className="pill" onClick={() => setSheet('finish')}>Terminer</button>
      </header>

      <div className="head">
        <span className="sub">{done} série{done > 1 ? 's' : ''} sur {total}</span>
        <h1>{s.title || 'Séance libre'}</h1>
        <div className="ses-progress" aria-hidden="true"><i style={{ width: total ? (done / total) * 100 + '%' : 0 }} /></div>
      </div>

      {entry && ex ? (
        <Current key={s.id + s.cur + entry.exerciseId} s={s} entry={entry} ex={ex} onValidate={validate} onPatch={fn => patchEntry(s.cur, fn)} />
      ) : (
        <section className="card">
          <h2>Ta séance est vide</h2>
          <p className="sub">Ajoute un premier exercice pour commencer.</p>
        </section>
      )}

      {s.entries.length > 1 && (
        <section className="card ses-list" aria-label="Exercices de la séance">
          {s.entries.map((e, i) => {
            const n = e.sets.filter(x => x.done).length
            return (
              <button key={i} className={'ses-item' + (i === s.cur ? ' on' : '') + (n === e.sets.length ? ' ok' : '')}
                aria-current={i === s.cur || undefined} onClick={() => saveSession({ ...s, cur: i })}>
                <b>{exById(e.exerciseId)?.name ?? 'Exercice'}</b>
                <span className="data">{n}/{e.sets.length}</span>
              </button>
            )
          })}
        </section>
      )}

      <button className="btn soft" onClick={() => setSheet('add')}>+ Ajouter un exercice</button>
      <button className="link danger-link" onClick={() => setSheet('quit')}>Abandonner la séance</button>

      {resting && (
        <Rest endsAt={s.restEndsAt!} total={s.restTotal ?? restSec} now={now} next={nextLabel(s, exById)}
          onChange={endsAt => saveSession(endsAt > Date.now() ? { ...s, restEndsAt: endsAt } : { ...s, restEndsAt: undefined, restTotal: undefined })}
          restSec={restSec} onDefault={sec => saveProfile({ restSec: sec })} />
      )}

      {sheet === 'add' && (
        <ExercisePicker exercises={exercises} exclude={s.entries.map(e => e.exerciseId)} onPick={addExercise} onClose={() => setSheet(null)} />
      )}
      {sheet === 'finish' && (
        <ConfirmSheet title="Terminer la séance ?"
          text={done ? `${done} série${done > 1 ? 's' : ''} ser${done > 1 ? 'ont' : 'a'} enregistrée${done > 1 ? 's' : ''}.${done < total ? ' Les séries non validées ne sont pas gardées.' : ''}` : 'Aucune série n\'a été validée : rien ne sera enregistré.'}
          confirmLabel="Terminer et enregistrer" onConfirm={finish} onClose={() => setSheet(null)} />
      )}
      {sheet === 'quit' && (
        <ConfirmSheet danger title="Abandonner la séance ?" text="Les séries de cette séance ne seront pas enregistrées."
          confirmLabel="Abandonner" onConfirm={async () => { await dropSession(); onClose() }} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}

function nextLabel(s: ActiveSession, exById: (id: string) => Exercise | undefined) {
  const e = s.entries[s.cur]
  const i = e ? nextSetIndex(e) : -1
  if (!e || i < 0) return ''
  const x = e.sets[i], ex = exById(e.exerciseId)
  const val = ex?.kind === 'cardio'
    ? [x.km != null && fmtNum(x.km) + ' km', x.min != null && fmtNum(x.min) + ' min'].filter(Boolean).join(' · ')
    : [x.weight != null && fmtNum(x.weight) + ' kg', x.reps != null && x.reps + ' rép.'].filter(Boolean).join(' × ')
  return `${ex?.name ?? 'Exercice'} · série ${i + 1}${val ? ' · ' + val : ''}`
}

// Exercice affiché : séries faites, série en cours à saisir, séries à venir
function Current({ s, entry, ex, onValidate, onPatch }: {
  s: ActiveSession; entry: Entry; ex: Exercise
  onValidate: (ei: number, si: number, v: Omit<SetLog, 'done'>) => void
  onPatch: (fn: (e: Entry) => Entry | null) => void
}) {
  const cardio = ex.kind === 'cardio'
  const si = nextSetIndex(entry)
  const set = entry.sets[si] as SetLog | undefined
  const last = useLiveQuery(() => lastSets(ex.id), [ex.id])
  const fields = cardio
    ? [{ k: 'km', label: 'Distance', unit: 'km', step: .5 }, { k: 'min', label: 'Durée', unit: 'min', step: 1 }] as const
    : [{ k: 'weight', label: 'Charge', unit: 'kg', step: 2.5 }, { k: 'reps', label: 'Répétitions', unit: 'rép.', step: 1 }] as const
  const [vals, setVals] = useState<Record<string, string>>({})
  useEffect(() => {
    setVals(Object.fromEntries(fields.map(f => [f.k, set?.[f.k] != null ? fmtNum(set[f.k]!) : ''])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, entry.sets.length])

  const step = (k: string, d: number) => setVals(v => {
    const n = Math.max(0, (toNum(v[k] ?? '') ?? 0) + d)
    return { ...v, [k]: fmtNum(n) }
  })
  const values = Object.fromEntries(fields.map(f => [f.k, toNum(vals[f.k] ?? '')]))
  const canValidate = cardio ? values.km != null || values.min != null : values.reps != null
  const { primary, secondary } = musclesOf([ex])
  const hasMap = primary.length + secondary.length > 0

  return (
    <section className="card current">
      <div className="cur-head">
        <div>
          <span className="eyebrow">{ex.group}{entry.technique ? ' · ' + entry.technique : ''}</span>
          <h2>{ex.name}</h2>
          <span className="sub">
            {last?.length ? 'La dernière fois : ' + entrySummary({ exerciseId: ex.id, sets: last }, ex) : 'Première fois : note ce que tu fais, on s\'en souviendra.'}
          </span>
        </div>
        {hasMap && (
          <div className="cur-figs">
            <MuscleMap view="front" primary={primary} secondary={secondary} className="cur-fig" />
            <MuscleMap view="back" primary={primary} secondary={secondary} className="cur-fig" />
          </div>
        )}
      </div>

      <ol className="sets">
        {entry.sets.map((x, i) => (
          <li key={i} className={x.done ? 'done' : i === si ? 'now' : ''}>
            <span className="data">{i + 1}</span>
            <span>{cardio
              ? [x.km != null && fmtNum(x.km) + ' km', x.min != null && fmtNum(x.min) + ' min'].filter(Boolean).join(' · ') || '—'
              : `${x.weight != null ? fmtNum(x.weight) + ' kg' : 'poids du corps'} × ${x.reps ?? '?'}`}</span>
            {x.done
              ? <button className="tick" aria-label={`Série ${i + 1} faite, toucher pour la corriger`}
                  onClick={() => onPatch(e => ({ ...e, sets: e.sets.map((y, j) => (j === i ? { ...y, done: false } : y)) }))}>✓</button>
              : <span className="data">{i === si ? 'en cours' : ''}</span>}
          </li>
        ))}
      </ol>

      {set ? (
        <div className="entry-form">
          <div className="steppers">
            {fields.map(f => (
              <div key={f.k} className="stepper">
                <label htmlFor={'st-' + f.k}>{f.label}</label>
                <div>
                  <button aria-label={`${f.label} moins ${fmtNum(f.step)}`} onClick={() => step(f.k, -f.step)}>−</button>
                  <input id={'st-' + f.k} inputMode="decimal" autoComplete="off" value={vals[f.k] ?? ''} placeholder="0"
                    onChange={e => setVals(v => ({ ...v, [f.k]: e.target.value }))} />
                  <button aria-label={`${f.label} plus ${fmtNum(f.step)}`} onClick={() => step(f.k, f.step)}>+</button>
                </div>
                <span className="data">{f.unit}</span>
              </div>
            ))}
          </div>
          <button className="btn go" disabled={!canValidate} onClick={() => onValidate(s.cur, si, values)}>
            Valider la série {si + 1}
          </button>
        </div>
      ) : (
        <p className="sub ok-line">Exercice terminé.</p>
      )}

      <div className="row cur-tools">
        <button className="link" onClick={() => onPatch(e => ({ ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? {}), done: false }] }))}>+ Série</button>
        {entry.sets.some(x => !x.done) && entry.sets.length > 1 && (
          <button className="link" onClick={() => onPatch(e => {
            const i = e.sets.map(x => x.done).lastIndexOf(false)
            return { ...e, sets: e.sets.filter((_, j) => j !== i) }
          })}>− Série</button>
        )}
        <button className="link" onClick={() => onPatch(() => null)}>Retirer l'exercice</button>
      </div>
    </section>
  )
}

// Repos : compte à rebours en plein écran, réglable sans quitter la séance
function Rest({ endsAt, total, now, next, onChange, restSec, onDefault }: {
  endsAt: number; total: number; now: number; next: string
  onChange: (endsAt: number) => void; restSec: number; onDefault: (sec: number) => void
}) {
  const left = Math.max(0, (endsAt - now) / 1000)
  const R = 88, C = 2 * Math.PI * R
  const frac = total ? Math.min(1, left / total) : 0
  return (
    <div className="rest-screen" role="dialog" aria-modal="true" aria-label="Repos">
      <span className="eyebrow">Repos</span>
      <div className="ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={R} className="ring-bg" />
          <circle cx="100" cy="100" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />
        </svg>
        <span className="ring-time" role="timer">{clock(Math.ceil(left))}</span>
      </div>
      {next && <p className="rest-next"><span className="sub">Ensuite</span><b>{next}</b></p>}
      <div className="row">
        <button className="btn soft" onClick={() => onChange(endsAt - 15000)}>− 15 s</button>
        <button className="btn soft" onClick={() => onChange(endsAt + 15000)}>+ 15 s</button>
      </div>
      <button className="btn" onClick={() => onChange(0)}>Passer le repos</button>
      <div className="rest-default">
        <span className="sub" id="rd-l">Repos par défaut</span>
        <div className="seg" role="group" aria-labelledby="rd-l">
          {[60, 90, 120, 180].map(v => (
            <button key={v} aria-pressed={restSec === v} onClick={() => onDefault(v)}>{v < 120 ? v + ' s' : v / 60 + ' min'}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Summary({ w, minutes, exercises, onClose }: { w: Workout; minutes: number; exercises: Exercise[]; onClose: () => void }) {
  const exById = (id: string) => exercises.find(e => e.id === id)
  const sets = w.entries.reduce((a, e) => a + e.sets.length, 0)
  const vol = w.entries.reduce((a, e) => a + volume(e.sets), 0)
  const { primary, secondary } = musclesOf(w.entries.map(e => exById(e.exerciseId)))
  return (
    <div className="screen session">
      <div className="head">
        <span className="eyebrow">Séance enregistrée</span>
        <h1>Bien joué.</h1>
      </div>
      <section className="card">
        <div className="sum-figs">
          <MuscleMap view="front" primary={primary} secondary={secondary} className="sum-fig" label="Muscles travaillés, face" />
          <MuscleMap view="back" primary={primary} secondary={secondary} className="sum-fig" label="Muscles travaillés, dos" />
        </div>
        <div className="sum-kpis">
          <div><span className="big">{minutes}</span><span className="unit">min</span></div>
          <div><span className="big">{sets}</span><span className="unit">séries</span></div>
          {vol > 0 && <div><span className="big">{fmtThousands(vol)}</span><span className="unit">kg</span></div>}
        </div>
      </section>
      <section className="card list">
        {w.entries.map((e, i) => (
          <div key={i} className="li">
            <b>{exById(e.exerciseId)?.name ?? 'Exercice'}</b>
            <span className="data" style={{ gridColumn: '1 / -1' }}>{entrySummary(e, exById(e.exerciseId))}</span>
          </div>
        ))}
      </section>
      <button className="btn" onClick={onClose}>Retour à l'accueil</button>
    </div>
  )
}
