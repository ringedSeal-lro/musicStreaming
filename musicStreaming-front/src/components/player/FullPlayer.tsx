import { useEffect } from 'react'
import { usePlayer } from '../../state/PlayerContext'
import { useActions } from '../../state/actions'
import { Cover } from '../common/Cover'
import { Icon } from '../common/Icon'
import { IconButton } from '../common/IconButton'
import { ProgressBar } from './ProgressBar'

/** Player em tela cheia (celular). */
export function FullPlayer({ onClose }: { onClose: () => void }) {
  const player = usePlayer()
  const actions = useActions()
  const song = player.current

  useEffect(() => {
    if (!song) onClose()
  }, [song, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!song) return null

  return (
    <div className="full-player" role="dialog" aria-modal="true" aria-label="Tocando agora">
      <header className="full-player__head">
        <IconButton icon="chevronDown" label="Minimizar player" onClick={onClose} size={26} />
        <span className="muted small">Tocando agora</span>
        <IconButton
          icon="more"
          label="Ações da música"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            actions.openSongMenu(song, rect.right, rect.bottom)
          }}
        />
      </header>
      <Cover seed={`song-${song.id}`} size="fill" className="full-player__cover" />
      <div className="full-player__info">
        <div>
          <h2 className="truncate">{song.title}</h2>
          <p className="muted truncate">{song.artist ?? 'Artista desconhecido'}</p>
        </div>
        <IconButton
          icon="heart"
          label={song.favorite ? 'Remover das Favoritas' : 'Favoritar'}
          filled={song.favorite}
          active={song.favorite}
          size={26}
          onClick={() => void actions.toggleFavorite(song)}
        />
      </div>
      <ProgressBar time={player.time} duration={player.duration} onSeek={player.seek} />
      <div className="full-player__controls">
        <IconButton icon="prev" label="Anterior" onClick={player.prev} size={32} />
        <button className="play-btn play-btn--big" onClick={player.toggle} aria-label={player.playing ? 'Pausar' : 'Tocar'}>
          <Icon name={player.playing ? 'pause' : 'play'} size={32} />
        </button>
        <IconButton
          icon="next"
          label="Próxima"
          onClick={player.next}
          size={32}
          disabled={player.index >= player.queue.length - 1}
        />
      </div>
      {player.error && <p className="player__error" role="alert">{player.error}</p>}
    </div>
  )
}
