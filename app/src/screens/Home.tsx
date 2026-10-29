import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { allExercises, db, getProfile } from '../data/db'
import { importLegacy, legacySummary } from '../data/legacy'
import { addDays, DAYS, fmtThousands, longDate, parse, today, weekday, weekStartOf } from '../lib/dates'
import { musclesOf, volume } from '../lib/summary'
import { MuscleMap } from '../components/MuscleMap'
import { useToast } from '../components/ui'
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

  const exById = (id: string) => exercises.find(e => e.id === id)
  const doneDays = new Set(recent.map(w => w.date))
  const planOf = (d: string) => plans.find(p => p.weekday === weekday(d) && (p.title || p.items.length))

  const start = weekStartOf(t, profile?.weekStart ?? 0)
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const month = t.slice(0, 7)
  const sessionsThisMonth = recent.filter(w => w.date.startsWith(month)).length
  const weekVolume = recent.filter(w => w.date >= start).reduce((a, w) => a + w.entries.reduce((b, e) => b + volume(e.sets), 0), 0)

  const plan = planOf(t)
  const planEx = plan?.items.map(i => exById(i.exerciseId)) ?? []
  const muscles = musclesOf(planEx)

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
                  <span className="data">{it.sets ? it.sets + ' séries' : ''}{it.technique ? ' · ' + it.technique.toLowerCase() : ''}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <section className="card">
          <span className="eyebrow">Séance du jour</span>
          <h2>Pas de séance prévue</h2>
          <p className="sub">Profite du repos, ou entraîne-toi librement.</p>
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
