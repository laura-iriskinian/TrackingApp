import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// Message bref en bas de l'écran
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2400)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  )
}

// Feuille de confirmation, à la place des fenêtres natives du navigateur
interface ConfirmProps {
  title: string
  text: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmSheet({ title, text, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t" onClick={e => e.stopPropagation()}>
        <h2 id="sheet-t">{title}</h2>
        <p>{text}</p>
        <button className={'btn' + (danger ? ' danger' : '')} disabled={busy} autoFocus
          onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }}>
          {confirmLabel}
        </button>
        <button className="btn soft" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}
