import { useEffect, useState, type ReactNode } from 'react'
import { Home } from './screens/Home'
import { Workouts } from './screens/Workouts'
import { Progress } from './screens/Progress'
import { Profile } from './screens/Profile'
import { Session } from './screens/Session'
import { WorkoutEdit } from './screens/WorkoutEdit'
import { Planning } from './screens/Planning'
import { Timer } from './screens/Timer'
import { backTo } from './lib/nav'
import { ToastProvider } from './components/ui'

const TABS = [
  { id: 'accueil', label: 'Accueil', icon: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />, Screen: Home },
  { id: 'seances', label: 'Séances', icon: <path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" />, Screen: Workouts },
  { id: 'progres', label: 'Progrès', icon: <path d="M4 18l5-6 4 3 7-9" />, Screen: Progress },
  { id: 'profil', label: 'Profil', icon: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>, Screen: Profile },
] as const

type TabId = (typeof TABS)[number]['id'] | 'seance' | 'planning' | 'chrono' | `seance-passee${string}`
const FULL = ['seance', 'planning', 'chrono']
const fromHash = (): TabId => {
  const h = location.hash.slice(1)
  if (FULL.includes(h) || h === 'seance-passee' || h.startsWith('seance-passee/')) return h as TabId
  return TABS.find(t => t.id === h)?.id ?? 'accueil'
}

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash)

  useEffect(() => {
    const onHash = () => setTab(fromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const go = (id: TabId) => {
    history.replaceState(null, '', '#' + id)
    setTab(id)
    scrollTo(0, 0)
  }

  const full = (node: ReactNode) => <ToastProvider><main>{node}</main></ToastProvider>
  if (tab === 'seance') return full(<Session onClose={() => go('accueil')} />)
  if (tab === 'planning') return full(<Planning onClose={() => go(backTo('accueil') as TabId)} />)
  if (tab === 'chrono') return full(<Timer onClose={() => go(backTo('seances') as TabId)} />)
  if (tab.startsWith('seance-passee')) return full(<WorkoutEdit key={tab} id={tab.split('/')[1]} onClose={() => go('seances')} />)

  const { Screen } = TABS.find(t => t.id === tab)!
  return (
    <ToastProvider>
      <main><Screen /></main>
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(t => (
          <button key={t.id} aria-current={t.id === tab ? 'page' : undefined} onClick={() => go(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            {t.label}
            <i />
          </button>
        ))}
      </nav>
    </ToastProvider>
  )
}
