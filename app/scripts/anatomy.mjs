// Extrait les tracés anatomiques de react-native-body-highlighter (MIT) vers un module de données NextRep.
// Lecture en texte seul : aucun code du paquet n'est exécuté, seules des chaînes de tracé SVG sont gardées.
import fs from 'node:fs'
const [dir, out] = process.argv.slice(2)
const SVG_PATH = /^[MmCcQqLlHhVvAaZzSsTt0-9.,\se-]+$/

const load = f => fs.readFileSync(`${dir}/dist/assets/${f}.js`, 'utf8').split('slug: "').slice(1).map(chunk => ({
  slug: chunk.slice(0, chunk.indexOf('"')),
  paths: [...chunk.matchAll(/"([Mm][^"]+)"/g)].map(m => m[1]).filter(d => SVG_PATH.test(d)),
}))

const outline = (f, side) => {
  const src = fs.readFileSync(`${dir}/dist/components/${f}.js`, 'utf8')
  const m = src.match(new RegExp(`side === "${side}" && \\(<react_native_svg_1\\.Path[^>]*? d="([^"]+)"`))
  const d = m[1].replace(/\s+/g, ' ').trim()
  if (!SVG_PATH.test(d)) throw new Error('contour inattendu')
  return d
}

const MAP = {
  chest: 'pecs', deltoids: 'delts', biceps: 'biceps', triceps: 'triceps', forearm: 'forearms', abs: 'abs', obliques: 'obliques',
  quadriceps: 'quads', calves: 'calves', trapezius: 'traps', 'upper-back': 'lats', 'lower-back': 'lowback', gluteal: 'glutes', hamstring: 'hams',
  adductors: '', tibialis: '', knees: '-', ankles: '-', feet: '-', hands: '-', head: '-', neck: '-', hair: '-',
}

const fig = (file, wrapper, side, viewBox) => {
  const g = new Map()
  for (const p of load(file)) {
    if (!(p.slug in MAP)) throw new Error('slug inconnu ' + p.slug)
    if (!p.paths.length) throw new Error('aucun tracé pour ' + p.slug)
    const k = MAP[p.slug]
    // tracés gardés séparés : certains commencent par « m » relatif et ne peuvent pas être mis bout à bout
    g.set(k, [...(g.get(k) ?? []), ...p.paths])
  }
  return { viewBox, outline: outline(wrapper, side), parts: [...g] }
}

const data = {
  h: { front: fig('bodyFront', 'SvgMaleWrapper', 'front', '0 0 724 1448'), back: fig('bodyBack', 'SvgMaleWrapper', 'back', '724 0 724 1448') },
  f: { front: fig('bodyFemaleFront', 'SvgFemaleWrapper', 'front', '-50 -40 734 1538'), back: fig('bodyFemaleBack', 'SvgFemaleWrapper', 'back', '756 0 774 1448') },
}

const head = `// Silhouettes anatomiques (face et dos, homme et femme).
// Tracés issus de react-native-body-highlighter 3.2.0, licence MIT, Copyright (c) 2022 ELABBASSI Hicham.
// Texte complet de la licence : app/licences/body-highlighter.txt
// Fichier généré par scripts/anatomy.mjs : ne pas modifier à la main.
// Clé de chaque partie : un muscle NextRep, '' pour un muscle non suivi, '-' pour le reste du corps.

export interface Figure { viewBox: string; outline: string; parts: [string, string[]][] }

export const ANATOMY: Record<'h' | 'f', Record<'front' | 'back', Figure>> = `
fs.writeFileSync(out, head + JSON.stringify(data) + '\n')
for (const [sex, v] of Object.entries(data)) for (const [side, f] of Object.entries(v)) console.log(sex, side, f.parts.map(p => p[0] || '·').join(' '))
