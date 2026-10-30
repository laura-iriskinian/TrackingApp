import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, newId } from '../data/db'
import type { Photo } from '../data/types'
import { longDate, today } from '../lib/dates'
import { ConfirmSheet, useToast } from '../components/ui'

const POSES: { id: Photo['pose']; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'profil', label: 'Profil' },
  { id: 'dos', label: 'Dos' },
]
const MAX_SIDE = 1600

// Réduit la photo avant de l'enregistrer : une photo de téléphone pèse souvent plus de 3 Mo
async function shrink(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * k)
    canvas.height = Math.round(img.height * k)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', .85))
    return blob ?? file
  } catch {
    return file
  }
}

function useUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function Img({ photo, className }: { photo: Photo; className?: string }) {
  const url = useUrl(photo.blob)
  return url ? <img src={url} alt={`Photo de ${POSES.find(p => p.id === photo.pose)?.label.toLowerCase()}, ${longDate(photo.date).toLowerCase()}`} className={className} /> : <span className={className} />
}

// Photos de progression : privées, sur ce téléphone seulement, avec une comparaison avant / après
export function Photos() {
  const photos = useLiveQuery(() => db.photos.orderBy('date').toArray())
  const [pose, setPose] = useState<Photo['pose']>('face')
  const [date, setDate] = useState(today())
  const [before, setBefore] = useState<string>()
  const [after, setAfter] = useState<string>()
  const [open, setOpen] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  if (!photos) return null

  const list = photos.filter(p => p.pose === pose)
  const a = list.find(p => p.id === before) ?? list[0]
  const b = list.find(p => p.id === after) ?? list[list.length - 1]

  const add = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Ce fichier n’est pas une photo.'); return }
    setBusy(true)
    try {
      await db.photos.add({ id: newId(), date, pose, blob: await shrink(file), updatedAt: Date.now() })
      setAfter(undefined)
      toast('Photo enregistrée sur ce téléphone')
    } catch {
      toast('La photo n’a pas pu être enregistrée. Le téléphone manque peut-être de place.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="seg" role="group" aria-label="Pose">
        {POSES.map(p => <button key={p.id} aria-pressed={pose === p.id} onClick={() => { setPose(p.id); setBefore(undefined); setAfter(undefined) }}>{p.label}</button>)}
      </div>

      {list.length >= 2 && a && b && (
        <section className="card">
          <h2>Avant, après</h2>
          <div className="ph-compare">
            {[[a, setBefore, 'Avant'], [b, setAfter, 'Après']].map(([p, set, label]) => (
              <figure key={label as string}>
                <Img photo={p as Photo} className="ph-big" />
                <select aria-label={`Photo ${(label as string).toLowerCase()}`} value={(p as Photo).id} onChange={e => (set as (v: string) => void)(e.target.value)}>
                  {list.map(x => <option key={x.id} value={x.id}>{longDate(x.date)}</option>)}
                </select>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Ajouter une photo</h2>
        <div className="field">
          <label htmlFor="ph-d">Date</label>
          <input id="ph-d" className="input" type="date" max={today()} value={date} onChange={e => setDate(e.target.value || today())} />
        </div>
        <label className={'btn file-btn' + (busy ? ' is-busy' : '')}>
          {busy ? 'Enregistrement…' : `Prendre ou choisir une photo (${POSES.find(p => p.id === pose)!.label.toLowerCase()})`}
          <input type="file" accept="image/*" disabled={busy} onChange={e => { add(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <p className="data">
          Tes photos restent sur ce téléphone. Elles ne sont ni envoyées sur internet, ni synchronisées, ni incluses dans la sauvegarde exportée.
          Pour mieux comparer : même endroit, même lumière, même heure.
        </p>
      </section>

      {list.length > 0 && (
        <section className="card">
          <h2>Toutes les photos</h2>
          <div className="ph-grid">
            {[...list].reverse().map(p => (
              <button key={p.id} className="ph-thumb" onClick={() => setOpen(p)} aria-label={`Ouvrir la photo du ${longDate(p.date).toLowerCase()}`}>
                <Img photo={p} />
                <span className="data">{longDate(p.date).split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {open && <Viewer photo={open} onClose={() => setOpen(null)} />}
      <style>{'.file-btn{position:relative;text-align:center;cursor:pointer}.file-btn input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.file-btn:focus-within{outline:2px solid var(--effort);outline-offset:3px}'}</style>
    </>
  )
}

function Viewer({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const [del, setDel] = useState(false)
  const toast = useToast()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  // Copie volontaire, par exemple dans la galerie du téléphone : c'est l'utilisateur qui choisit où elle va
  const save = async () => {
    const file = new File([photo.blob], `progression-${photo.date}-${photo.pose}.jpg`, { type: photo.blob.type || 'image/jpeg' })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet picker" role="dialog" aria-modal="true" aria-labelledby="pv-t" onClick={e => e.stopPropagation()}>
        <div className="picker-head">
          <h2 id="pv-t">{longDate(photo.date)}</h2>
          <button className="link" onClick={onClose}>Fermer</button>
        </div>
        <div className="picker-list"><Img photo={photo} className="ph-view" /></div>
        <div className="row">
          <button className="btn soft" onClick={save}>Enregistrer une copie</button>
          <button className="btn danger" onClick={() => setDel(true)}>Supprimer</button>
        </div>
      </div>
      {del && (
        <ConfirmSheet danger title="Supprimer cette photo ?" text="Elle sera effacée de ce téléphone. C'est définitif." confirmLabel="Supprimer"
          onClose={() => setDel(false)} onConfirm={async () => { await db.photos.delete(photo.id); toast('Photo supprimée'); onClose() }} />
      )}
    </div>
  )
}
