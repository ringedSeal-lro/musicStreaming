import { useMemo, useState, type DragEvent, type MouseEvent } from 'react'
import type { SongDTO } from '../../api/types'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useRoute } from '../../hooks/useRoute'
import { useActions } from '../../state/actions'
import { usePlayer } from '../../state/PlayerContext'
import { formatDuration } from '../../utils/format'
import { Icon } from '../common/Icon'
import { SONG_DRAG_TYPE } from '../playlists/PlaylistTree'

type SortKey = 'position' | 'title' | 'artist' | 'album' | 'duration'

interface Props {
  songs: SongDTO[]
  /** Playlist exibida: habilita "remover desta playlist" e reordenar. */
  playlistId?: number
  /** Rótulo da ordem original (ex.: "Ordem da playlist", "Relevância"). */
  defaultOrderLabel?: string
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

function sortSongs(songs: SongDTO[], key: SortKey, desc: boolean): SongDTO[] {
  if (key === 'position') return songs
  const value = (s: SongDTO) =>
    key === 'title' ? s.title : key === 'artist' ? s.artist ?? '' : key === 'album' ? s.album ?? '' : ''
  const sorted = [...songs].sort((a, b) =>
    key === 'duration' ? (a.durationSec ?? 0) - (b.durationSec ?? 0) : collator.compare(value(a), value(b)),
  )
  return desc ? sorted.reverse() : sorted
}

export function SongTable({ songs, playlistId, defaultOrderLabel = 'Ordem original' }: Props) {
  const isMobile = useIsMobile()
  const player = usePlayer()
  const actions = useActions()
  const [, navigate] = useRoute()
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'position', desc: false })
  const rows = useMemo(() => sortSongs(songs, sort.key, sort.desc), [songs, sort])
  const canReorder = sort.key === 'position'

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key !== key ? { key, desc: false } : s.desc ? { key: 'position', desc: false } : { key, desc: true }))

  const ctx = (index: number) => ({ playlistId, list: rows, index, canReorder })

  const openMenu = (e: MouseEvent, song: SongDTO, index: number, fromButton = false) => {
    e.preventDefault()
    e.stopPropagation()
    if (fromButton) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      actions.openSongMenu(song, rect.right - 8, rect.bottom, ctx(index))
    } else {
      actions.openSongMenu(song, e.clientX, e.clientY, ctx(index))
    }
  }

  const onDragStart = (e: DragEvent, song: SongDTO) => {
    e.dataTransfer.setData(SONG_DRAG_TYPE, JSON.stringify([song.id]))
    e.dataTransfer.setData('text/plain', song.title)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const header = (key: SortKey, label: string, className = '') => (
    <button
      className={`songs__sort ${className} ${sort.key === key ? 'is-active' : ''}`}
      onClick={() => sortBy(key)}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {sort.key === key && <Icon name={sort.desc ? 'down' : 'up'} size={14} />}
    </button>
  )

  return (
    <div className="songs" role="table" aria-label="Músicas" aria-rowcount={rows.length}>
      {!isMobile && (
        <div className="songs__head" role="row">
          <span className="songs__num">
            <button
              className={`songs__sort ${sort.key === 'position' ? 'is-active' : ''}`}
              title={defaultOrderLabel}
              aria-label={defaultOrderLabel}
              onClick={() => setSort({ key: 'position', desc: false })}
            >
              #
            </button>
          </span>
          {header('title', 'Título')}
          {header('artist', 'Artista', 'songs__col-artist')}
          {header('album', 'Álbum', 'songs__col-album')}
          <span className="songs__col-tags">Tags</span>
          <span />
          {header('duration', 'Duração', 'songs__col-dur')}
          <span />
        </div>
      )}

      {rows.map((song, index) => {
        const isCurrent = player.current?.id === song.id
        const isPlayingNow = isCurrent && player.playing
        const play = () => {
          if (!song.available) return
          if (isCurrent) player.toggle()
          else player.playList(rows, index)
        }
        return (
          <div
            key={song.id}
            role="row"
            tabIndex={0}
            className={`songs__row ${isCurrent ? 'is-current' : ''} ${song.available ? '' : 'is-unavailable'}`}
            draggable={!isMobile}
            onDragStart={(e) => onDragStart(e, song)}
            onDoubleClick={isMobile ? undefined : play}
            onClick={isMobile ? play : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') play()
              if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                const rect = e.currentTarget.getBoundingClientRect()
                actions.openSongMenu(song, rect.left + 40, rect.bottom, ctx(index))
              }
            }}
            onContextMenu={(e) => openMenu(e, song, index)}
            title={song.available ? undefined : 'Arquivo não encontrado no disco'}
          >
            {!isMobile && (
              <span className="songs__num">
                <span className="songs__index">{isPlayingNow ? <span className="eq" aria-label="Tocando" /> : index + 1}</span>
                <button
                  className="songs__play"
                  aria-label={isPlayingNow ? `Pausar ${song.title}` : `Tocar ${song.title}`}
                  disabled={!song.available}
                  onClick={(e) => {
                    e.stopPropagation()
                    play()
                  }}
                >
                  <Icon name={isPlayingNow ? 'pause' : 'play'} size={16} />
                </button>
              </span>
            )}
            <span className="songs__title">
              <span className="songs__name">{song.title}</span>
              <span className="songs__artist">{song.artist ?? 'Artista desconhecido'}</span>
            </span>
            {!isMobile && <span className="songs__col-artist truncate">{song.artist ?? '—'}</span>}
            {!isMobile && <span className="songs__col-album truncate">{song.album ?? '—'}</span>}
            {!isMobile && (
              <span className="songs__col-tags chips">
                {song.tags.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    className="chip chip--link"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate({ name: 'tag', tag: t.name })
                    }}
                  >
                    {t.name}
                  </button>
                ))}
                {song.tags.length > 3 && <span className="chip">+{song.tags.length - 3}</span>}
              </span>
            )}
            {!isMobile && (
              <button
                className={`songs__fav ${song.favorite ? 'is-on' : ''}`}
                aria-label={song.favorite ? `Remover ${song.title} das Favoritas` : `Favoritar ${song.title}`}
                aria-pressed={song.favorite}
                onClick={(e) => {
                  e.stopPropagation()
                  void actions.toggleFavorite(song)
                }}
              >
                <Icon name="heart" size={18} filled={song.favorite} />
              </button>
            )}
            {!isMobile && <span className="songs__col-dur">{formatDuration(song.durationSec)}</span>}
            <button
              className="songs__more"
              aria-label={`Ações de ${song.title}`}
              onClick={(e) => openMenu(e, song, index, true)}
            >
              <Icon name="more" size={20} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
