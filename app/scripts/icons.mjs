// Génère les icônes PNG de l'app à partir de public/icon.svg (à relancer si le logo change)
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(new URL('../public/' + name, import.meta.url), png)
}
