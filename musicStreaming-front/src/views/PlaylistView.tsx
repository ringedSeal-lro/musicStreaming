import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useRoute } from '../hooks/useRoute'
import { useApp } from '../state/AppContext'
import { useActions } from '../state/actions'
import { usePlayer } from '../state/PlayerContext'
import { plural, totalDuration } from '../utils/format'
import { ancestorsOf } from '../utils/tree'
import { ViewHeader } from '../components/layout/ViewHeader'
import { SongTable } from '../components/songs/SongTable'
import { CardGrid, usePlaylistCards } from '../components/playlists/PlaylistCards'
import { Empty, ErrorState, Loading } from '../components/common/StateViews'
import { Icon } from '../components/common/Icon'
import { IconButton } from '../components/common/IconButton'

export function PlaylistView({ id }: { id: number }) {
  const { version, tree } = useApp()
  const actions = useActions()
  const player = usePlayer()
  const [, navigate] = useRoute()
  const toCard = usePlaylistCards()
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([api.playlists.get(id), api.playlists.songs(id)]),
    [id, version],
  )

  if (error) {
    return (
      <ErrorState
        message={error.includes('não encontrada') ? 'Esta playlist não existe mais.' : error}
        onRetry={reload}
      />
    )
  }
  if (loading && !data) return <Loading />
  if (!data) return null

  const [playlist, songs] = data
  const crumbs = tree ? ancestorsOf(tree.playlists, id).slice(0, -1) : []
  const otherLibrary = tree != null && tree.id !== playlist.libraryId
  const playable = songs.filter((s) => s.available)

  return (
    <div className="view">
      <ViewHeader
        kind={playlist.parentId ? 'Sub-playlist' : 'Playlist'}
        title={playlist.name}
        seed={`${playlist.id}-${playlist.name}`}
        icon={playlist.children.length ? 'folder' : 'music'}
        tags={playlist.tags}
        breadcrumb={
          crumbs.length > 0 && (
            <nav aria-label="Caminho">
              {crumbs.map((c) => (
                <span key={c.id}>
                  <button className="link" onClick={() => navigate({ name: 'playlist', id: c.id })}>
                    {c.name}
                  </button>
                  {' / '}
                </span>
              ))}
            </nav>
          )
        }
        meta={
          <>
            {plural(songs.length, 'música', 'músicas')}
            {playlist.children.length > 0 && <> · {plural(playlist.children.length, 'sub-playlist', 'sub-playlists')}</>}
            {songs.length > 0 && <> · {totalDuration(songs.map((s) => s.durationSec))}</>}
          </>
        }
        actions={
          <>
            <button
              className="play-btn play-btn--big"
              aria-label={`Tocar ${playlist.name}`}
              disabled={!playable.length}
              onClick={() => player.playList(songs)}
            >
              <Icon name="play" size={26} />
            </button>
            <IconButton
              icon="shuffle"
              label="Tocar em ordem aleatória"
              disabled={playable.length < 2}
              onClick={() => player.playList([...playable].sort(() => Math.random() - 0.5))}
            />
            <IconButton icon="plus" label="Criar sub-playlist" onClick={() => actions.createPlaylist(playlist.id)} />
            <IconButton
              icon="more"
              label="Mais ações da playlist"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                actions.openPlaylistMenu(playlist, rect.left, rect.bottom + 4)
              }}
            />
          </>
        }
      />

      {otherLibrary && (
        <p className="notice">Esta playlist é de outra biblioteca. Troque de biblioteca para movê-la ou ver na árvore.</p>
      )}

      {playlist.children.length > 0 && (
        <section className="section">
          <h2 className="section__title">Sub-playlists</h2>
          <CardGrid items={playlist.children.map(toCard)} />
        </section>
      )}

      <section className="section">
        {playlist.children.length > 0 && <h2 className="section__title">Músicas</h2>}
        {songs.length === 0 ? (
          <Empty icon="music" title="Playlist vazia">
            Adicione músicas pelo menu <strong>⋯</strong> de qualquer música
            <span className="hide-mobile"> ou arraste-as até esta playlist na barra lateral</span>.
          </Empty>
        ) : (
          <SongTable songs={songs} playlistId={playlist.id} defaultOrderLabel="Ordem da playlist" />
        )}
      </section>
    </div>
  )
}

