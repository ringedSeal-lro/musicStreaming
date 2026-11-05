import type { SongDTO } from '../../api/types'
import { formatDate, formatDuration } from '../../utils/format'
import { Modal } from '../common/Modal'

export function SongDetailsDialog({ song, onClose }: { song: SongDTO; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Título', song.title],
    ['Artista', song.artist ?? '—'],
    ['Álbum', song.album ?? '—'],
    ['Artista do álbum', song.albumArtist ?? '—'],
    ['Duração', formatDuration(song.durationSec)],
    ['Adicionada em', formatDate(song.addedAt)],
    ['Disponível', song.available ? 'Sim' : 'Não (arquivo não encontrado)'],
    ['Tags', song.tags.map((t) => t.name).join(', ') || '—'],
  ]
  return (
    <Modal title="Detalhes da música" onClose={onClose} footer={<button className="btn btn--primary" onClick={onClose}>Fechar</button>}>
      <dl className="details">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>Arquivos</dt>
          <dd>
            {song.paths.length ? song.paths.map((p) => <code key={p}>{p}</code>) : '—'}
          </dd>
        </div>
      </dl>
    </Modal>
  )
}
