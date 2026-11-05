import type { MouseEvent } from 'react'
import { useRoute, type Route } from '../../hooks/useRoute'
import { useApp } from '../../state/AppContext'
import { useActions } from '../../state/actions'
import { Icon, type IconName } from '../common/Icon'
import { IconButton } from '../common/IconButton'
import { Cover } from '../common/Cover'
import { Loading, ErrorState, Empty } from '../common/StateViews'
import { PlaylistTree } from '../playlists/PlaylistTree'

interface Props {
  compact: boolean
  /** Tablet: botão para expandir/recolher. */
  onToggleCompact?: () => void
}

export function Sidebar({ compact, onToggleCompact }: Props) {
  const app = useApp()
  const actions = useActions()
  const [route, navigate] = useRoute()
  const { library, tree } = app

  const navItems: { route: Route; label: string; icon: IconName; count?: number }[] = [
    { route: { name: 'home' }, label: 'Início', icon: 'home' },
    { route: { name: 'search', q: '' }, label: 'Buscar', icon: 'search' },
    { route: { name: 'favorites' }, label: 'Favoritas', icon: 'heart' },
    { route: { name: 'all' }, label: 'Todas as músicas', icon: 'music' },
    { route: { name: 'unorganized' }, label: 'Sem playlist', icon: 'inbox', count: tree?.unorganizedSongs.length },
  ]

  const libraryMenu = (e: MouseEvent) => {
    if (!library) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    app.openMenu({
      x: rect.left,
      y: rect.bottom + 4,
      title: library.name,
      items: [
        { label: 'Nova biblioteca…', icon: 'plus', onSelect: actions.createLibrary },
        { label: 'Renomear…', icon: 'edit', onSelect: () => actions.renameLibrary(library) },
        { label: 'Sincronizar com a pasta…', icon: 'sync', onSelect: actions.sync },
        'separator',
        {
          label: 'Deletar…',
          icon: 'trash',
          danger: true,
          disabled: library.isDefault,
          hint: library.isDefault ? 'A biblioteca padrão não pode ser deletada' : undefined,
          onSelect: () => actions.deleteLibrary(library),
        },
      ],
    })
  }

  return (
    <aside className={`sidebar ${compact ? 'sidebar--compact' : ''}`} aria-label="Navegação">
      <nav className="panel sidebar__nav">
        {onToggleCompact && (
          <IconButton
            icon="sidebar"
            label={compact ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            onClick={onToggleCompact}
            className="sidebar__toggle"
          />
        )}
        {navItems.map((item) => {
          const active = route.name === item.route.name
          return (
            <button
              key={item.route.name}
              className={`nav-item ${active ? 'is-active' : ''}`}
              onClick={() => navigate(item.route)}
              title={compact ? item.label : undefined}
              aria-label={compact ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={22} filled={item.icon === 'heart' && active} />
              {!compact && <span>{item.label}</span>}
              {!compact && item.count != null && item.count > 0 && <span className="nav-item__count">{item.count}</span>}
            </button>
          )
        })}
      </nav>

      <section className="panel sidebar__library">
        {compact ? (
          <div className="sidebar__compact-head">
            <IconButton icon="plus" label="Criar playlist" onClick={() => actions.createPlaylist()} disabled={!library} />
          </div>
        ) : (
          <>
            <div className="sidebar__lib-head">
              <Icon name="library" size={22} />
              <label className="sr-only" htmlFor="library-select">Biblioteca</label>
              <select
                id="library-select"
                className="select"
                value={library?.id ?? ''}
                onChange={(e) => {
                  app.selectLibrary(Number(e.target.value))
                  navigate({ name: 'home' })
                }}
                disabled={!app.libraries.length}
              >
                {app.libraries.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <IconButton icon="more" label="Ações da biblioteca" onClick={libraryMenu} disabled={!library} />
            </div>
            <div className="sidebar__section-head">
              <span>Playlists</span>
              <button className="btn btn--pill" onClick={() => actions.createPlaylist()} disabled={!library}>
                <Icon name="plus" size={16} /> Criar playlist
              </button>
            </div>
          </>
        )}

        <div className="sidebar__tree">
          {app.librariesError ? (
            <ErrorState message={app.librariesError} onRetry={() => void app.refresh()} />
          ) : app.treeError ? (
            <ErrorState message={app.treeError} onRetry={() => void app.refresh()} />
          ) : !tree ? (
            app.librariesLoading || app.treeLoading ? (
              <Loading />
            ) : (
              !compact && <Empty icon="library" title="Nenhuma biblioteca">Use “Escanear” para ler a pasta de músicas.</Empty>
            )
          ) : tree.playlists.length === 0 ? (
            !compact && (
              <Empty icon="folder" title="Nenhuma playlist ainda">
                Crie a primeira playlist desta biblioteca.
              </Empty>
            )
          ) : (
            <PlaylistTree playlists={tree.playlists} compact={compact} />
          )}
        </div>
        {compact && library && (
          <div className="sidebar__compact-lib" title={library.name}>
            <Cover seed={`lib-${library.id}`} size={32} icon="library" />
          </div>
        )}
      </section>
    </aside>
  )
}
