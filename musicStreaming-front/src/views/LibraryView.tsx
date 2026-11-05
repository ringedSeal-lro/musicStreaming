import { useRoute } from '../hooks/useRoute'
import { useApp } from '../state/AppContext'
import { useActions } from '../state/actions'
import { PlaylistTree } from '../components/playlists/PlaylistTree'
import { Empty, ErrorState, Loading } from '../components/common/StateViews'
import { Cover } from '../components/common/Cover'
import { Icon } from '../components/common/Icon'
import { IconButton } from '../components/common/IconButton'

/** Aba "Biblioteca" (celular): troca de biblioteca, atalhos e árvore de playlists. */
export function LibraryView() {
  const app = useApp()
  const actions = useActions()
  const [, navigate] = useRoute()
  const { library, tree } = app

  return (
    <div className="view">
      <div className="view__title-row">
        <h1 className="view__title">Sua biblioteca</h1>
        <IconButton icon="plus" label="Criar playlist" onClick={() => actions.createPlaylist()} disabled={!library} />
      </div>

      <section className="section">
        <h2 className="section__title">Bibliotecas</h2>
        {app.librariesError ? (
          <ErrorState message={app.librariesError} onRetry={() => void app.refresh()} />
        ) : app.librariesLoading ? (
          <Loading />
        ) : (
          <ul className="lib-list">
            {app.libraries.map((l) => (
              <li key={l.id} className={`lib-list__item ${l.id === library?.id ? 'is-active' : ''}`}>
                <button className="lib-list__open" onClick={() => app.selectLibrary(l.id)} aria-pressed={l.id === library?.id}>
                  <Cover seed={`lib-${l.id}`} size={44} icon="library" />
                  <span>
                    <strong>{l.name}</strong>
                    <span className="muted small">
                      {l.isDefault ? 'Padrão · ' : ''}
                      {l.playlistCount} playlists
                    </span>
                  </span>
                </button>
                <IconButton
                  icon="more"
                  label={`Ações de ${l.name}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    app.openMenu({
                      x: rect.left,
                      y: rect.bottom,
                      title: l.name,
                      items: [
                        { label: 'Renomear…', icon: 'edit', onSelect: () => actions.renameLibrary(l) },
                        {
                          label: 'Deletar…',
                          icon: 'trash',
                          danger: true,
                          disabled: l.isDefault,
                          hint: l.isDefault ? 'A biblioteca padrão não pode ser deletada' : undefined,
                          onSelect: () => actions.deleteLibrary(l),
                        },
                      ],
                    })
                  }}
                />
              </li>
            ))}
            <li>
              <button className="btn btn--ghost btn--block" onClick={actions.createLibrary}>
                <Icon name="plus" size={18} /> Nova biblioteca
              </button>
            </li>
          </ul>
        )}
      </section>

      <section className="section">
        <div className="quick-links">
          <button className="quick-link" onClick={() => navigate({ name: 'favorites' })}>
            <Cover seed="favorites" size={44} icon="heart" variant="favorites" /> Favoritas
          </button>
          <button className="quick-link" onClick={() => navigate({ name: 'all' })}>
            <Cover seed="all-songs" size={44} icon="music" /> Todas as músicas
          </button>
          <button className="quick-link" onClick={() => navigate({ name: 'unorganized' })}>
            <Cover seed="unorganized" size={44} icon="inbox" variant="muted" /> Sem playlist
            {tree && <span className="muted small">({tree.unorganizedSongs.length})</span>}
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Playlists</h2>
        {app.treeError ? (
          <ErrorState message={app.treeError} onRetry={() => void app.refresh()} />
        ) : !tree ? (
          library ? <Loading /> : <Empty icon="library" title="Nenhuma biblioteca" />
        ) : tree.playlists.length === 0 ? (
          <Empty icon="folder" title="Nenhuma playlist ainda">
            <button className="btn btn--primary" onClick={() => actions.createPlaylist()}>
              Criar playlist
            </button>
          </Empty>
        ) : (
          <PlaylistTree playlists={tree.playlists} />
        )}
      </section>
    </div>
  )
}
