export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

// Disques à mettre de chaque côté de la barre pour une charge totale. `rest` : ce qui ne peut pas être fait avec ces disques.
export function platesFor(total: number, bar: number, available: number[]): { side: number[]; rest: number } | null {
  if (total < bar) return null
  let left = Math.round(((total - bar) / 2) * 1000) / 1000
  const side: number[] = []
  for (const p of [...available].sort((a, b) => b - a)) {
    while (left >= p - 1e-9) { side.push(p); left = Math.round((left - p) * 1000) / 1000 }
  }
  return { side, rest: Math.round(left * 2 * 1000) / 1000 }
}
