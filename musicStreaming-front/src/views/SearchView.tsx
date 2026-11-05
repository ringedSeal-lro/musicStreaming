import { api } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useRoute } from '../hooks/useRoute'
import { useApp } from '../state/AppContext'
import { CardGrid, usePlaylistCards } from '../components/playlists/PlaylistCards'
import { SongTable } from '../components/songs/SongTable'
import { Empty, ErrorState, Loading } from '../components/common/StateViews'

/** Igual à normalização do back-end: minúsculas e sem acento. */
function normalize(text: string | null | undefined) {
  return (text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function SearchView({ q }: { q: string }) {
  const { library, version } = useApp()
  const [, navigate] = useRoute()
  const toCard = usePlaylistCards()
  const libraryId = library?.id ?? null
  const term = q.trim()

  const tags = useAsync(() => api.tags.list(), [version])
  const result = useAsync(
    () => (term ? api.search(term, libraryId) : Promise.resolve(null)),
    [term, libraryId, version],
  )

  if (!term) {
    return (
      <div className="view">
        <h1 className="view__title">Buscar</h1>
        <p className="muted">
          Procure por título, artista, álbum, nome de playlist ou tag. Resultados com a palavra no nome aparecem
          primeiro; depois, os que têm a tag correspondente.
        </p>
        <section className="section">
          <h2 className="section__title">Navegar por tags</h2>
          {tags.loading ? (
            <Loading />
          ) : tags.error ? (
            <ErrorState message={tags.error} onRetry={tags.reload} />
          ) : !tags.data?.length ? (
            <Empty icon="tag" title="Nenhuma tag criada">Adicione tags pelo menu ⋯ de músicas e playlists.</Empty>
          ) : (
            <div className="tag-grid">
              {tags.data.map((t) => (
                <button key={t.id} className="tag-tile" onClick={() => navigate({ name: 'tag', tag: t.name })}>
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  if (result.error) return <ErrorState message={result.error} onRetry={result.reload} />
  if (result.loading || !result.data) return <Loading label="Buscando…" />

  const { songs, playlists } = result.data
  // A API já entrega na ordem certa (nome primeiro, tag depois); aqui só marcamos o que veio pela tag.
  const n = normalize(term)
  const playlistCards = playlists.map((p) => {
    const card = toCard(p)
    return normalize(p.name).includes(n) ? card : { ...card, subtitle: `Pela tag · ${card.subtitle}` }
  })
  const byName = songs.filter((s) => [s.title, s.artist, s.album].some((v) => normalize(v).includes(n)))
  const byTag = songs.filter((s) => !byName.includes(s))

  return (
    <div className="view">
      <h1 className="view__title">Resultados para “{term}”</h1>
      {songs.length === 0 && playlists.length === 0 && (
        <Empty icon="search" title="Nada encontrado">Tente outra palavra ou o nome de uma tag.</Empty>
      )}

      {songs.length > 0 && (
        <section className="section">
          <h2 className="section__title">Músicas</h2>
          <SongTable songs={byName.concat(byTag)} defaultOrderLabel="Relevância" />
          {byTag.length > 0 && byName.length > 0 && (
            <p className="muted small">As últimas {byTag.length} aparecem por terem uma tag correspondente.</p>
          )}
        </section>
      )}

      {playlists.length > 0 && (
        <section className="section">
          <h2 className="section__title">Playlists</h2>
          <CardGrid items={playlistCards} />
        </section>
      )}
    </div>
  )
}
