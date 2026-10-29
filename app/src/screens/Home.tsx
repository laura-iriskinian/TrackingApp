import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { allExercises, db, getProfile, saveProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { addDays, DAYS, fmtThousands, longDate, parse, today, weekday, weekStartOf } from '../lib/dates'
import { musclesOf, volume } from '../lib/summary'
import { typesSummary } from '../data/sets'
import { MUSCLE_LABEL } from '../data/exercises'
import type { Muscle } from '../data/types'
import { recovery } from '../lib/recovery'
import { streak } from '../lib/streak'
import { MuscleMap } from '../components/MuscleMap'
import { useToast } from '../components/ui'
import { getSession, startSession } from '../data/session'
import { openPlanning, openSession } from '../lib/nav'
import './Home.css'

export function Home() {
  const t = today()
  const profile = useLiveQuery(getProfile)
  const exercises = useLiveQuery(allExercises) ?? []
  const plans = useLiveQuery(() => db.plans.toArray()) ?? []
  const recent = useLiveQuery(() => db.workouts.where('date').aboveOrEqual(addDays(t, -62)).toArray()) ?? []
  const isEmpty = useLiveQuery(async () => (await db.workouts.count()) + (await db.measures.count()) === 0)
  const legacy = useMemo(legacySummary, [])
  const toast = useToast()
  const [importing, setImporting] = useState(false)
  const active = useLiveQuery(getSession)

  const exById = (id: string) => exercises.find(e => e.id === id)
  const doneDays = new Set(recent.map(w => w.date))
  const planOf = (d: string) => plans.find(p => p.weekday === weekday(d) && (p.title || p.items.length))

  const weekStart = weekStartOf(t, profile?.weekStart ?? 0)
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const month = t.slice(0, 7)
  const allDates = useLiveQuery(async () => (await db.workouts.orderBy('date').keys()) as string[]) ?? []
  const target = profile?.weeklyTarget ?? 3
  const pauses = profile?.pauseWeeks ?? []
  const reg = streak(allDates, target, pauses, t, profile?.weekStart ?? 0)
  const togglePause = () => saveProfile({ pauseWeeks: reg.paused ? pauses.filter(w => w !== weekStart) : [...pauses, weekStart] })
  const tired = recovery(recent, exercises, t)
  const names = (lv: number[]) => (Object.entries(tired) as [Muscle, number][]).filter(([, l]) => lv.includes(l)).map(([m]) => MUSCLE_LABEL[m])
  const sessionsThisMonth = recent.filter(w => w.date.startsWith(month)).length
  const weekVolume = recent.filter(w => w.date >= weekStart).reduce((a, w) => a + w.entries.reduce((b, e) => b + volume(e.sets), 0), 0)

  const plan = planOf(t)
  const planEx = plan?.items.map(i => exById(i.exerciseId)) ?? []
  const muscles = musclesOf(planEx)

  const start = async (title?: string, items = plan?.items ?? []) => {
    if (!active) await startSession(title, items, exercises)
    openSession()
  }

  const recover = async () => {
    setImporting(true)
    try {
      const r = await importLegacy()
      toast(`${r.workouts} séances récupérées`)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="screen">
      <header className="head">
        <span className="sub">{longDate(t)}</span>
        <h1>{profile?.name ? `Bonjour ${profile.name}` : 'Bonjour'}</h1>
      </header>

      {active && (
        <button className="card resume" onClick={openSession}>
          <span className="eyebrow">Séance en cours</span>
          <b>{active.title || 'Séance libre'}</b>
          <span className="resume-go">Reprendre</span>
        </button>
      )}

      {legacy && isEmpty && (
        <section className="card legacy">
          <span className="eyebrow">Suivi sport</span>
          <h2>Récupère ton historique</h2>
          <p className="sub">
            {legacy.sessions} jours d'entraînement et {legacy.measures} mesures sont enregistrés dans Suivi sport sur ce téléphone.
            Tu peux les copier dans NextRep. Suivi sport ne sera pas modifiée.
          </p>
          <button className="btn" onClick={recover} disabled={importing}>
            {importing ? 'Récupération…' : 'Récupérer mes données'}
          </button>
        </section>
      )}

      <section className="card" aria-label="Cette semaine">
        <div className="week">
          {week.map(d => {
            const state = d === t ? 'now' : doneDays.has(d) ? 'done' : planOf(d) ? 'plan' : 'rest'
            const label = `${DAYS[weekday(d)]} : ${state === 'done' ? 'séance faite' : state === 'plan' ? 'séance prévue' : state === 'now' ? "aujourd'hui" : 'repos'}`
            return (
              <div key={d} className={'day ' + state + (d === t && doneDays.has(d) ? ' done' : '')} aria-label={label}>
                <span>{DAYS[weekday(d)][0]}</span>
                <i>{parse(d).getDate()}</i>
              </div>
            )
          })}
        </div>
      </section>

      {plan ? (
        <section className="card today">
          <div className="today-head">
            <div>
              <span className="eyebrow">Séance du jour</span>
              <h2>{plan.title || 'Séance prévue'}</h2>
              <span className="sub">{plan.items.length} exercice{plan.items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="today-figs">
              <MuscleMap view="front" primary={muscles.primary} secondary={muscles.secondary} className="today-fig" />
              <MuscleMap view="back" primary={muscles.primary} secondary={muscles.secondary} className="today-fig" />
            </div>
          </div>
          {plan.items.length > 0 && (
            <ol className="plan-list">
              {plan.items.map((it, i) => (
                <li key={i}>
                  <span>{exById(it.exerciseId)?.name ?? 'Exercice'}</span>
                  <span className="data">{[it.sets || it.types?.length ? (it.sets || it.types!.length) + ' séries' : '', typesSummary(it.types ?? []), it.group ? 'superset' : ''].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ol>
          )}
          {!active && <button className="btn go" onClick={() => start(plan.title || undefined)}>Commencer la séance</button>}
          <button className="link plan-link" onClick={openPlanning}>Modifier le planning</button>
        </section>
      ) : (
        <section className="card">
          <span className="eyebrow">Séance du jour</span>
          <h2>Pas de séance prévue</h2>
          <p className="sub">Profite du repos, ou entraîne-toi librement.</p>
          {!active && <button className="btn soft" onClick={() => start(undefined, [])}>Commencer une séance libre</button>}
          <button className="link plan-link" onClick={openPlanning}>Préparer le planning de la semaine</button>
        </section>
      )}

      <section className="card regular">
        <div className="reg-head">
          <div>
            <span className="sub">Régularité</span>
            <span className="big">{reg.weeks}<span className="unit">semaine{reg.weeks > 1 ? 's' : ''} d'affilée</span></span>
          </div>
          <div className="reg-dots" role="img" aria-label={`${reg.thisWeek} séance${reg.thisWeek > 1 ? 's' : ''} sur ${target} cette semaine`}>
            {Array.from({ length: Math.max(target, reg.thisWeek) }, (_, i) => <i key={i} className={i < reg.thisWeek ? 'on' : ''} />)}
          </div>
        </div>
        <p className="sub">
          {reg.paused ? 'Semaine de pause : elle ne compte pas et ne casse pas ta série.'
            : reg.thisWeek >= target ? `Objectif de la semaine atteint : ${reg.thisWeek} séance${reg.thisWeek > 1 ? 's' : ''}.`
            : `${reg.thisWeek} séance${reg.thisWeek > 1 ? 's' : ''} sur ${target} cette semaine.`}
        </p>
        <button className="link plan-link" onClick={togglePause}>{reg.paused ? 'Annuler la pause' : 'Mettre cette semaine en pause'}</button>
      </section>

      {Object.keys(tired).length > 0 && (
        <section className="card recov">
          <div className="today-head">
            <div>
              <span className="eyebrow">Récupération</span>
              <h2>{names([3]).length ? 'À laisser reposer' : names([2]).length ? 'En récupération' : 'Presque récupéré'}</h2>
              <span className="sub">{(names([3]).length ? names([3]) : names([2]).length ? names([2]) : names([1])).join(', ')}</span>
            </div>
            <div className="today-figs">
              <MuscleMap view="front" levels={tired} className="today-fig" label="Muscles encore fatigués, de face" />
              <MuscleMap view="back" levels={tired} className="today-fig" label="Muscles encore fatigués, de dos" />
            </div>
          </div>
          <div className="recov-key" aria-hidden="true">
            <span><i className="r3" />Travaillé hier ou aujourd'hui</span>
            <span><i className="r2" />Il y a 2 jours</span>
            <span><i className="r1" />Presque récupéré</span>
          </div>
        </section>
      )}

      <div className="kpis">
        <section className="card">
          <span className="sub">Séances en {new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(parse(t))}</span>
          <span className="big">{sessionsThisMonth}</span>
        </section>
        <section className="card">
          <span className="sub">Volume cette semaine</span>
          <span className="big">{fmtThousands(weekVolume)}<span className="unit">kg</span></span>
        </section>
      </div>
    </div>
  )
}
