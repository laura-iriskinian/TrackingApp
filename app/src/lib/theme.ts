import { THEME_KEY } from '../config'

export type Theme = 'light' | 'dark' | 'auto'

export function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.dataset.theme = t
  try {
    if (t === 'auto') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, t)
  } catch { /* stockage indisponible : le thème vaut pour cette visite seulement */ }
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0C0F' : '#F4F5F7')
}

export function initTheme() {
  let t: Theme = 'auto'
  try { t = (localStorage.getItem(THEME_KEY) as Theme) || 'auto' } catch { /* idem */ }
  applyTheme(t)
}
