import type { PlaylistTreeDTO } from '../../api/types'
import { flattenTree } from '../../utils/tree'
import { Icon } from '../common/Icon'

interface Props {
  playlists: PlaylistTreeDTO[]
  selected: number | null | undefined
  onSelect: (id: number | null) => void
  /** Ids que não podem ser escolhidos (ex.: a própria playlist e descendentes). */
  disabledIds?: Set<number>
  /** Mostra a opção "Raiz da biblioteca" (id null). */
  allowRoot?: boolean
}

/** Lista as playlists em árvore (com recuo) para escolher uma. */
export function PlaylistPicker({ playlists, selected, onSelect, disabledIds, allowRoot }: Props) {
  const flat = flattenTree(playlists)
  return (
    <ul className="picker" role="listbox" aria-label="Playlists">
      {allowRoot && (
        <li>
          <button
            type="button"
            role="option"
            aria-selected={selected === null}
            className={`picker__item ${selected === null ? 'is-selected' : ''}`}
            onClick={() => onSelect(null)}
          >
            <Icon name="library" size={18} /> <em>Raiz da biblioteca</em>
          </button>
        </li>
      )}
      {flat.map(({ playlist, depth }) => {
        const disabled = disabledIds?.has(playlist.id)
        return (
          <li key={playlist.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected === playlist.id}
              disabled={disabled}
              className={`picker__item ${selected === playlist.id ? 'is-selected' : ''}`}
              style={{ paddingLeft: 12 + depth * 18 }}
              onClick={() => onSelect(playlist.id)}
            >
              <Icon name="folder" size={18} /> {playlist.name}
            </button>
          </li>
        )
      })}
      {!flat.length && !allowRoot && <li className="picker__empty">Nenhuma playlist nesta biblioteca.</li>}
    </ul>
  )
}
