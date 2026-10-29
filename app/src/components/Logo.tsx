// Logo provisoire : anneau de progression presque fermé, le point marque la prochaine répétition
const RING = 'M46.72 23.5 A17 17 0 1 1 26.19 16.03'

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d={RING} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="37.8" cy="16.03" r="3.6" fill="var(--effort)" />
    </svg>
  )
}
