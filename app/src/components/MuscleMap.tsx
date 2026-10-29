import type { Muscle } from '../data/types'

// Formes du côté gauche du corps (viewBox 160 × 310), recopiées en miroir pour le côté droit.
// Chaîne commençant par C : cercle « cx cy r », par E : ellipse « cx cy rx ry », R : rectangle « x y w h ».
type Shape = string
const BASE_FRONT: Shape[] = ['C80 26 15', 'M73 40h14v12h-14z', 'E47 157 5 8', 'C70 219 4.5', 'M64 292L76 292Q79 300 72 302L60 302Q58 297 64 292Z', 'M66 141Q73 140 79 141L79 149Q72 146 64 149Z']
const BASE_BACK: Shape[] = ['C80 26 15', 'M73 40h14v8h-14z', 'E47 157 5 8', 'C70 219 4.5', 'M64 292L76 292Q79 300 72 302L60 302Q58 297 64 292Z']
const ARM = 'M46 81Q52 77 58 81L56 108Q50 112 45 108Q43 94 46 81Z'
const FOREARM = 'M44 115Q50 112 55 115L52 146Q48 149 44 146Q41 130 44 115Z'

const FRONT: Partial<Record<Muscle, Shape[]>> = {
  traps: ['M66 50Q72 46 77 46L77 51Q71 52 66 53Z'],
  delts: ['M50 58Q56 50 67 52L65 66Q57 71 48 76Q46 66 50 58Z'],
  pecs: ['M69 55Q76 53 79 55L79 80Q70 85 60 81Q55 74 61 64Q64 57 69 55Z'],
  biceps: [ARM],
  forearms: [FOREARM],
  obliques: ['M60 87Q65 86 68 89L68 128Q62 124 58 112Q57 98 60 87Z'],
  abs: ['R70.5 86 8.5 12', 'R70.5 100 8.5 12', 'R70.5 114 8.5 12', 'R70.5 128 8.5 11'],
  quads: ['M61 152Q70 147 78 152L77 210Q70 218 63 212Q56 184 61 152Z'],
  calves: ['M62 228Q68 224 76 228L74 284Q70 290 66 286Q60 256 62 228Z'],
}
const BACK: Partial<Record<Muscle, Shape[]>> = {
  traps: ['M80 42L80 96Q72 84 64 60Q62 52 68 48Q74 44 80 42Z'],
  delts: ['M50 58Q56 50 64 52L64 64Q57 70 48 76Q46 66 50 58Z'],
  lats: ['M59 70Q63 65 66 67Q70 84 79 99L79 121Q68 120 62 108Q56 90 59 70Z'],
  triceps: [ARM],
  forearms: [FOREARM],
  lowback: ['M67 123Q73 125 79 125L79 139L65 139Q65 130 67 123Z'],
  glutes: ['M60 142Q70 138 79 143L79 167Q70 173 61 167Q56 154 60 142Z'],
  hams: ['M61 173Q70 170 78 175L76 212Q70 218 63 212Q57 192 61 173Z'],
  calves: ['M61 226Q69 222 77 228Q78 254 72 272Q66 276 62 268Q58 246 61 226Z'],
}

function El({ s, cls }: { s: Shape; cls: string }) {
  const n = s.slice(1).split(' ').map(Number)
  if (s[0] === 'C') return <circle className={cls} cx={n[0]} cy={n[1]} r={n[2]} />
  if (s[0] === 'E') return <ellipse className={cls} cx={n[0]} cy={n[1]} rx={n[2]} ry={n[3]} />
  if (s[0] === 'R') return <rect className={cls} x={n[0]} y={n[1]} width={n[2]} height={n[3]} rx={3} />
  return <path className={cls} d={s} />
}

function Half({ view, primary, secondary }: { view: 'front' | 'back'; primary: Muscle[]; secondary: Muscle[] }) {
  const map = view === 'front' ? FRONT : BACK
  const base = view === 'front' ? BASE_FRONT : BASE_BACK
  return (
    <>
      {base.map((s, i) => <El key={'b' + i} s={s} cls="b" />)}
      {(Object.entries(map) as [Muscle, Shape[]][]).flatMap(([g, shapes]) =>
        shapes.map((s, i) => (
          <El key={g + i} s={s} cls={'m' + (primary.includes(g) ? ' p' : secondary.includes(g) ? ' s' : '')} />
        )))}
    </>
  )
}

interface Props {
  view: 'front' | 'back'
  primary?: Muscle[]
  secondary?: Muscle[]
  className?: string
  label?: string
}

export function MuscleMap({ view, primary = [], secondary = [], className, label }: Props) {
  return (
    <svg viewBox="40 6 80 300" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <g><Half view={view} primary={primary} secondary={secondary} /></g>
      <g transform="matrix(-1 0 0 1 160 0)"><Half view={view} primary={primary} secondary={secondary} /></g>
    </svg>
  )
}

// Choisit la vue (face ou dos) qui montre le plus de muscles principaux
export function bestView(primary: Muscle[]): 'front' | 'back' {
  const score = (m: Partial<Record<Muscle, Shape[]>>) => primary.filter(p => m[p]).length
  return score(BACK) > score(FRONT) ? 'back' : 'front'
}
