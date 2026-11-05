import { useApp } from '../state/AppContext'
import { usePlayer } from '../state/PlayerContext'
import { usePagedSongs } from '../hooks/usePagedSongs'
import { plural, totalDuration } from '../utils/format'
import { ViewHeader } from '../components/layout/ViewHeader'
import { SongTable } from '../components/songs/SongTable'
import { Empty, ErrorState, Loading } from '../components/common/StateViews'
import { Icon } from '../components/common/Icon'
import type { SongDTO } from '../api/types'

function PlayButton({ songs, label }: { songs: SongDTO[]; label: string }) {
  const player = usePlayer()
  return (
    <button
      className="play-btn play-btn--big"
      aria-label={`Tocar ${label}`}
      disabled={!songs.some((s) => s.available)}
      onClick={() => player.playList(songs)}
    >
      <Icon name="play" size={26} />
    </button>
  )
}

/** Favoritas, todas as músicas e filtro por tag: GET /api/songs paginado. */
export function PagedSongsView({ kind }: { kind: 'favorites' | 'all' | { tag: string } }) {
  const { version } = useApp()
  const params = kind === 'favorites' ? { favorite: true } : kind === 'all' ? {} : { tag: kind.tag }
  const { songs, total, loading, error, hasMore, loadMore, reload } = usePagedSongs(params, [version])

  const config =
    kind === 'favorites'
      ? { title: 'Favoritas', kind: 'Coleção', seed: 'favorites', icon: 'heart' as const, variant: 'favorites' as const }
      : kind === 'all'
        ? { title: 'Todas as músicas', kind: 'Coleção', seed: 'all-songs', icon: 'music' as const, variant: 'default' as const }
        : { title: `#${kind.tag}`, kind: 'Tag', seed: `tag-${kind.tag}`, icon: 'tag' as const, variant: 'default' as const }

  return (
    <div className="view">
      <ViewHeader
        kind={config.kind}
        title={config.title}
        seed={config.seed}
        icon={config.icon}
        variant={config.variant}
        meta={
          <>
            {plural(total, 'música', 'músicas')}
            {songs.length > 0 && !hasMore && <> · {totalDuration(songs.map((s) => s.durationSec))}</>}
          </>
        }
        actions={<PlayButton songs={songs} label={config.title} />}
      />
      <section className="section">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && songs.length === 0 ? (
          <Loading />
        ) : songs.length === 0 ? (
          kind === 'favorites' ? (
            <Empty icon="heart" title="Nenhuma favorita ainda">
              Toque no coração de uma música para guardá-la aqui.
            </Empty>
          ) : kind === 'all' ? (
            <Empty icon="music" title="Nenhuma música">Use “Escanear” para ler a pasta de músicas.</Empty>
          ) : (
            <Empty icon="tag" title="Nenhuma música com esta tag" />
          )
        ) : (
          <>
            <SongTable songs={songs} />
            {hasMore && (
              <div className="load-more">
                <button className="btn btn--ghost" onClick={loadMore} disabled={loading}>
                  {loading ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/** Músicas da biblioteca atual que não estão em nenhuma playlist (vem do /tree). */
export function UnorganizedView() {
  const app = useApp()
  const { tree, library } = app
  if (app.treeError) return <ErrorState message={app.treeError} onRetry={() => void app.refresh()} />
  if (!library) return <Empty icon="library" title="Nenhuma biblioteca selecionada" />
  if (!tree) return <Loading />
  const songs = tree.unorganizedSongs
  return (
    <div className="view">
      <ViewHeader
        kind={library.name}
        title="Sem playlist"
        seed="unorganized"
        icon="inbox"
        variant="muted"
        meta={<>{plural(songs.length, 'música', 'músicas')} fora de qualquer playlist desta biblioteca</>}
        actions={<PlayButton songs={songs} label="músicas sem playlist" />}
      />
      <section className="section">
        {songs.length === 0 ? (
          <Empty icon="inbox" title="Tudo organizado">Todas as músicas estão em alguma playlist.</Empty>
        ) : (
          <SongTable songs={songs} />
        )}
      </section>
    </div>
  )
}
