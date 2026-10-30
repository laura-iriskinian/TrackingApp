import { hasParts, nextPart, partName } from '../data/sets'
import type { SetPart, SetType } from '../data/types'
import { fmtNum } from '../lib/dates'

// Les champs restent en texte pendant la saisie, pour accepter « 62, » le temps de taper « 62,5 »
export interface PartRow { weight: string; reps: string }

const toNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
const toRow = (p: SetPart): PartRow => ({ weight: p.weight != null ? fmtNum(p.weight) : '', reps: p.reps != null ? fmtNum(p.reps) : '' })

// Lignes à afficher pour un type de série : celles déjà notées, sinon une première ligne à remplir
export function partRows(type: SetType | undefined, parts: SetPart[] | undefined, start: SetPart): PartRow[] {
  if (!hasParts(type)) return []
  return parts?.length ? parts.map(toRow) : [toRow(nextPart(type, start))]
}

// Seules les lignes avec des répétitions sont gardées
export const rowsToParts = (rows: PartRow[]): SetPart[] => rows.flatMap(r => {
  const weight = toNum(r.weight), reps = toNum(r.reps)
  return reps == null ? [] : [weight != null ? { weight, reps } : { reps }]
})

// Paliers d'une série dégressive, ou reprises d'une série rest-pause (après la première, saisie à part)
export function SetParts({ type, rows, start, onChange }: {
  type: SetType | undefined; rows: PartRow[]; start: SetPart; onChange: (rows: PartRow[]) => void
}) {
  const name = partName(type)
  const withWeight = type === 'drop'
  const patch = (i: number, p: Partial<PartRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const add = () => {
    const last = rows[rows.length - 1]
    onChange([...rows, toRow(nextPart(type, last ? { weight: toNum(last.weight), reps: toNum(last.reps) } : start))])
  }
  return (
    <div className="parts">
      {rows.map((r, i) => (
        <div key={i} className={'part' + (withWeight ? '' : ' one')}>
          <span className="data">{name} {i + 2}</span>
          {withWeight && (
            <label className="edit-cell">
              <input inputMode="decimal" autoComplete="off" placeholder="—" value={r.weight} aria-label={`${name} ${i + 2}, charge en kg`}
                onChange={e => patch(i, { weight: e.target.value })} />
              <span className="data">kg</span>
            </label>
          )}
          <label className="edit-cell">
            <input inputMode="decimal" autoComplete="off" placeholder="—" value={r.reps} aria-label={`${name} ${i + 2}, répétitions`}
              onChange={e => patch(i, { reps: e.target.value })} />
            <span className="data">rép.</span>
          </label>
          <button className="link edit-del" aria-label={`Retirer : ${name.toLowerCase()} ${i + 2}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="link part-add" onClick={add}>+ {name}</button>
    </div>
  )
}
