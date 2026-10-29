import type { Equipment, Exercise, Muscle } from './types'

const S = (id: string, name: string, group: string, equipment: Equipment, primary: Muscle[], secondary: Muscle[] = []): Exercise =>
  ({ id, name, kind: 'strength', group, equipment, primary, secondary })
const C = (id: string, name: string, primary: Muscle[], secondary: Muscle[] = []): Exercise =>
  ({ id, name, kind: 'cardio', group: 'Cardio', primary, secondary })

// Les identifiants sont enregistrés dans les séances : ne jamais en changer un
export const CATALOG: Exercise[] = [
  S('developpe-couche', 'Développé couché', 'Pectoraux', 'barbell', ['pecs'], ['delts', 'triceps']),
  S('developpe-couche-halteres', 'Développé couché haltères', 'Pectoraux', 'dumbbell', ['pecs'], ['delts', 'triceps']),
  S('developpe-incline-barre', 'Développé incliné barre', 'Pectoraux', 'barbell', ['pecs'], ['delts', 'triceps']),
  S('developpe-incline-halteres', 'Développé incliné haltères', 'Pectoraux', 'dumbbell', ['pecs'], ['delts', 'triceps']),
  S('presse-pectoraux', 'Presse pectoraux', 'Pectoraux', 'machine', ['pecs'], ['delts', 'triceps']),
  S('pec-deck', 'Pec deck', 'Pectoraux', 'machine', ['pecs'], ['delts']),
  S('ecartes-halteres', 'Écartés haltères', 'Pectoraux', 'dumbbell', ['pecs'], ['delts']),
  S('ecartes-poulie', 'Écartés poulie', 'Pectoraux', 'cable', ['pecs'], ['delts']),
  S('pompes', 'Pompes', 'Pectoraux', 'bodyweight', ['pecs'], ['delts', 'triceps', 'abs']),
  S('pompes-genoux', 'Pompes sur les genoux', 'Pectoraux', 'bodyweight', ['pecs'], ['delts', 'triceps']),
  S('pompes-inclinees', 'Pompes mains surélevées', 'Pectoraux', 'bodyweight', ['pecs'], ['delts', 'triceps']),
  S('dips', 'Dips', 'Pectoraux', 'bodyweight', ['triceps', 'pecs'], ['delts']),

  S('tractions', 'Tractions', 'Dos', 'bodyweight', ['lats'], ['biceps', 'traps', 'forearms']),
  S('tractions-assistees', 'Tractions assistées', 'Dos', 'machine', ['lats'], ['biceps', 'traps']),
  S('tirage-vertical', 'Tirage vertical', 'Dos', 'cable', ['lats'], ['biceps']),
  S('tirage-horizontal', 'Tirage horizontal', 'Dos', 'cable', ['lats', 'traps'], ['biceps', 'delts']),
  S('rowing-barre', 'Rowing barre', 'Dos', 'barbell', ['lats', 'traps'], ['biceps', 'lowback', 'delts']),
  S('rowing-haltere', 'Rowing haltère un bras', 'Dos', 'dumbbell', ['lats'], ['traps', 'biceps', 'delts']),
  S('rowing-machine', 'Rowing assis machine', 'Dos', 'machine', ['lats', 'traps'], ['biceps', 'delts']),
  S('rowing-inverse', 'Rowing inversé', 'Dos', 'bodyweight', ['lats', 'traps'], ['biceps', 'delts']),
  S('pull-over-poulie', 'Pull-over poulie', 'Dos', 'cable', ['lats'], ['triceps']),
  S('souleve-de-terre', 'Soulevé de terre', 'Dos', 'barbell', ['hams', 'glutes', 'lowback'], ['traps', 'forearms', 'quads']),
  S('extension-lombaires', 'Extension lombaire', 'Dos', 'bodyweight', ['lowback'], ['glutes', 'hams']),
  S('superman', 'Superman', 'Dos', 'bodyweight', ['lowback'], ['glutes', 'delts']),
  S('haussements-epaules', 'Haussements d’épaules', 'Dos', 'dumbbell', ['traps'], ['forearms']),

  S('squat', 'Squat', 'Jambes', 'barbell', ['quads', 'glutes'], ['hams', 'lowback']),
  S('squat-gobelet', 'Squat gobelet', 'Jambes', 'dumbbell', ['quads', 'glutes'], ['abs', 'hams']),
  S('squat-poids-du-corps', 'Squat poids du corps', 'Jambes', 'bodyweight', ['quads', 'glutes'], ['hams']),
  S('hack-squat', 'Hack squat', 'Jambes', 'machine', ['quads'], ['glutes']),
  S('presse-a-cuisses', 'Presse à cuisses', 'Jambes', 'machine', ['quads', 'glutes'], ['hams']),
  S('fentes', 'Fentes', 'Jambes', 'bodyweight', ['quads', 'glutes'], ['hams', 'calves']),
  S('fentes-bulgares', 'Fentes bulgares', 'Jambes', 'dumbbell', ['quads', 'glutes'], ['hams']),
  S('montees-banc', 'Montées sur banc', 'Jambes', 'dumbbell', ['quads', 'glutes'], ['hams', 'calves']),
  S('chaise', 'Chaise contre le mur', 'Jambes', 'bodyweight', ['quads'], ['glutes']),
  S('leg-extension', 'Leg extension', 'Jambes', 'machine', ['quads']),
  S('leg-curl', 'Leg curl', 'Jambes', 'machine', ['hams'], ['calves']),
  S('souleve-de-terre-roumain', 'Soulevé de terre roumain', 'Jambes', 'barbell', ['hams', 'glutes'], ['lowback', 'forearms']),
  S('hip-thrust', 'Hip thrust', 'Jambes', 'barbell', ['glutes'], ['hams']),
  S('pont-fessier', 'Pont fessier', 'Jambes', 'bodyweight', ['glutes'], ['hams']),
  S('abducteurs-machine', 'Abducteurs machine', 'Jambes', 'machine', ['glutes']),
  S('extension-hanche-poulie', 'Extension de hanche poulie', 'Jambes', 'cable', ['glutes'], ['hams']),
  S('mollets-debout', 'Mollets debout', 'Jambes', 'machine', ['calves']),
  S('mollets-assis', 'Mollets assis', 'Jambes', 'machine', ['calves']),

  S('developpe-militaire', 'Développé militaire', 'Épaules', 'barbell', ['delts'], ['triceps', 'traps']),
  S('developpe-epaules-halteres', 'Développé épaules haltères', 'Épaules', 'dumbbell', ['delts'], ['triceps', 'traps']),
  S('developpe-epaules-machine', 'Développé épaules machine', 'Épaules', 'machine', ['delts'], ['triceps']),
  S('elevations-laterales', 'Élévations latérales', 'Épaules', 'dumbbell', ['delts'], ['traps']),
  S('elevations-laterales-poulie', 'Élévations latérales poulie', 'Épaules', 'cable', ['delts'], ['traps']),
  S('elevations-frontales', 'Élévations frontales', 'Épaules', 'dumbbell', ['delts'], ['pecs']),
  S('oiseau', 'Oiseau', 'Épaules', 'dumbbell', ['delts'], ['traps']),
  S('oiseau-machine', 'Oiseau machine', 'Épaules', 'machine', ['delts'], ['traps']),
  S('face-pull', 'Face pull', 'Épaules', 'cable', ['delts', 'traps']),
  S('pompes-pike', 'Pompes piquées', 'Épaules', 'bodyweight', ['delts'], ['triceps', 'pecs']),

  S('curl-barre', 'Curl barre', 'Bras', 'barbell', ['biceps'], ['forearms']),
  S('curl-halteres', 'Curl haltères', 'Bras', 'dumbbell', ['biceps'], ['forearms']),
  S('curl-marteau', 'Curl marteau', 'Bras', 'dumbbell', ['biceps', 'forearms']),
  S('curl-pupitre', 'Curl pupitre', 'Bras', 'machine', ['biceps']),
  S('curl-poulie', 'Curl poulie', 'Bras', 'cable', ['biceps'], ['forearms']),
  S('extension-triceps-poulie', 'Extension triceps poulie', 'Bras', 'cable', ['triceps']),
  S('extension-triceps-haltere', 'Extension triceps haltère', 'Bras', 'dumbbell', ['triceps']),
  S('barre-au-front', 'Barre au front', 'Bras', 'barbell', ['triceps']),
  S('developpe-couche-serre', 'Développé couché prise serrée', 'Bras', 'barbell', ['triceps'], ['pecs', 'delts']),
  S('kickback-triceps', 'Kickback triceps', 'Bras', 'dumbbell', ['triceps']),
  S('dips-banc', 'Dips sur banc', 'Bras', 'bodyweight', ['triceps'], ['delts', 'pecs']),

  S('crunch', 'Crunch', 'Abdos', 'bodyweight', ['abs']),
  S('crunch-poulie', 'Crunch poulie', 'Abdos', 'cable', ['abs'], ['obliques']),
  S('gainage', 'Gainage', 'Abdos', 'bodyweight', ['abs', 'obliques'], ['lowback', 'delts']),
  S('gainage-lateral', 'Gainage latéral', 'Abdos', 'bodyweight', ['obliques'], ['abs', 'glutes']),
  S('releve-de-jambes', 'Relevé de jambes', 'Abdos', 'bodyweight', ['abs'], ['obliques']),
  S('dead-bug', 'Dead bug', 'Abdos', 'bodyweight', ['abs'], ['obliques']),
  S('mountain-climbers', 'Mountain climbers', 'Abdos', 'bodyweight', ['abs'], ['delts', 'quads']),
  S('rotations-russes', 'Rotations russes', 'Abdos', 'bodyweight', ['obliques'], ['abs']),
  S('roulette-abdos', 'Roulette abdominale', 'Abdos', 'bodyweight', ['abs'], ['lats', 'delts']),

  C('course', 'Course', ['quads', 'calves'], ['hams', 'glutes']),
  C('marche', 'Marche', ['quads', 'calves'], ['glutes']),
  C('velo', 'Vélo', ['quads'], ['glutes', 'calves', 'hams']),
  C('rameur', 'Rameur', ['lats', 'quads'], ['glutes', 'biceps', 'hams']),
  C('elliptique', 'Vélo elliptique', ['quads', 'glutes'], ['calves', 'hams']),
  C('corde-a-sauter', 'Corde à sauter', ['calves'], ['quads', 'delts']),
  C('natation', 'Natation', ['lats', 'delts'], ['triceps', 'abs']),
]

export const EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: 'machine', label: 'Machines' },
  { id: 'cable', label: 'Poulie' },
  { id: 'dumbbell', label: 'Haltères' },
  { id: 'barbell', label: 'Barre' },
  { id: 'bodyweight', label: 'Poids du corps' },
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
