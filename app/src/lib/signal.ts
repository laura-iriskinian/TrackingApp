// Signal de fin de repos : un bip court et une vibration (Android).
// Safari n'autorise le son qu'après un geste de l'utilisateur, d'où unlockAudio() appelé au clic.

let ctx: AudioContext | undefined

export function unlockAudio() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* pas de son disponible */ }
}

export function beep(freq: number, at: number, dur: number) {
  if (!ctx) return
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(.3, t + .01)
  g.gain.linearRampToValueAtTime(0, t + dur)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + dur + .02)
}

export function restOver() {
  try { beep(880, 0, .12); beep(880, .18, .12); beep(1320, .36, .3) } catch { /* ignoré */ }
  try { navigator.vibrate?.([120, 80, 120, 80, 260]) } catch { /* ignoré */ }
}

// Garde l'écran allumé pendant la séance, quand le navigateur le permet
export async function keepAwake(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen')
    return () => { lock?.release().catch(() => {}) }
  } catch {
    return () => {}
  }
}
