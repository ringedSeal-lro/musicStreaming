import { useState } from 'react'
import { api, errorText } from '../../api/client'
import type { PlaylistTreeDTO } from '../../api/types'
import { subtreeIds } from '../../utils/tree'
import { Modal } from '../common/Modal'
import { PlaylistPicker } from './PlaylistPicker'

interface Props {
  playlist: PlaylistTreeDTO
  roots: PlaylistTreeDTO[]
  onDone: () => Promise<void>
  onClose: () => void
}

/** PATCH /playlists/{id} com parentId (null = raiz). O back-end recusa ciclos com 409. */
export function MovePlaylistDialog({ playlist, roots, onDone, onClose }: Props) {
  const [target, setTarget] = useState<number | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blocked = subtreeIds(playlist)
  const unchanged = target === undefined || target === playlist.parentId

  const submit = async () => {
    if (target === undefined) return
    setBusy(true)
    setError(null)
    try {
      await api.playlists.update(playlist.id, { parentId: target })
      await onDone()
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Mover "${playlist.name}"`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={submit} disabled={busy || unchanged}>
            {busy ? 'Movendo…' : 'Mover'}
          </button>
        </>
      }
    >
      <p className="modal__text">Escolha para onde mover. Ela vai para o fim da lista do destino.</p>
      <PlaylistPicker playlists={roots} selected={target} onSelect={setTarget} disabledIds={blocked} allowRoot />
      {error && <p className="form__error" role="alert">{error}</p>}
    </Modal>
  )
}
