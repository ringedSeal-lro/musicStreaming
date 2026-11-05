import type { MouseEvent, ReactNode } from 'react'
import { useRoute } from '../../hooks/useRoute'
import { useActions, type PlaylistRef } from '../../state/actions'
import { Cover } from '../common/Cover'
import { Icon, type IconName } from '../common/Icon'

export interface CardItem {
  key: string
  title: string
  subtitle: string
  seed: string
  icon?: IconName
  variant?: 'default' | 'favorites' | 'muted'
  onOpen: () => void
  onPlay?: () => void
  /** Se for playlist, habilita menu de contexto. */
  playlist?: PlaylistRef
}

export function CardGrid({ items, children }: { items: CardItem[]; children?: ReactNode }) {
  const { openPlaylistMenu } = useActions()
  return (
    <div className="cards">
      {items.map((item) => {
        const menu = item.playlist
          ? (e: MouseEvent) => {
              e.preventDefault()
              openPlaylistMenu(item.playlist!, e.clientX, e.clientY)
            }
          : undefined
        return (
          <div key={item.key} className="card" onContextMenu={menu}>
            <button className="card__open" onClick={item.onOpen} aria-label={`Abrir ${item.title}`}>
              <Cover seed={item.seed} size="fill" icon={item.icon} variant={item.variant} className="card__cover" />
              <span className="card__title">{item.title}</span>
              <span className="card__subtitle">{item.subtitle}</span>
            </button>
            {item.onPlay && (
              <button className="card__play" aria-label={`Tocar ${item.title}`} onClick={item.onPlay}>
                <Icon name="play" size={22} />
              </button>
            )}
          </div>
        )
      })}
      {children}
    </div>
  )
}

/** Cards de playlists (sub-playlists, resultados de busca, início). */
export function usePlaylistCards() {
  const [, navigate] = useRoute()
  const { playPlaylist } = useActions()
  return (p: PlaylistRef & { songCount?: number; childCount?: number }): CardItem => {
    const parts = []
    if (p.songCount != null) parts.push(`${p.songCount} ${p.songCount === 1 ? 'música' : 'músicas'}`)
    if (p.childCount) parts.push(`${p.childCount} ${p.childCount === 1 ? 'sub-playlist' : 'sub-playlists'}`)
    return {
      key: `p${p.id}`,
      title: p.name,
      subtitle: parts.join(' · ') || 'Playlist',
      seed: `${p.id}-${p.name}`,
      icon: p.childCount ? 'folder' : 'music',
      onOpen: () => navigate({ name: 'playlist', id: p.id }),
      onPlay: () => void playPlaylist(p.id),
      playlist: p,
    }
  }
}
