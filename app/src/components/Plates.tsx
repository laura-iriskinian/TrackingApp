import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { getProfile, saveProfile } from '../data/db'
import { fmtNum } from '../lib/dates'
import { ALL_PLATES, platesFor } from '../lib/plates'

const BARS = [0, 10, 15, 20]

// Calculateur de disques : quoi mettre de chaque côté de la barre pour une charge donnée
export function PlatesSheet({ weight, onClose }: { weight?: number; onClose: () => void }) {
  const profile = useLiveQuery(getProfile)
  const [total, setTotal] = useState(weight != null ? fmtNum(weight) : '')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  if (!profile) return null

  const n = parseFloat(total.replace(',', '.'))
  const r = Number.isFinite(n) ? platesFor(n, profile.barKg, profile.plates) : null
  const toggle = (p: number) => saveProfile({ plates: profile.plates.includes(p) ? profile.plates.filter(x => x !== p) : [...profile.plates, p] })
  const max = Math.max(...ALL_PLATES)

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="pl-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="pl-t">Disques</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list">
          <div className="field">
            <label htmlFor="pl-w">Charge totale (kg)</label>
            <input id="pl-w" className="input" inputMode="decimal" autoComplete="off" value={total} onChange={e => setTotal(e.target.value)} />
          </div>

          <div className="plates-out" aria-live="polite">
            {!Number.isFinite(n) ? <p className="sub">Indique une charge.</p>
              : !r ? <p className="sub">C'est moins que la barre seule ({fmtNum(profile.barKg)} kg).</p>
              : (
                <>
                  <span className="sub">De chaque côté</span>
                  {r.side.length ? (
                    <div className="plates-bar" role="img" aria-label={'Disques de chaque côté : ' + r.side.map(p => fmtNum(p) + ' kg').join(', ')}>
                      <i className="sleeve" />
                      {r.side.map((p, i) => <b key={i} style={{ height: 34 + (p / max) * 62 }}>{fmtNum(p)}</b>)}
                    </div>
                  ) : <p className="data">Aucun disque : la barre seule.</p>}
                  {r.side.length > 0 && <span className="data">{r.side.map(p => fmtNum(p)).join(' + ')} kg</span>}
                  {r.rest > 0 && <p className="sub">Il manque {fmtNum(r.rest)} kg avec tes disques : tu peux faire {fmtNum(n - r.rest)} kg.</p>}
                </>
              )}
          </div>

          <div className="field">
            <span className="sub" id="pl-b">Barre</span>
            <div className="seg" role="group" aria-labelledby="pl-b">
              {BARS.map(b => <button key={b} aria-pressed={profile.barKg === b} onClick={() => saveProfile({ barKg: b })}>{b ? b + ' kg' : 'Aucune'}</button>)}
            </div>
          </div>
          <div className="field">
            <span className="sub" id="pl-a">Disques disponibles</span>
            <div className="chips wrap" role="group" aria-labelledby="pl-a">
              {ALL_PLATES.map(p => <button key={p} aria-pressed={profile.plates.includes(p)} onClick={() => toggle(p)}>{fmtNum(p)} kg</button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
