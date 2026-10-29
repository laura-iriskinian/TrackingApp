import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { getProfile } from '../data/db'
import { programTags, rankPrograms } from '../data/programs'
import { ProgramView } from '../components/ProgramView'
import './Session.css'

// Programmes tout prêts, les plus adaptés au profil en premier
export function Programs({ onClose }: { onClose: () => void }) {
  const profile = useLiveQuery(getProfile)
  const [open, setOpen] = useState<string | null>(null)
  if (!profile) return null
  const list = rankPrograms({ goal: profile.goal, level: profile.level, place: profile.place })
  const program = list.find(p => p.id === open)

  if (program) {
    return (
      <div className="screen session">
        <header className="ses-bar"><button className="link" onClick={() => setOpen(null)}>‹ Programmes</button></header>
        <ProgramView program={program} onApplied={onClose} />
      </div>
    )
  }
  return (
    <div className="screen session">
      <header className="ses-bar"><button className="link" onClick={onClose}>‹ Retour</button></header>
      <div className="head">
        <h1>Programmes</h1>
        <span className="sub">Des séances toutes prêtes pour ta semaine. Choisis-en un, il remplit ton planning.</span>
      </div>
      {list.map(p => (
        <button key={p.id} className="card prog-card" onClick={() => setOpen(p.id)}>
          <span className="eyebrow">{programTags(p)}</span>
          <h2>{p.name}{profile.program === p.id && <span className="prog-on"> · suivi</span>}</h2>
          <span className="sub">{p.about}</span>
        </button>
      ))}
    </div>
  )
}
