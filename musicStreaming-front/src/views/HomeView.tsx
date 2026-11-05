import { useRoute } from '../hooks/useRoute'
import { useApp } from '../state/AppContext'
import { useActions } from '../state/actions'
import { usePlayer } from '../state/PlayerContext'
import { plural } from '../utils/format'
import { countSongs } from '../utils/tree'
import { CardGrid, usePlaylistCards, type CardItem } from '../components/playlists/PlaylistCards'
import { ViewHeader } from '../components/layout/ViewHeader'
import { Empty, ErrorState, Loading } from '../components/common/StateViews'
import { Icon } from '../components/common/Icon'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function HomeView() {
  const app = useApp()
  const actions = useActions()
  const player = usePlayer()
  const [, navigate] = useRoute()
  const toCard = usePlaylistCards()
  const { library, tree } = app

  if (app.librariesError) return <ErrorState message={app.librariesError} onRetry={() => void app.refresh()} />
  if (app.librariesLoading) return <Loading />
  if (!library) {
    return (
      <Empty icon="library" title="Nenhuma biblioteca encontrada">
        <p>Escaneie a pasta de músicas para criar a biblioteca padrão.</p>
        <button className="btn btn--primary" onClick={() => void actions.scan()}>
          <Icon name="scan" size={18} /> Escanear agora
        </button>
      </Empty>
    )
  }
  if (app.treeError) return <ErrorState message={app.treeError} onRetry={() => void app.refresh()} />
  if (!tree) return <Loading />

  const organized = countSongs(tree.playlists)
  const shortcuts: CardItem[] = [
    {
      key: 'fav',
      title: 'Favoritas',
      subtitle: 'Músicas que você curtiu',
      seed: 'favorites',
      icon: 'heart',
      variant: 'favorites',
      onOpen: () => navigate({ name: 'favorites' }),
    },
    {
      key: 'all',
      title: 'Todas as músicas',
      subtitle: 'Tudo o que foi escaneado',
      seed: 'all-songs',
      icon: 'music',
      onOpen: () => navigate({ name: 'all' }),
    },
    {
      key: 'unorganized',
      title: 'Sem playlist',
      subtitle: plural(tree.unorganizedSongs.length, 'música', 'músicas'),
      seed: 'unorganized',
      icon: 'inbox',
      variant: 'muted',
      onOpen: () => navigate({ name: 'unorganized' }),
      onPlay: tree.unorganizedSongs.length ? () => player.playList(tree.unorganizedSongs) : undefined,
    },
  ]

  return (
    <div className="view">
      <ViewHeader
        kind={library.isDefault ? 'Biblioteca padrão' : 'Biblioteca'}
        title={library.name}
        seed={`lib-${library.id}`}
        icon="library"
        meta={
          <>
            {greeting()} · {plural(library.playlistCount, 'playlist', 'playlists')} ·{' '}
            {plural(organized, 'música organizada', 'músicas organizadas')}
          </>
        }
        actions={
          <>
            <button className="btn btn--primary" onClick={() => actions.createPlaylist()}>
              <Icon name="plus" size={18} /> Criar playlist
            </button>
            <button className="btn btn--ghost" onClick={actions.sync}>
              <Icon name="sync" size={18} /> Sincronizar
            </button>
          </>
        }
      />

      <section className="section">
        <h2 className="section__title">Atalhos</h2>
        <CardGrid items={shortcuts} />
      </section>

      <section className="section">
        <h2 className="section__title">Playlists</h2>
        {tree.playlists.length === 0 ? (
          <Empty icon="folder" title="Esta biblioteca ainda não tem playlists">
            <p>
              {library.isDefault
                ? 'As subpastas da pasta escaneada viram playlists aqui.'
                : 'Bibliotecas novas começam vazias: todas as músicas estão em “Sem playlist”.'}
            </p>
            <button className="btn btn--primary" onClick={() => actions.createPlaylist()}>
              <Icon name="plus" size={18} /> Criar playlist
            </button>
          </Empty>
        ) : (
          <CardGrid
            items={tree.playlists.map((p) =>
              toCard({ ...p, songCount: p.songs.length, childCount: p.children.length }),
            )}
          />
        )}
      </section>
    </div>
  )
}
