// Écrans en plein écran, sans barre d'onglets. On retient d'où on vient pour y revenir en fermant.
let from = ''
const open = (hash: string) => {
  from = location.hash.slice(1)
  location.hash = hash
}
export const backTo = (fallback: string) => (from && from !== location.hash.slice(1) ? from : fallback)

export const openSession = () => open('#seance')
// Modification d'une séance passée, ou ajout d'une séance après coup (sans id)
export const openWorkoutEdit = (id?: string) => open('#seance-passee' + (id ? '/' + id : ''))
export const openPlanning = () => open('#planning')
export const openTimer = () => open('#chrono')
export const openExercises = () => open('#exercices')
export const openPrograms = () => open('#programmes')
