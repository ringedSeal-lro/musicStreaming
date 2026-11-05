import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile, useIsTablet } from './hooks/useMediaQuery'
import { useRoute, type Route } from './hooks/useRoute'
import { AppProvider } from './state/AppContext'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { BottomNav } from './components/layout/BottomNav'
import { PlayerBar } from './components/player/PlayerBar'
import { FullPlayer } from './components/player/FullPlayer'
import { ContextMenu } from './components/common/ContextMenu'
import { DialogHost } from './components/common/DialogHost'
import { Toasts } from './components/common/Toasts'
import { HomeView } from './views/HomeView'
import { PlaylistView } from './views/PlaylistView'
import { PagedSongsView, UnorganizedView } from './views/SongsView'
import { SearchView } from './views/SearchView'
import { LibraryView } from './views/LibraryView'

function View({ route }: { route: Route }) {
  switch (route.name) {
    case 'playlist':
      return <PlaylistView key={route.id} id={route.id} />
    case 'favorites':
      return <PagedSongsView key="favorites" kind="favorites" />
    case 'all':
      return <PagedSongsView key="all" kind="all" />
    case 'tag':
      return <PagedSongsView key={`tag-${route.tag}`} kind={{ tag: route.tag }} />
    case 'unorganized':
      return <UnorganizedView />
    case 'search':
      return <SearchView q={route.q} />
    case 'library':
      return <LibraryView />
    default:
      return <HomeView />
  }
}

function Shell() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const [route] = useRoute()
  const { current } = usePlayer()
  const [compact, setCompact] = useState(true)
  const [fullPlayer, setFullPlayer] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const closeFullPlayer = useCallback(() => setFullPlayer(false), [])

  // nova tela começa do topo
  const routeKey = JSON.stringify(route)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [routeKey])

  const classes = ['app', isMobile && 'app--mobile', isTablet && compact && 'app--compact', current && 'app--playing']
  return (
    <div className={classes.filter(Boolean).join(' ')}>
      {!isMobile && (
        <Sidebar compact={isTablet && compact} onToggleCompact={isTablet ? () => setCompact((c) => !c) : undefined} />
      )}
      <main className="main" ref={mainRef}>
        <TopBar />
        <div className="main__content">
          <View route={route} />
        </div>
      </main>
      <PlayerBar onExpand={() => setFullPlayer(true)} />
      {isMobile && <BottomNav />}
      {isMobile && fullPlayer && <FullPlayer onClose={closeFullPlayer} />}
      <ContextMenu />
      <DialogHost />
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <PlayerProvider>
        <Shell />
      </PlayerProvider>
    </AppProvider>
  )
}
