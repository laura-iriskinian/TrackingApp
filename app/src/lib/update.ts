import { registerSW } from 'virtual:pwa-register'

// Mise à jour automatique, comme pour Suivi sport : une app ajoutée à l'écran d'accueil reste souvent
// en mémoire et ne recharge jamais la page, donc on vérifie la version chaque fois qu'elle revient au premier plan.
// Quand une nouvelle version est trouvée, elle s'installe et la page se recharge toute seule.
// Pas de vérification pendant une séance, pour ne jamais recharger en pleine saisie.
export function autoUpdate() {
  let last = 0
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => {
        if (document.hidden || location.hash === '#seance' || !navigator.onLine) return
        if (Date.now() - last < 30_000) return
        last = Date.now()
        reg.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', check)
      addEventListener('pageshow', check)
      addEventListener('hashchange', check)
      setInterval(check, 15 * 60_000)
    },
  })
}
