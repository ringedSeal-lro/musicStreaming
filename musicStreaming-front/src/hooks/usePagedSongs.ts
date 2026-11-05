import { useEffect, useState } from 'react'
import { api, errorText } from '../api/client'
import type { SongDTO } from '../api/types'

const PAGE_SIZE = 200

/** GET /api/songs paginado, acumulando páginas ("carregar mais"). */
export function usePagedSongs(params: { favorite?: boolean; tag?: string }, deps: unknown[]) {
  const [songs, setSongs] = useState<SongDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // recarrega as páginas já vistas quando os filtros/dados mudam
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const pagesToLoad = Math.max(1, page + 1)
    Promise.all(
      Array.from({ length: pagesToLoad }, (_, p) => api.songs.list({ ...params, page: p, size: PAGE_SIZE })),
    )
      .then((pages) => {
        if (!active) return
        setSongs(pages.flatMap((p) => p.content))
        const last = pages[pages.length - 1]
        setTotal(last.totalElements)
        setHasMore(last.page + 1 < last.totalPages)
      })
      .catch((e) => active && setError(errorText(e)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, params.favorite, params.tag, page, nonce])

  // filtro mudou: volta para a primeira página
  useEffect(() => setPage(0), [params.favorite, params.tag])

  return {
    songs,
    total,
    loading,
    error,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
    reload: () => setNonce((n) => n + 1),
  }
}
