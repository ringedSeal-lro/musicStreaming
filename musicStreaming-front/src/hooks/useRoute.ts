import { useCallback, useSyncExternalStore } from 'react'

/** Rotas por hash (#/...) — sem dependência de router e com botão "voltar" funcionando. */
export type Route =
  | { name: 'home' }
  | { name: 'playlist'; id: number }
  | { name: 'favorites' }
  | { name: 'all' }
  | { name: 'unorganized' }
  | { name: 'tag'; tag: string }
  | { name: 'search'; q: string }
  | { name: 'library' }

export function parseRoute(hash: string): Route {
  const [path, rawQuery = ''] = hash.replace(/^#/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const params = new URLSearchParams(rawQuery)
  switch (parts[0]) {
    case 'playlist': {
      const id = Number(parts[1])
      return Number.isFinite(id) ? { name: 'playlist', id } : { name: 'home' }
    }
    case 'favorites':
      return { name: 'favorites' }
    case 'all':
      return { name: 'all' }
    case 'unorganized':
      return { name: 'unorganized' }
    case 'tag':
      return { name: 'tag', tag: decodeURIComponent(parts[1] ?? '') }
    case 'search':
      return { name: 'search', q: params.get('q') ?? '' }
    case 'library':
      return { name: 'library' }
    default:
      return { name: 'home' }
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'playlist':
      return `#/playlist/${route.id}`
    case 'tag':
      return `#/tag/${encodeURIComponent(route.tag)}`
    case 'search':
      return route.q ? `#/search?q=${encodeURIComponent(route.q)}` : '#/search'
    case 'home':
      return '#/'
    default:
      return `#/${route.name}`
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useRoute(): [Route, (route: Route, replace?: boolean) => void] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '')
  const navigate = useCallback((route: Route, replace = false) => {
    const target = routeToHash(route)
    if (replace) {
      window.history.replaceState(null, '', target)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } else if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [])
  return [parseRoute(hash), navigate]
}
