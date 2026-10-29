import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { BASE_MEASURES, db, newId } from '../data/db'
import { slug } from '../data/exercises'
import type { MeasureKind } from '../data/types'
import { fmtNum, longDate, today } from '../lib/dates'
import { measureSeries } from '../lib/records'
import { LineChart } from '../components/LineChart'
import { ConfirmSheet, useToast } from '../components/ui'

const PREV_KEY = 'nextrep-body-prev'

// « −4,2 kg », « +1 cm », « stable »
const gap = (d: number, unit: string) => (d === 0 ? 'stable' : (d > 0 ? '+' : '−') + fmtNum(Math.abs(d)) + ' ' + unit)

const toNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : undefined
}

// Mesures du corps : poids, mensurations et mesures personnelles, avec une courbe par mesure
export function Body() {
  const custom = useLiveQuery(() => db.measureKinds.toArray()) ?? []
  const measures = useLiveQuery(() => db.measures.toArray())
  const kinds = [...BASE_MEASURES, ...custom]
  const [kind, setKind] = useState('weight')
  const [sheet, setSheet] = useState<'add' | 'kind' | 'del-kind' | null>(null)
  const toast = useToast()
  // L'écart avec la mesure d'avant est facultatif, l'écart depuis le début est toujours affiché
  const [showPrev, setShowPrev] = useState(() => { try { return localStorage.getItem(PREV_KEY) === '1' } catch { return false } })
  const togglePrev = () => {
    setShowPrev(!showPrev)
    try { localStorage.setItem(PREV_KEY, showPrev ? '0' : '1') } catch { /* stockage indisponible : réglage non retenu */ }
  }
  if (!measures) return null

  const k = kinds.find(x => x.id === kind) ?? kinds[0]
  const pts = measureSeries(measures, k.id)
  const first = pts[0], last = pts[pts.length - 1], prev = pts[pts.length - 2]
  const since = first && last && pts.length > 1 ? +(last.y - first.y).toFixed(1) : null
  const diff = last && prev ? +(last.y - prev.y).toFixed(1) : null

  const removeValue = async (date: string) => {
    const rows = measures.filter(m => m.date === date && m.values[k.id] != null)
    for (const m of rows) {
      const { [k.id]: _, ...values } = m.values
      if (Object.keys(values).length) await db.measures.put({ ...m, values, updatedAt: Date.now() })
      else await db.measures.delete(m.id)
    }
  }

  return (
    <>
      <div className="chips body-kinds" role="group" aria-label="Mesure">
        {kinds.map(x => <button key={x.id} aria-pressed={x.id === k.id} onClick={() => setKind(x.id)}>{x.name}</button>)}
        <button onClick={() => setSheet('kind')}>+ Autre</button>
      </div>

      <section className="card">
        <div className="body-head">
          <div>
            <span className="sub">{k.name}{last ? ' · ' + longDate(last.x).toLowerCase() : ''}</span>
            <span className="big">{last ? fmtNum(last.y) : '—'}<span className="unit">{k.unit}</span></span>
            {since != null && <span className="data"><b className="body-since">{gap(since, k.unit)}</b> depuis le début ({longDate(first.x).toLowerCase()})</span>}
            {showPrev && diff != null && <span className="data">{gap(diff, k.unit)} depuis la mesure d'avant</span>}
          </div>
        </div>
        <LineChart points={pts} unit={k.unit} label={`${k.name}, mesure par mesure`} />
        {pts.length > 1 && (
          <button className="link body-prev" aria-pressed={showPrev} onClick={togglePrev}>
            {showPrev ? 'Masquer l\'écart avec la mesure d\'avant' : 'Afficher l\'écart avec la mesure d\'avant'}
          </button>
        )}
        <button className="btn" onClick={() => setSheet('add')}>Noter une mesure</button>
      </section>

      {pts.length > 0 && (
        <section className="card">
          <h2>Dernières mesures</h2>
          <div className="list">
            {[...pts].reverse().slice(0, 10).map((p, i, list) => (
              <div key={p.x} className="li">
                <span>{longDate(p.x)}</span>
                <span className="m-val">
                  {showPrev && list[i + 1] && <span className="data">{gap(+(p.y - list[i + 1].y).toFixed(1), k.unit)}</span>}
                  <b className="data">{fmtNum(p.y)} {k.unit}</b>
                  <button className="link edit-del" aria-label={`Supprimer la mesure du ${longDate(p.x).toLowerCase()}`} onClick={() => removeValue(p.x)}>×</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {custom.some(c => c.id === k.id) && (
        <button className="link danger-link" onClick={() => setSheet('del-kind')}>Supprimer la mesure « {k.name} »</button>
      )}

      {sheet === 'add' && <AddMeasure kinds={kinds} first={k.id} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); toast('Mesure enregistrée') }} />}
      {sheet === 'kind' && <NewKind onClose={() => setSheet(null)} onCreated={id => { setSheet(null); setKind(id) }} />}
      {sheet === 'del-kind' && (
        <ConfirmSheet danger title={`Supprimer « ${k.name} » ?`} text="Cette mesure et toutes ses valeurs seront effacées." confirmLabel="Supprimer"
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            for (const p of pts) await removeValue(p.x)
            await db.measureKinds.delete(k.id)
            setKind('weight'); setSheet(null)
          }} />
      )}
    </>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
}

// Saisie d'une ou plusieurs mesures à une date. Une seule ligne par jour : les valeurs du même jour sont complétées.
function AddMeasure({ kinds, first, onClose, onSaved }: { kinds: MeasureKind[]; first: string; onClose: () => void; onSaved: () => void }) {
  useEscape(onClose)
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Record<string, string>>({})
  const ordered = [...kinds.filter(k => k.id === first), ...kinds.filter(k => k.id !== first)]
  const values = Object.fromEntries(Object.entries(vals).flatMap(([k, v]) => (toNum(v) != null ? [[k, toNum(v)!]] : [])))
  const save = async () => {
    const same = await db.measures.where('date').equals(date).first()
    if (same) await db.measures.put({ ...same, values: { ...same.values, ...values }, updatedAt: Date.now() })
    else await db.measures.add({ id: newId(), date, values, updatedAt: Date.now() })
    onSaved()
  }
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="am-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="am-t">Noter une mesure</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list">
          <div className="field">
            <label htmlFor="am-d">Date</label>
            <input id="am-d" className="input" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <p className="sub">Remplis seulement ce que tu as mesuré.</p>
          <div className="measure-grid">
            {ordered.map((k, i) => (
              <div key={k.id} className="field">
                <label htmlFor={'am-' + k.id}>{k.name} ({k.unit})</label>
                <input id={'am-' + k.id} className="input" inputMode="decimal" autoComplete="off" autoFocus={i === 0}
                  value={vals[k.id] ?? ''} onChange={e => setVals(v => ({ ...v, [k.id]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
        <button className="btn" disabled={!date || !Object.keys(values).length} onClick={save}>Enregistrer</button>
      </div>
    </div>
  )
}

function NewKind({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  useEscape(onClose)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<'cm' | 'kg'>('cm')
  const create = async () => {
    const n = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    const id = 'perso-' + (slug(n) || newId().slice(0, 8))
    await db.measureKinds.put({ id, name: n, unit })
    onCreated(id)
  }
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="nk-t" onClick={e => e.stopPropagation()}>
        <h2 id="nk-t">Nouvelle mesure</h2>
        <div className="field">
          <label htmlFor="nk-n">Nom</label>
          <input id="nk-n" className="input" autoFocus maxLength={40} placeholder="Ex. Mollet" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="seg" role="group" aria-label="Unité">
          {(['cm', 'kg'] as const).map(u => <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)}>{u}</button>)}
        </div>
        <button className="btn" disabled={!name.trim()} onClick={create}>Créer</button>
        <button className="btn soft" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}
