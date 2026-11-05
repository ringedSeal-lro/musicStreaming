import type { CSSProperties } from 'react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { usePlayer } from '../../state/PlayerContext'
import { useActions } from '../../state/actions'
import { Cover } from '../common/Cover'
import { Icon } from '../common/Icon'
import { IconButton } from '../common/IconButton'
import { ProgressBar } from './ProgressBar'

/** Player fixo (desktop/tablet) ou mini-player (celular). */
export function PlayerBar({ onExpand }: { onExpand: () => void }) {
  const player = usePlayer()
  const actions = useActions()
  const isMobile = useIsMobile()
  const song = player.current

  if (isMobile) {
    if (!song) return null
    const pct = player.duration > 0 ? (player.time / player.duration) * 100 : 0
    return (
      <div className="mini-player" style={{ '--fill': `${pct}%` } as CSSProperties}>
        <button className="mini-player__open" onClick={onExpand} aria-label="Abrir player em tela cheia">
          <Cover seed={`song-${song.id}`} size={40} />
          <span className="mini-player__text">
            <span className="truncate">{song.title}</span>
            <span className="truncate muted">{song.artist ?? 'Artista desconhecido'}</span>
          </span>
        </button>
        <IconButton
          icon="heart"
          label={song.favorite ? 'Remover das Favoritas' : 'Favoritar'}
          filled={song.favorite}
          active={song.favorite}
          onClick={() => void actions.toggleFavorite(song)}
        />
        <IconButton icon={player.playing ? 'pause' : 'play'} label={player.playing ? 'Pausar' : 'Tocar'} onClick={player.toggle} size={24} />
        <span className="mini-player__progress" aria-hidden="true" />
      </div>
    )
  }

  return (
    <footer className="player" aria-label="Player">
      <div className="player__now">
        {song ? (
          <>
            <Cover seed={`song-${song.id}`} size={56} />
            <div className="player__meta">
              <span className="truncate player__title">{song.title}</span>
              <span className="truncate muted">{song.artist ?? 'Artista desconhecido'}</span>
            </div>
            <IconButton
              icon="heart"
              label={song.favorite ? 'Remover das Favoritas' : 'Favoritar'}
              filled={song.favorite}
              active={song.favorite}
              onClick={() => void actions.toggleFavorite(song)}
            />
          </>
        ) : (
          <span className="muted">Nada tocando</span>
        )}
      </div>

      <div className="player__center">
        <div className="player__controls">
          <IconButton icon="prev" label="Anterior" onClick={player.prev} disabled={!song} />
          <button
            className="play-btn"
            onClick={player.toggle}
            disabled={!song}
            aria-label={player.playing ? 'Pausar' : 'Tocar'}
          >
            <Icon name={player.playing ? 'pause' : 'play'} size={20} />
          </button>
          <IconButton icon="next" label="Próxima" onClick={player.next} disabled={!song || player.index >= player.queue.length - 1} />
        </div>
        <ProgressBar time={player.time} duration={player.duration} onSeek={player.seek} disabled={!song} />
        {player.error && <span className="player__error" role="alert">{player.error}</span>}
      </div>

      <div className="player__volume">
        <IconButton
          icon={player.muted || player.volume === 0 ? 'mute' : 'volume'}
          label={player.muted ? 'Ativar som' : 'Silenciar'}
          onClick={player.toggleMute}
        />
        <input
          type="range"
          className="range"
          min={0}
          max={1}
          step={0.01}
          value={player.muted ? 0 : player.volume}
          aria-label="Volume"
          style={{ '--fill': `${(player.muted ? 0 : player.volume) * 100}%` } as CSSProperties}
          onChange={(e) => player.setVolume(Number(e.target.value))}
        />
      </div>
    </footer>
  )
}
