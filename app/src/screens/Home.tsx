import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { allExercises, db, getProfile, saveProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { addDays, DAYS, fmtThousands, longDate, MONTHS, parse, today, weekday, weekStartOf } from '../lib/dates'
import { entrySummary, musclesOf, planLine, volume } from '../lib/summary'
import { MUSCLE_LABEL } from '../data/exercises'
import type { Muscle } from '../data/types'
import { recovery } from '../lib/recovery'
import { streak } from '../lib/streak'
import { cycleWeek } from '../lib/cycle'
import { MuscleMap } from '../components/MuscleMap'
import { useToast } from '../components/ui'
import { getSession, startSession } from '../data/session'
import { openPlanning, openPrograms, openSession, openWorkoutAdd, openWorkoutEdit } from '../lib/nav'
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
  const [picked, setPicked] = useState<string | null>(null)
  const sel = picked ?? t

  const exById = (id: string) => exercises.find(e => e.id === id)
  const planOf = (d: string) => plans.find(p => p.weekday === weekday(d) && (p.title || p.items.length))

  const weekStart = weekStartOf(t, profile?.weekStart ?? 0)
  const shownStart = weekStartOf(sel, profile?.weekStart ?? 0)
  const week = Array.from({ length: 7 }, (_, i) => addDays(shownStart, i))
  const shown = useLiveQuery(() => db.workouts.where('date').between(week[0], week[6], true, true).toArray(), [week[0]]) ?? []
  // Séance faite pour ce jour : le jour même, ou décalée à un autre jour. Une séance décalée
  // sur un jour qui a sa propre séance prévue ne compte pas pour lui : elle reste à faire.
  const doneFor = (d: string) => {
    const w = shown.find(x => x.date === d)
    return w && !(w.forDate && w.forDate !== d && planOf(d)) ? w : recent.find(x => x.forDate === d)
  }
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

  const cyc = cycleWeek(profile?.cycle, t)
  const plan = planOf(sel)
  const worked = sel !== t ? doneFor(sel) : undefined
  const planEx = plan?.items.map(i => exById(i.exerciseId)) ?? []
  const muscles = musclesOf(planEx)

  const start = async (title?: string, items = plan?.items ?? []) => {
    if (!active) await startSession(title, items, exercises, sel !== t ? sel : undefined)
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

      <section className="card" aria-label="Agenda">
        <div className="week-nav">
          <button className="link" aria-label="Semaine précédente" onClick={() => setPicked(addDays(sel, -7))}>‹</button>
          <span className="sub">{shownStart === weekStart ? 'Cette semaine' : `Semaine du ${parse(shownStart).getDate()} ${MONTHS[parse(shownStart).getMonth()]}`}</span>
          <button className="link" aria-label="Semaine suivante" onClick={() => setPicked(addDays(sel, 7))}>›</button>
        </div>
        <div className="week">
          {week.map(d => {
            const done = doneFor(d)
            const state = d === t ? 'now' : done ? 'done' : planOf(d) ? 'plan' : 'rest'
            const label = `${longDate(d)} : ${state === 'done' ? 'séance faite' : state === 'plan' ? (d < t ? 'séance pas encore faite' : 'séance prévue') : state === 'now' ? "aujourd'hui" : 'repos'}`
            return (
              <button key={d} className={'day ' + state + (d === t && done ? ' done' : '') + (d === sel && d !== t ? ' sel' : '')}
                aria-label={label} aria-pressed={d === sel} onClick={() => setPicked(d)}>
                <span>{DAYS[weekday(d)][0]}</span>
                <i>{parse(d).getDate()}</i>
              </button>
            )
          })}
        </div>
        {sel !== t && <button className="link plan-link" onClick={() => setPicked(null)}>Revenir à aujourd'hui</button>}
      </section>

      {worked ? (
        <section className="card">
          <span className="eyebrow">{longDate(sel)}</span>
          <h2>{worked.title || 'Séance faite'}</h2>
          <span className="sub">{worked.date === sel ? 'Séance faite ce jour-là.' : `Faite le ${longDate(worked.date).toLowerCase()}.`}</span>
          <ol className="plan-list">
            {worked.entries.map((e, i) => (
              <li key={i}>
                <span>{exById(e.exerciseId)?.name ?? 'Exercice'}</span>
                <span className="data">{entrySummary(e, exById(e.exerciseId))}</span>
              </li>
            ))}
          </ol>
          <button className="btn soft" onClick={() => openWorkoutEdit(worked.id)}>Modifier cette séance</button>
        </section>
      ) : plan ? (
        <section className="card today">
          <div className="today-head">
            <div>
              <span className="eyebrow">{sel === t ? 'Séance du jour' : longDate(sel)}</span>
              <h2>{plan.title || 'Séance prévue'}</h2>
              <span className="sub">{plan.items.length} exercice{plan.items.length > 1 ? 's' : ''}{cyc ? ` · semaine ${cyc.week} sur ${cyc.total}` : ''}</span>
              {cyc?.deload && <span className="sub deload-note">Semaine allégée : moins de séries, charges plus légères.</span>}
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
                  <span className="data">{planLine(it, exById(it.exerciseId))}</span>
                </li>
              ))}
            </ol>
          )}
          {!active && <button className="btn go" onClick={() => start(plan.title || undefined)}>{sel === t ? 'Commencer la séance' : "Faire cette séance aujourd'hui"}</button>}
          {sel < t && <button className="btn soft" onClick={() => openWorkoutAdd(sel)}>Je l'ai faite ce jour-là</button>}
          <button className="link plan-link" onClick={openPlanning}>Modifier le planning</button>
        </section>
      ) : (
        <section className="card">
          <span className="eyebrow">{sel === t ? 'Séance du jour' : longDate(sel)}</span>
          <h2>Pas de séance prévue</h2>
          {sel === t && <p className="sub">Profite du repos, ou entraîne-toi librement.</p>}
          {!plans.some(p => p.items.length) && <button className="link plan-link" onClick={openPrograms}>Choisir un programme tout prêt</button>}
          {!active && sel === t && <button className="btn soft" onClick={() => start(undefined, [])}>Commencer une séance libre</button>}
          {sel < t && <button className="btn soft" onClick={() => openWorkoutAdd(sel)}>Ajouter une séance à cette date</button>}
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
