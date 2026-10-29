// Dates au format AAAA-MM-JJ dans le fuseau local

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const today = () => iso(new Date())

export const parse = (s: string) => new Date(s + 'T12:00:00')

export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

// 0 = lundi … 6 = dimanche
export const weekday = (s: string) => (parse(s).getDay() + 6) % 7

export const weekStartOf = (s: string, start = 0) => addDays(s, -((weekday(s) - start + 7) % 7))

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

export const longDate = (s: string) => {
  const d = parse(s)
  return `${DAYS[weekday(s)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const fmtNum = (n: number) => String(+n.toFixed(2)).replace('.', ',')
// Groupé à la main : en français, le navigateur ne sépare pas les nombres à 4 chiffres (« 1260 »)
export const fmtThousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')

// « 1 séance », « 3 séances »
export const nb = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
