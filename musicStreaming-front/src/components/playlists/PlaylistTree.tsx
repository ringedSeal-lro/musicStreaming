import { useEffect, useState, type DragEvent, type MouseEvent } from 'react'
import type { PlaylistTreeDTO } from '../../api/types'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useRoute } from '../../hooks/useRoute'
import { useActions } from '../../state/actions'
import { ancestorsOf, countSongs } from '../../utils/tree'
import { Cover } from '../common/Cover'
import { Icon } from '../common/Icon'

export const SONG_DRAG_TYPE = 'application/x-song-ids'

interface Props {
  playlists: PlaylistTreeDTO[]
  /** Só ícones (barra lateral recolhida no tablet). */
  compact?: boolean
  onNavigate?: () => void
}

export function PlaylistTree({ playlists, compact, onNavigate }: Props) {
  const [route] = useRoute()
  const activeId = route.name === 'playlist' ? route.id : null
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // abre os ancestrais da playlist aberta
  useEffect(() => {
    if (activeId == null) return
    const path = ancestorsOf(playlists, activeId).slice(0, -1)
    if (path.length) setExpanded((prev) => new Set([...prev, ...path.map((p) => p.id)]))
  }, [activeId, playlists])

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (compact) {
    return (
      <ul className="ptree ptree--compact">
        {playlists.map((p) => (
          <CompactNode key={p.id} playlist={p} active={p.id === activeId} onNavigate={onNavigate} />
        ))}
      </ul>
    )
  }

  return (
    <ul className="ptree" role="tree" aria-label="Playlists">
      {playlists.map((p) => (
        <TreeNode
          key={p.id}
          playlist={p}
          depth={0}
          activeId={activeId}
          expanded={expanded}
          onToggle={toggle}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  )
}

interface NodeProps {
  playlist: PlaylistTreeDTO
  depth: number
  activeId: number | null
  expanded: Set<number>
  onToggle: (id: number) => void
  onNavigate?: () => void
}

function TreeNode({ playlist, depth, activeId, expanded, onToggle, onNavigate }: NodeProps) {
  const [, navigate] = useRoute()
  const { openPlaylistMenu } = useActions()
  const drop = useSongDrop(playlist.id)
  const hasChildren = playlist.children.length > 0
  const isOpen = expanded.has(playlist.id)
  const total = playlist.songs.length + countSongs(playlist.children)

  const open = () => {
    navigate({ name: 'playlist', id: playlist.id })
    onNavigate?.()
  }
  const menu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openPlaylistMenu(playlist, e.clientX, e.clientY)
  }

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={activeId === playlist.id}>
      <div
        className={`ptree__row ${activeId === playlist.id ? 'is-active' : ''} ${drop.over ? 'is-drop' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onContextMenu={menu}
        {...drop.handlers}
      >
        {hasChildren ? (
          <button
            className="ptree__toggle"
            aria-label={isOpen ? `Recolher ${playlist.name}` : `Expandir ${playlist.name}`}
            onClick={() => onToggle(playlist.id)}
          >
            <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={16} />
          </button>
        ) : (
          <span className="ptree__toggle ptree__toggle--empty" />
        )}
        <button className="ptree__link" onClick={open}>
          <Cover seed={`${playlist.id}-${playlist.name}`} size={36} icon={hasChildren ? 'folder' : 'music'} />
          <span className="ptree__text">
            <span className="ptree__name">{playlist.name}</span>
            <span className="ptree__meta">
              Playlist · {total} {total === 1 ? 'música' : 'músicas'}
            </span>
          </span>
        </button>
        <button className="ptree__more" aria-label={`Ações de ${playlist.name}`} onClick={menu}>
          <Icon name="more" size={18} />
        </button>
      </div>
      {hasChildren && isOpen && (
        <ul role="group">
          {playlist.children.map((child) => (
            <TreeNode
              key={child.id}
              playlist={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function CompactNode({ playlist, active, onNavigate }: { playlist: PlaylistTreeDTO; active: boolean; onNavigate?: () => void }) {
  const [, navigate] = useRoute()
  const { openPlaylistMenu } = useActions()
  const drop = useSongDrop(playlist.id)
  return (
    <li>
      <button
        className={`ptree__compact ${active ? 'is-active' : ''} ${drop.over ? 'is-drop' : ''}`}
        title={playlist.name}
        aria-label={playlist.name}
        onClick={() => {
          navigate({ name: 'playlist', id: playlist.id })
          onNavigate?.()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          openPlaylistMenu(playlist, e.clientX, e.clientY)
        }}
        {...drop.handlers}
      >
        <Cover seed={`${playlist.id}-${playlist.name}`} size={44} icon={playlist.children.length ? 'folder' : 'music'} />
      </button>
    </li>
  )
}

/** Alvo de soltar músicas arrastadas da tabela (só desktop). */
function useSongDrop(playlistId: number) {
  const { dropOnPlaylist } = useActions()
  const isMobile = useIsMobile()
  const [over, setOver] = useState(false)
  const accepts = (e: DragEvent) => !isMobile && e.dataTransfer.types.includes(SONG_DRAG_TYPE)
  return {
    over,
    handlers: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        setOver(false)
        if (!accepts(e)) return
        e.preventDefault()
        try {
          const ids = JSON.parse(e.dataTransfer.getData(SONG_DRAG_TYPE)) as number[]
          if (Array.isArray(ids) && ids.length) void dropOnPlaylist(playlistId, ids)
        } catch {
          // dados inválidos: ignora
        }
      },
    },
  }
}
