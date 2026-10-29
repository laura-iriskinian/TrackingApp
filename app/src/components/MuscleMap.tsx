import { useLiveQuery } from 'dexie-react-hooks'
import { getProfile } from '../data/db'
import type { Muscle } from '../data/types'
import { ANATOMY } from './anatomy'

interface Props {
  view: 'front' | 'back'
  primary?: Muscle[]
  secondary?: Muscle[]
  className?: string
  label?: string
}

// Silhouette anatomique grise, muscles principaux en orange vif, secondaires en orange clair.
// La silhouette (femme ou homme) suit le choix fait dans le profil.
export function MuscleMap({ view, primary = [], secondary = [], className, label }: Props) {
  const sex = useLiveQuery(async () => (await getProfile()).sex) === 'f' ? 'f' : 'h'
  const fig = ANATOMY[sex][view]
  const cls = (k: string) =>
    k === '-' ? 'b' : primary.includes(k as Muscle) ? 'm p' : secondary.includes(k as Muscle) ? 'm s' : 'm'
  return (
    <svg viewBox={fig.viewBox} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {fig.parts.map(([k, list]) => list.map((d, i) => <path key={k + i} className={cls(k)} d={d} />))}
      <path className="outline" d={fig.outline} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
