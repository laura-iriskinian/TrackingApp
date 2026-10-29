import { useEffect } from 'react'
import { EQUIPMENT, MUSCLE_LABEL } from '../data/exercises'
import { GUIDES } from '../data/guides'
import type { Exercise } from '../data/types'
import { MuscleMap } from './MuscleMap'

const list = (m: string[]) => m.map(x => MUSCLE_LABEL[x as keyof typeof MUSCLE_LABEL]).join(', ')

// Fiche d'un exercice : muscles travaillés, comment le faire, erreurs fréquentes
export function ExerciseSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  const g = GUIDES[ex.id]
  const eq = EQUIPMENT.find(x => x.id === ex.equipment)?.label
  const hasMap = ex.primary.length + ex.secondary.length > 0
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="xs-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <div>
            <span className="eyebrow">{[ex.group, eq].filter(Boolean).join(' · ')}</span>
            <h2 id="xs-t">{ex.name}</h2>
          </div>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list guide">
          {hasMap && (
            <div className="guide-muscles">
              <div className="cur-figs">
                <MuscleMap view="front" primary={ex.primary} secondary={ex.secondary} className="cur-fig" />
                <MuscleMap view="back" primary={ex.primary} secondary={ex.secondary} className="cur-fig" />
              </div>
              <dl>
                {ex.primary.length > 0 && <><dt className="eyebrow">Muscles principaux</dt><dd>{list(ex.primary)}</dd></>}
                {ex.secondary.length > 0 && <><dt className="eyebrow">Aussi sollicités</dt><dd>{list(ex.secondary)}</dd></>}
              </dl>
            </div>
          )}
          {g ? (
            <>
              <section>
                <h3>Comment faire</h3>
                <ol>{g.how.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </section>
              <section>
                <h3>Erreurs fréquentes</h3>
                <ul>{g.mistakes.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </section>
              {g.tip && <p className="guide-tip">{g.tip}</p>}
            </>
          ) : (
            <p className="sub">{ex.custom ? 'Tu as créé cet exercice : il n’a pas de fiche.' : 'Pas encore de fiche pour cet exercice.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
