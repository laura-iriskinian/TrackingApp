import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allExercises, db, getProfile, newId, saveProfile } from '../data/db'
import { ConfirmSheet, useToast } from '../components/ui'
import { cycleWeek } from '../lib/cycle'
import { APP_NAME } from '../config'
import { remindersIcs } from '../lib/ics'
import { newGroupId, SET_TYPES } from '../data/sets'
import { daysLabel, saveRoutine } from '../data/routines'
import { getSession, startSession } from '../data/session'
import type { Exercise, PlanItem, SetType, Template } from '../data/types'
import { DAYS, nb, today, weekStartOf } from '../lib/dates'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseSheet } from '../components/ExerciseSheet'
import { PROGRAMS } from '../data/programs'
import { openPrograms, openSession } from '../lib/nav'
import './Session.css'

const DEFAULT_SETS = 3

// Un groupe d'un seul exercice n'a plus de sens
function cleanGroups(items: PlanItem[]): PlanItem[] {
  return items.map(it => {
    if (!it.group || items.filter(x => x.group === it.group).length > 1) return it
    const { group: _, ...rest } = it
    return rest
  })
}

const table = (n: string) => db.table(n)

// Mes séances : la liste des séances enregistrées, à lancer quand on veut. Chacune peut être prévue certains jours.
export function Planning({ openId, onClose }: { openId?: string; onClose: () => void }) {
  const routines = useLiveQuery(() => db.templates.toArray())
  const exercises = useLiveQuery(allExercises) ?? []
  const profile = useLiveQuery(getProfile)
  const [editing, setEditing] = useState<string | null>(openId ?? null)
  if (!routines || !profile) return null

  const current = editing ? routines.find(r => r.id === editing) : undefined
  if (current) return <RoutineEdit key={current.id} routine={current} routines={routines} exercises={exercises} onBack={() => setEditing(null)} />

  const exById = (id: string) => exercises.find(e => e.id === id)
  const list = [...routines].sort((a, b) =>
    (a.days?.[0] ?? 7) - (b.days?.[0] ?? 7) || a.title.localeCompare(b.title, 'fr'))
  const create = async () => {
    const id = newId()
    await db.templates.put({ id, title: `Séance ${routines.length + 1}`, items: [], updatedAt: Date.now() })
    setEditing(id)
  }
  const program = PROGRAMS.find(p => p.id === profile.program)
  const cyc = cycleWeek(profile.cycle, today())
  const setCycle = (patch: Partial<NonNullable<typeof profile.cycle>> | null) => saveProfile({
    cycle: patch === null ? undefined : { start: profile.cycle?.start ?? weekStartOf(today()), weeks: 4, deload: true, ...profile.cycle, ...patch },
  })
  const plannedDays = routines.filter(r => r.items.length).reduce((a, r) => a + (r.days?.length ?? 0), 0)
  // Rappels : un fichier calendrier que le téléphone ajoute à son agenda, avec une alarme les jours prévus
  const exportReminders = async () => {
    const file = new File([remindersIcs(routines, profile.reminderTime, today(), APP_NAME)], 'rappels-' + APP_NAME.toLowerCase() + '.ics', { type: 'text/calendar' })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return }
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
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onClose}>‹ Retour</button>
      </header>
      <div className="head">
        <h1>Mes séances</h1>
        <span className="sub">À lancer quand tu veux. Donne un jour à une séance pour la voir dans l'agenda de l'accueil.</span>
      </div>
      <button className="suggest" onClick={openPrograms}>
        <b>{program ? `Programme : ${program.name}` : 'Programmes tout prêts'}</b>
        <span>{program ? 'Changer de programme, ou modifier les séances ci-dessous.' : 'Des séances prêtes à suivre, selon ton objectif et ton niveau.'}</span>
      </button>

      {list.map(r => (
        <button key={r.id} className="card routine" onClick={() => setEditing(r.id)}>
          <span className="eyebrow">{daysLabel(r.days)}</span>
          <h2>{r.title}</h2>
          <span className="sub">
            {r.items.length ? `${nb(r.items.length, 'exercice')} · ${r.items.map(i => exById(i.exerciseId)?.name).filter(Boolean).join(', ')}` : 'Aucun exercice pour l’instant'}
          </span>
        </button>
      ))}
      {!list.length && (
        <section className="card"><p className="sub">Aucune séance enregistrée. Crée la première, ou pars d'un programme tout prêt.</p></section>
      )}
      <button className="btn soft" onClick={create}>+ Nouvelle séance</button>

      <section className="card">
        <h2>Cycle</h2>
        <p className="sub">
          {profile.cycle
            ? `Semaine ${cyc?.week ?? 1} sur ${profile.cycle.weeks}.` + (profile.cycle.deload ? ' La dernière semaine est allégée : moitié moins de séries, charges à 60 %, pour récupérer avant de repartir plus fort.' : '') + ' Le cycle recommence ensuite.'
            : 'Organise tes semaines en cycles, avec une semaine allégée à la fin pour récupérer.'}
        </p>
        {profile.cycle ? (
          <>
            <div className="field">
              <span className="sub" id="cy-l">Durée du cycle</span>
              <div className="seg" role="group" aria-labelledby="cy-l">
                {[3, 4, 5, 6].map(n => <button key={n} aria-pressed={profile.cycle!.weeks === n} onClick={() => setCycle({ weeks: n })}>{n} sem.</button>)}
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={profile.cycle.deload} onChange={e => setCycle({ deload: e.target.checked })} />
              <span>Dernière semaine allégée</span>
            </label>
            <div className="row cur-tools">
              <button className="link" onClick={() => setCycle({ start: weekStartOf(today()) })}>Recommencer cette semaine</button>
              <button className="link" onClick={() => setCycle(null)}>Arrêter le cycle</button>
            </div>
          </>
        ) : <button className="btn soft" onClick={() => setCycle({})}>Commencer un cycle de 4 semaines</button>}
      </section>

      <section className="card">
        <h2>Rappels</h2>
        <p className="sub">
          {plannedDays
            ? `Ajoute ${plannedDays > 1 ? `tes ${plannedDays} jours` : 'ton jour'} de séance à l'agenda du téléphone : une alarme sonnera à l'heure choisie, même app fermée. Si tu changes de jours, ajoute-les à nouveau.`
            : 'Donne un jour à au moins une séance pour pouvoir créer des rappels.'}
        </p>
        <div className="field">
          <label htmlFor="pl-time">Heure du rappel</label>
          <input id="pl-time" className="input" type="time" value={profile.reminderTime}
            onChange={e => /^\d{2}:\d{2}$/.test(e.target.value) && saveProfile({ reminderTime: e.target.value })} />
        </div>
        <button className="btn soft" disabled={!plannedDays} onClick={exportReminders}>Ajouter à mon agenda</button>
      </section>
    </div>
  )
}

// Une séance : nom, jours (facultatifs) et exercices. Chaque modification est enregistrée tout de suite.
function RoutineEdit({ routine: r, routines, exercises, onBack }: {
  routine: Template; routines: Template[]; exercises: Exercise[]; onBack: () => void
}) {
  const [picking, setPicking] = useState(false)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [del, setDel] = useState(false)
  const active = useLiveQuery(getSession)
  const toast = useToast()
  const exById = (id: string) => exercises.find(e => e.id === id)

  const save = (patch: Partial<Template>) => {
    const next = { ...r, ...patch }
    db.templates.put({ ...next, items: cleanGroups(next.items), updatedAt: Date.now() })
  }
  const toggleDay = async (d: number) => {
    const days = r.days?.includes(d) ? r.days.filter(x => x !== d) : [...(r.days ?? []), d]
    const moved = await saveRoutine({ ...r, days }, table)
    for (const o of moved) toast(`« ${o.title} » n'est plus prévue le ${DAYS[d].toLowerCase()}`)
  }
  const ownerOf = (d: number) => routines.find(o => o.id !== r.id && o.days?.includes(d))
  const patchItem = (i: number, fn: (it: PlanItem) => PlanItem | null) =>
    save({ items: r.items.flatMap((it, j) => (j === i ? (fn(it) ?? []) : [it])) })
  const move = (i: number, d: number) => {
    const items = [...r.items]
    const [it] = items.splice(i, 1)
    items.splice(i + d, 0, it)
    // Déplacé hors de son groupe, l'exercice n'est plus enchaîné
    const n = items[i + d], prev = items[i + d - 1], next = items[i + d + 1]
    if (n.group && prev?.group !== n.group && next?.group !== n.group) delete items[i + d].group
    save({ items })
  }
  const link = (i: number, on: boolean) => {
    const items = r.items.map(x => ({ ...x }))
    if (on) {
      const g = items[i].group ?? items[i + 1].group ?? newGroupId()
      items[i].group = g
      items[i + 1].group = g
    } else {
      const g = items[i].group, rest = newGroupId()
      items.forEach((x, j) => { if (j > i && x.group === g) x.group = rest })
      delete items[i].group
    }
    save({ items })
  }
  const add = (ex: Exercise) => {
    setPicking(false)
    save({ items: [...r.items, ex.kind === 'cardio' ? { exerciseId: ex.id } : { exerciseId: ex.id, sets: DEFAULT_SETS }] })
  }
  const duplicate = async () => {
    const title = `${r.title} (copie)`.slice(0, 100)
    await db.templates.put({ id: newId(), title, items: r.items.map(x => ({ ...x })), updatedAt: Date.now() })
    toast(`« ${title} » ajoutée, sans jour fixe`)
  }
  const launch = async () => {
    if (!active) await startSession(r.title, r.items, exercises)
    openSession()
  }

  return (
    <div className="screen session">
      <header className="ses-bar">
        <button className="link" onClick={onBack}>‹ Mes séances</button>
      </header>
      <div className="head">
        <span className="eyebrow">Séance</span>
        <h1>{r.title}</h1>
      </div>

      <section className="card">
        <div className="field">
          <label htmlFor="pl-title">Nom</label>
          <input id="pl-title" className="input" defaultValue={r.title} maxLength={60} placeholder="Ex. Jambes"
            onChange={e => { const title = e.target.value.trim(); if (title) save({ title }) }} />
        </div>
        <div className="field">
          <span className="sub" id="pl-days">Jours prévus (facultatif)</span>
          <div className="seg days" role="group" aria-labelledby="pl-days">
            {DAYS.map((d, i) => {
              const other = ownerOf(i)
              return (
                <button key={d} aria-pressed={!!r.days?.includes(i)} onClick={() => toggleDay(i)}
                  aria-label={d + (other ? `, déjà pris par ${other.title}` : '')}>
                  {d.slice(0, 3)}{other && <i aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          <span className="sub">{r.days?.length ? `Prévue : ${daysLabel(r.days).toLowerCase()}.` : 'Sans jour fixe, elle se lance quand tu veux.'} Un point marque un jour déjà pris par une autre séance.</span>
        </div>
      </section>

      {r.items.map((it, i) => {
        const ex = exById(it.exerciseId)
        const cardio = ex?.kind === 'cardio'
        const n = it.sets ?? (cardio ? 1 : DEFAULT_SETS)
        const linkedNext = it.group && r.items[i + 1]?.group === it.group
        return (
          <section key={i} className={'card plan-item' + (it.group ? ' linked' : '') + (linkedNext ? ' link-next' : '')}>
            <div className="plan-item-head">
              <div>
                <span className="eyebrow">{it.group ? 'Superset' : ex?.group ?? 'Exercice'}</span>
                <h2>{ex?.name ?? 'Exercice supprimé'}</h2>
              </div>
              <div className="plan-move">
                <button className="link" disabled={i === 0} aria-label="Monter" onClick={() => move(i, -1)}>↑</button>
                <button className="link" disabled={i === r.items.length - 1} aria-label="Descendre" onClick={() => move(i, 1)}>↓</button>
              </div>
            </div>
            <div className="plan-sets">
              <label className="sub" htmlFor={`pl-tg-${i}`}>{cardio ? 'Objectif' : 'Répétitions visées'}</label>
              <input id={`pl-tg-${i}`} key={i + '-' + it.exerciseId} className="input plan-target" maxLength={20}
                defaultValue={it.target ?? ''} placeholder={cardio ? '20 min' : '8-12'}
                onChange={e => patchItem(i, x => {
                  const target = e.target.value.trim()
                  const { target: _, ...rest } = x
                  return target ? { ...rest, target } : rest
                })} />
            </div>
            {!cardio && (
              <>
                <div className="plan-sets">
                  <span className="sub">Séries</span>
                  <div className="mini-step">
                    <button aria-label="Une série de moins" disabled={n <= 1}
                      onClick={() => patchItem(i, x => ({ ...x, sets: n - 1, types: x.types?.slice(0, n - 1) }))}>−</button>
                    <b className="data">{n}</b>
                    <button aria-label="Une série de plus" disabled={n >= 12} onClick={() => patchItem(i, x => ({ ...x, sets: n + 1 }))}>+</button>
                  </div>
                </div>
                <ol className="plan-types">
                  {Array.from({ length: n }, (_, si) => (
                    <li key={si}>
                      <span className="data">Série {si + 1}</span>
                      <select value={it.types?.[si] ?? ''} aria-label={`Type de la série ${si + 1}`}
                        onChange={e => patchItem(i, x => {
                          const types = Array.from({ length: n }, (_, k) => x.types?.[k] ?? null)
                          types[si] = (e.target.value || null) as SetType | null
                          return types.some(Boolean) ? { ...x, types } : { ...x, types: undefined }
                        })}>
                        {SET_TYPES.map(t => <option key={t.label} value={t.id ?? ''}>{t.label}</option>)}
                      </select>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="row cur-tools">
              {it.group
                ? <button className="link" onClick={() => link(i, false)}>Ne plus enchaîner</button>
                : i < r.items.length - 1 && <button className="link" onClick={() => link(i, true)}>Enchaîner avec le suivant</button>}
              {ex && !ex.custom && <button className="link" onClick={() => setInfo(ex)}>Fiche</button>}
              <button className="link" onClick={() => patchItem(i, () => null)}>Retirer</button>
            </div>
          </section>
        )
      })}

      {!r.items.length && (
        <section className="card"><p className="sub">Ajoute les exercices de cette séance.</p></section>
      )}
      <button className="btn soft" onClick={() => setPicking(true)}>+ Ajouter un exercice</button>
      {r.items.length > 0 && !active && <button className="btn go" onClick={launch}>Commencer cette séance</button>}
      <div className="row cur-tools plan-tpl">
        {r.items.length > 0 && <button className="link" onClick={duplicate}>Dupliquer</button>}
        <button className="link" onClick={() => setDel(true)}>Supprimer la séance</button>
      </div>

      {info && <ExerciseSheet ex={info} onClose={() => setInfo(null)} />}
      {picking && (
        <ExercisePicker exercises={exercises} exclude={r.items.map(x => x.exerciseId)} onPick={add} onClose={() => setPicking(false)} />
      )}
      {del && (
        <ConfirmSheet danger title="Supprimer la séance ?" text={`« ${r.title} » sera retirée de tes séances. Les séances déjà faites ne changent pas.`}
          confirmLabel="Supprimer" onConfirm={async () => { setDel(false); onBack(); await db.templates.delete(r.id); toast('Séance supprimée') }}
          onClose={() => setDel(false)} />
      )}
    </div>
  )
}
