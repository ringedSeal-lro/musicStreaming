import { useState } from 'react'
import { api, errorText } from '../../api/client'
import type { PlaylistTreeDTO, SongDTO } from '../../api/types'
import { plural } from '../../utils/format'
import { Modal } from '../common/Modal'
import { PlaylistPicker } from './PlaylistPicker'

interface Props {
  songs: SongDTO[]
  libraryId: number
  roots: PlaylistTreeDTO[]
  onDone: (playlistName: string) => Promise<void>
  onClose: () => void
}

/** POST /playlists/{id}/songs. Também permite criar uma playlist nova e adicionar nela. */
export function AddToPlaylistDialog({ songs, libraryId, roots, onDone, onClose }: Props) {
  const [target, setTarget] = useState<number | null>()
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const creating = target === null

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      let id = target
      let name = ''
      if (creating) {
        const created = await api.libraries.createPlaylist(libraryId, { name: newName.trim() })
        id = created.id
        name = created.name
      } else {
        name = findName(roots, target!) ?? ''
      }
      await api.playlists.addSongs(id!, songs.map((s) => s.id))
      await onDone(name)
      onClose()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  const title = songs.length === 1 ? `Adicionar "${songs[0].title}"` : `Adicionar ${plural(songs.length, 'música', 'músicas')}`

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn--primary"
            onClick={submit}
            disabled={busy || target === undefined || (creating && !newName.trim())}
          >
            {busy ? 'Adicionando…' : 'Adicionar'}
          </button>
        </>
      }
    >
      <button
        type="button"
        className={`picker__item picker__item--new ${creating ? 'is-selected' : ''}`}
        onClick={() => setTarget(null)}
      >
        + Nova playlist
      </button>
      {creating && (
        <label className="field">
          <span>Nome da nova playlist</span>
          <input value={newName} maxLength={200} autoFocus onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      <PlaylistPicker playlists={roots} selected={target} onSelect={(id) => id != null && setTarget(id)} />
      {error && <p className="form__error" role="alert">{error}</p>}
    </Modal>
  )
}

function findName(nodes: PlaylistTreeDTO[], id: number): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.name
    const inner = findName(n.children, id)
    if (inner) return inner
  }
  return undefined
}
