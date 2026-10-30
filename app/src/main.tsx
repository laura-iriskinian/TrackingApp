import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initTheme } from './lib/theme'
import { autoUpdate } from './lib/update'
import { initAccount } from './lib/account'

initTheme()
autoUpdate()
initAccount().catch(() => {}) // sans réseau au démarrage : on réessaiera au retour de la connexion

// Demande au navigateur de ne pas effacer les données de l'app (Safari peut le faire sinon)
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
