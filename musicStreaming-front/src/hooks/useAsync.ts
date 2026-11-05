import { useCallback, useEffect, useState } from 'react'
import { errorText } from '../api/client'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => void
  setData: (updater: (prev: T | undefined) => T | undefined) => void
}

/** Executa fetcher quando deps mudam; ignora respostas antigas. */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setDataState] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetcher()
      .then((result) => {
        if (active) setDataState(result)
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => setDataState(updater), [])
  return { data, loading, error, reload, setData }
}
