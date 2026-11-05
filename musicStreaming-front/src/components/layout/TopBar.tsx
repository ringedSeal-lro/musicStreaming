import { useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useRoute } from '../../hooks/useRoute'
import { useApp } from '../../state/AppContext'
import { useActions } from '../../state/actions'
import { Icon } from '../common/Icon'
import { IconButton } from '../common/IconButton'

export function TopBar() {
  const [route, navigate] = useRoute()
  const { library } = useApp()
  const actions = useActions()
  const isMobile = useIsMobile()
  const [scanning, setScanning] = useState(false)
  const routeQuery = route.name === 'search' ? route.q : ''
  const [value, setValue] = useState(routeQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  // mantém o campo igual à URL (ex.: botão voltar)
  useEffect(() => setValue(routeQuery), [routeQuery])

  // atalho "/" foca a busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onChange = (q: string) => {
    setValue(q)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => navigate({ name: 'search', q: q.trim() }, route.name === 'search'), 300)
  }

  const scan = async () => {
    setScanning(true)
    await actions.scan()
    setScanning(false)
  }

  const showSearch = !isMobile || route.name === 'search'

  return (
    <header className="topbar">
      {!isMobile && (
        <div className="topbar__history">
          <IconButton icon="chevronLeft" label="Voltar" onClick={() => window.history.back()} />
          <IconButton icon="chevronRight" label="Avançar" onClick={() => window.history.forward()} />
        </div>
      )}
      {showSearch ? (
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            window.clearTimeout(timer.current)
            navigate({ name: 'search', q: value.trim() }, route.name === 'search')
          }}
        >
          <Icon name="search" size={20} />
          <label htmlFor="search-input" className="sr-only">Buscar músicas e playlists</label>
          <input
            id="search-input"
            ref={inputRef}
            type="search"
            placeholder="O que você quer ouvir?"
            value={value}
            autoFocus={isMobile && route.name === 'search'}
            onChange={(e) => onChange(e.target.value)}
          />
        </form>
      ) : (
        <h1 className="topbar__title">{library?.name ?? 'Minha Música'}</h1>
      )}
      <div className="topbar__actions">
        <button className="btn btn--ghost btn--icon-text" onClick={scan} disabled={scanning} title="Ler a pasta e atualizar a biblioteca">
          <Icon name="scan" size={18} className={scanning ? 'spin' : ''} />
          <span className="hide-mobile">{scanning ? 'Escaneando…' : 'Escanear'}</span>
        </button>
        <button
          className="btn btn--primary btn--icon-text"
          onClick={actions.sync}
          disabled={!library}
          title="Deixar a pasta original igual a esta biblioteca"
        >
          <Icon name="sync" size={18} />
          <span className="hide-mobile">Sincronizar</span>
        </button>
      </div>
    </header>
  )
}
