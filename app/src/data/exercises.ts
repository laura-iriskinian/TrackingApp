import type { Exercise, Muscle } from './types'

const S = (id: string, name: string, group: string, primary: Muscle[], secondary: Muscle[] = []): Exercise =>
  ({ id, name, kind: 'strength', group, primary, secondary })

export const CATALOG: Exercise[] = [
  S('developpe-couche', 'Développé couché', 'Pectoraux', ['pecs'], ['delts', 'triceps']),
  S('developpe-incline-halteres', 'Développé incliné haltères', 'Pectoraux', ['pecs'], ['delts', 'triceps']),
  S('pompes', 'Pompes', 'Pectoraux', ['pecs'], ['delts', 'triceps', 'abs']),
  S('ecartes-poulie', 'Écartés poulie', 'Pectoraux', ['pecs'], ['delts']),
  S('dips', 'Dips', 'Pectoraux', ['triceps', 'pecs'], ['delts']),
  S('tractions', 'Tractions', 'Dos', ['lats'], ['biceps', 'traps', 'forearms']),
  S('rowing-barre', 'Rowing barre', 'Dos', ['lats', 'traps'], ['biceps', 'lowback', 'delts']),
  S('tirage-vertical', 'Tirage vertical', 'Dos', ['lats'], ['biceps']),
  S('tirage-horizontal', 'Tirage horizontal', 'Dos', ['lats', 'traps'], ['biceps', 'delts']),
  S('souleve-de-terre', 'Soulevé de terre', 'Dos', ['hams', 'glutes', 'lowback'], ['traps', 'forearms', 'quads']),
  S('squat', 'Squat', 'Jambes', ['quads', 'glutes'], ['hams', 'lowback']),
  S('presse-a-cuisses', 'Presse à cuisses', 'Jambes', ['quads', 'glutes'], ['hams']),
  S('fentes', 'Fentes', 'Jambes', ['quads', 'glutes'], ['hams', 'calves']),
  S('leg-extension', 'Leg extension', 'Jambes', ['quads']),
  S('leg-curl', 'Leg curl', 'Jambes', ['hams'], ['calves']),
  S('hip-thrust', 'Hip thrust', 'Jambes', ['glutes'], ['hams']),
  S('mollets-debout', 'Mollets debout', 'Jambes', ['calves']),
  S('developpe-militaire', 'Développé militaire', 'Épaules', ['delts'], ['triceps', 'traps']),
  S('elevations-laterales', 'Élévations latérales', 'Épaules', ['delts'], ['traps']),
  S('oiseau', 'Oiseau', 'Épaules', ['delts'], ['traps']),
  S('face-pull', 'Face pull', 'Épaules', ['delts', 'traps']),
  S('curl-barre', 'Curl barre', 'Bras', ['biceps'], ['forearms']),
  S('curl-marteau', 'Curl marteau', 'Bras', ['biceps', 'forearms']),
  S('extension-triceps-poulie', 'Extension triceps poulie', 'Bras', ['triceps']),
  S('barre-au-front', 'Barre au front', 'Bras', ['triceps']),
  S('crunch', 'Crunch', 'Abdos', ['abs']),
  S('gainage', 'Gainage', 'Abdos', ['abs', 'obliques'], ['lowback', 'delts']),
  S('releve-de-jambes', 'Relevé de jambes', 'Abdos', ['abs'], ['obliques']),
  { id: 'course', name: 'Course', kind: 'cardio', group: 'Cardio', primary: ['quads', 'calves'], secondary: ['hams', 'glutes'] },
  { id: 'marche', name: 'Marche', kind: 'cardio', group: 'Cardio', primary: ['quads', 'calves'], secondary: ['glutes'] },
]

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pecs: 'pectoraux', delts: 'épaules', biceps: 'biceps', triceps: 'triceps', forearms: 'avant-bras',
  abs: 'abdominaux', obliques: 'obliques', quads: 'quadriceps', calves: 'mollets', traps: 'trapèzes',
  lats: 'grand dorsal', lowback: 'lombaires', glutes: 'fessiers', hams: 'ischio-jambiers',
}

export const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

export const slug = (t: string) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function findByName(name: string, extra: Exercise[] = []): Exercise | undefined {
  const n = norm(name)
  return [...CATALOG, ...extra].find(e => norm(e.name) === n)
}
