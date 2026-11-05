import { useCallback, useMemo } from 'react'
import { api, errorText } from '../api/client'
import type { LibraryDTO, SongDTO, TagDTO } from '../api/types'
import { AddToPlaylistDialog } from '../components/dialogs/AddToPlaylistDialog'
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog'
import { MovePlaylistDialog } from '../components/dialogs/MovePlaylistDialog'
import { NameDialog } from '../components/dialogs/NameDialog'
import { SongDetailsDialog } from '../components/dialogs/SongDetailsDialog'
import { SyncDialog } from '../components/dialogs/SyncDialog'
import { TagsDialog } from '../components/dialogs/TagsDialog'
import { useRoute } from '../hooks/useRoute'
import { plural } from '../utils/format'
import { findPlaylist, subtreeIds } from '../utils/tree'
import { useApp, type MenuEntry } from './AppContext'
import { usePlayer } from './PlayerContext'

/** O mínimo que as ações precisam saber de uma playlist (serve para Tree/Summary/DTO). */
export interface PlaylistRef {
  id: number
  name: string
  parentId: number | null
  tags: TagDTO[]
}

export interface SongContext {
  /** Playlist em que a música está sendo exibida (habilita remover/reordenar). */
  playlistId?: number
  /** Lista exibida, para tocar a partir desta música e reordenar. */
  list?: SongDTO[]
  index?: number
  /** list está na ordem real da playlist (false quando a tabela foi reordenada no front). */
  canReorder?: boolean
}

const SOON = 'Em breve: a API ainda não oferece isso'

export function useActions() {
  const app = useApp()
  const player = usePlayer()
  const [route, navigate] = useRoute()
  const { tree, library, refresh, toast, openDialog, openMenu } = app
  const roots = useMemo(() => tree?.playlists ?? [], [tree])

  const fail = useCallback((e: unknown) => toast(errorText(e), 'error'), [toast])

  // ---------------------------------------------------------------- músicas

  const toggleFavorite = useCallback(
    async (song: SongDTO) => {
      try {
        const updated = await api.songs.setFavorite(song.id, !song.favorite)
        player.patchSong(updated)
        toast(updated.favorite ? `"${song.title}" adicionada às Favoritas` : `"${song.title}" removida das Favoritas`, 'success')
        await refresh()
      } catch (e) {
        fail(e)
      }
    },
    [player, toast, refresh, fail],
  )

  const addToPlaylist = useCallback(
    (songs: SongDTO[]) => {
      if (!library) return
      openDialog((close) => (
        <AddToPlaylistDialog
          songs={songs}
          libraryId={library.id}
          roots={roots}
          onClose={close}
          onDone={async (name) => {
            toast(`${plural(songs.length, 'música adicionada', 'músicas adicionadas')} a "${name}"`, 'success')
            await refresh()
          }}
        />
      ))
    },
    [library, roots, openDialog, toast, refresh],
  )

  /** Usado pelo arrastar-e-soltar na barra lateral. */
  const dropOnPlaylist = useCallback(
    async (playlistId: number, songIds: number[]) => {
      try {
        await api.playlists.addSongs(playlistId, songIds)
        const target = findPlaylist(roots, playlistId)
        toast(`${plural(songIds.length, 'música adicionada', 'músicas adicionadas')} a "${target?.name ?? 'playlist'}"`, 'success')
        await refresh()
      } catch (e) {
        fail(e)
      }
    },
    [roots, toast, refresh, fail],
  )

  const removeFromPlaylist = useCallback(
    async (playlistId: number, song: SongDTO) => {
      try {
        await api.playlists.removeSong(playlistId, song.id)
        toast(`"${song.title}" removida da playlist`, 'success')
        await refresh()
      } catch (e) {
        fail(e)
      }
    },
    [toast, refresh, fail],
  )

  const moveInPlaylist = useCallback(
    async (playlistId: number, list: SongDTO[], index: number, delta: -1 | 1) => {
      const target = index + delta
      if (target < 0 || target >= list.length) return
      const ids = list.map((s) => s.id)
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      try {
        await api.playlists.reorder(playlistId, ids)
        await refresh()
      } catch (e) {
        fail(e)
      }
    },
    [refresh, fail],
  )

  const editSongTags = useCallback(
    (song: SongDTO) => {
      openDialog((close) => (
        <TagsDialog
          title={`Tags de "${song.title}"`}
          initialTags={song.tags}
          add={async (name) => {
            const updated = await api.songs.addTag(song.id, { name })
            player.patchSong(updated)
            return updated.tags
          }}
          remove={(tagId) => api.songs.removeTag(song.id, tagId)}
          onChanged={() => void refresh()}
          onClose={close}
        />
      ))
    },
    [openDialog, player, refresh],
  )

  const songDetails = useCallback(
    (song: SongDTO) => openDialog((close) => <SongDetailsDialog song={song} onClose={close} />),
    [openDialog],
  )

  const songMenuItems = useCallback(
    (song: SongDTO, ctx: SongContext = {}): MenuEntry[] => {
      const { playlistId, list, index, canReorder } = ctx
      const reorderable = playlistId != null && canReorder === true && list != null && index != null
      const items: MenuEntry[] = [
        {
          label: 'Tocar',
          icon: 'play',
          disabled: !song.available,
          hint: song.available ? undefined : 'Arquivo não encontrado',
          onSelect: () => (list && index != null ? player.playList(list, index) : player.playList([song])),
        },
        { label: 'Adicionar à fila', icon: 'queue', disabled: !song.available, onSelect: () => player.enqueue(song) },
        'separator',
        { label: 'Adicionar à playlist…', icon: 'plus', disabled: !library, onSelect: () => addToPlaylist([song]) },
      ]
      if (playlistId != null) {
        items.push({ label: 'Remover desta playlist', icon: 'trash', onSelect: () => void removeFromPlaylist(playlistId, song) })
      }
      if (playlistId != null && list != null && index != null) {
        items.push(
          {
            label: 'Mover para cima',
            icon: 'up',
            disabled: !reorderable || index === 0,
            hint: reorderable ? undefined : 'Volte para a ordem da playlist para reordenar',
            onSelect: () => void moveInPlaylist(playlistId, list, index, -1),
          },
          {
            label: 'Mover para baixo',
            icon: 'down',
            disabled: !reorderable || index === list.length - 1,
            hint: reorderable ? undefined : 'Volte para a ordem da playlist para reordenar',
            onSelect: () => void moveInPlaylist(playlistId, list, index, 1),
          },
        )
      }
      items.push(
        'separator',
        {
          label: song.favorite ? 'Remover das Favoritas' : 'Adicionar às Favoritas',
          icon: 'heart',
          onSelect: () => void toggleFavorite(song),
        },
        { label: 'Editar tags…', icon: 'tag', onSelect: () => editSongTags(song) },
        { label: 'Detalhes', icon: 'info', onSelect: () => songDetails(song) },
        { label: 'Editar título/artista', icon: 'edit', disabled: true, soon: true, hint: SOON },
      )
      return items
    },
    [player, library, addToPlaylist, removeFromPlaylist, moveInPlaylist, toggleFavorite, editSongTags, songDetails],
  )

  const openSongMenu = useCallback(
    (song: SongDTO, x: number, y: number, ctx?: SongContext) =>
      openMenu({ x, y, title: song.title, items: songMenuItems(song, ctx) }),
    [openMenu, songMenuItems],
  )

  // ---------------------------------------------------------------- playlists

  const createPlaylist = useCallback(
    (parentId: number | null = null) => {
      if (!library) return
      const parent = parentId != null ? findPlaylist(roots, parentId) : undefined
      openDialog((close) => (
        <NameDialog
          title={parent ? `Nova sub-playlist em "${parent.name}"` : 'Nova playlist'}
          label="Nome"
          submitLabel="Criar"
          onClose={close}
          onSubmit={async (name) => {
            const created = await api.libraries.createPlaylist(library.id, { name, parentId })
            toast(`Playlist "${created.name}" criada`, 'success')
            await refresh()
            navigate({ name: 'playlist', id: created.id })
          }}
        />
      ))
    },
    [library, roots, openDialog, toast, refresh, navigate],
  )

  const renamePlaylist = useCallback(
    (p: PlaylistRef) =>
      openDialog((close) => (
        <NameDialog
          title="Renomear playlist"
          label="Nome"
          initial={p.name}
          onClose={close}
          onSubmit={async (name) => {
            await api.playlists.update(p.id, { name })
            toast('Playlist renomeada', 'success')
            await refresh()
          }}
        />
      )),
    [openDialog, toast, refresh],
  )

  const movePlaylist = useCallback(
    (p: PlaylistRef) => {
      const node = findPlaylist(roots, p.id)
      if (!node) return
      openDialog((close) => (
        <MovePlaylistDialog
          playlist={node}
          roots={roots}
          onClose={close}
          onDone={async () => {
            toast(`"${p.name}" movida`, 'success')
            await refresh()
          }}
        />
      ))
    },
    [roots, openDialog, toast, refresh],
  )

  const deletePlaylist = useCallback(
    (p: PlaylistRef) => {
      const node = findPlaylist(roots, p.id)
      const removed = node ? subtreeIds(node) : new Set([p.id])
      const subCount = removed.size - 1
      openDialog((close) => (
        <ConfirmDialog
          title="Deletar playlist?"
          danger
          confirmLabel="Deletar"
          message={
            <>
              <p>
                <strong>{p.name}</strong>
                {subCount > 0 && <> e {plural(subCount, 'sub-playlist', 'sub-playlists')}</>} serão deletadas.
              </p>
              <p className="muted">As músicas continuam na biblioteca; só a organização é removida.</p>
            </>
          }
          onClose={close}
          onConfirm={async () => {
            await api.playlists.remove(p.id)
            toast(`Playlist "${p.name}" deletada`, 'success')
            if (route.name === 'playlist' && removed.has(route.id)) navigate({ name: 'home' }, true)
            await refresh()
          }}
        />
      ))
    },
    [roots, openDialog, toast, refresh, route, navigate],
  )

  const editPlaylistTags = useCallback(
    (p: PlaylistRef) =>
      openDialog((close) => (
        <TagsDialog
          title={`Tags de "${p.name}"`}
          initialTags={p.tags}
          add={async (name) => (await api.playlists.addTag(p.id, { name })).tags}
          remove={(tagId) => api.playlists.removeTag(p.id, tagId)}
          onChanged={() => void refresh()}
          onClose={close}
        />
      )),
    [openDialog, refresh],
  )

  const playPlaylist = useCallback(
    async (playlistId: number) => {
      try {
        const songs = await api.playlists.songs(playlistId)
        if (!songs.some((s) => s.available)) return toast('Esta playlist não tem músicas para tocar.')
        player.playList(songs)
      } catch (e) {
        fail(e)
      }
    },
    [player, toast, fail],
  )

  const playlistMenuItems = useCallback(
    (p: PlaylistRef): MenuEntry[] => [
      { label: 'Tocar', icon: 'play', onSelect: () => void playPlaylist(p.id) },
      'separator',
      { label: 'Renomear…', icon: 'edit', onSelect: () => renamePlaylist(p) },
      { label: 'Mover…', icon: 'move', disabled: !findPlaylist(roots, p.id), onSelect: () => movePlaylist(p) },
      { label: 'Criar sub-playlist…', icon: 'plus', onSelect: () => createPlaylist(p.id) },
      { label: 'Editar tags…', icon: 'tag', onSelect: () => editPlaylistTags(p) },
      { label: 'Mudar ordem entre playlists', icon: 'list', disabled: true, soon: true, hint: SOON },
      'separator',
      { label: 'Deletar…', icon: 'trash', danger: true, onSelect: () => deletePlaylist(p) },
    ],
    [roots, playPlaylist, renamePlaylist, movePlaylist, createPlaylist, editPlaylistTags, deletePlaylist],
  )

  const openPlaylistMenu = useCallback(
    (p: PlaylistRef, x: number, y: number) => openMenu({ x, y, title: p.name, items: playlistMenuItems(p) }),
    [openMenu, playlistMenuItems],
  )

  // ---------------------------------------------------------------- bibliotecas e disco

  const createLibrary = useCallback(
    () =>
      openDialog((close) => (
        <NameDialog
          title="Nova biblioteca"
          label="Nome"
          submitLabel="Criar"
          onClose={close}
          onSubmit={async (name) => {
            const created = await api.libraries.create(name)
            app.selectLibrary(created.id)
            toast(`Biblioteca "${created.name}" criada. Todas as músicas já estão nela, sem playlists.`, 'success')
            await refresh()
            navigate({ name: 'home' })
          }}
        />
      )),
    [openDialog, app, toast, refresh, navigate],
  )

  const renameLibrary = useCallback(
    (lib: LibraryDTO) =>
      openDialog((close) => (
        <NameDialog
          title="Renomear biblioteca"
          label="Nome"
          initial={lib.name}
          onClose={close}
          onSubmit={async (name) => {
            await api.libraries.rename(lib.id, name)
            toast('Biblioteca renomeada', 'success')
            await refresh()
          }}
        />
      )),
    [openDialog, toast, refresh],
  )

  const deleteLibrary = useCallback(
    (lib: LibraryDTO) =>
      openDialog((close) => (
        <ConfirmDialog
          title="Deletar biblioteca?"
          danger
          confirmLabel="Deletar"
          message={
            <>
              <p>
                <strong>{lib.name}</strong> e todas as playlists dela serão deletadas.
              </p>
              <p className="muted">Nenhum arquivo do disco é afetado.</p>
            </>
          }
          onClose={close}
          onConfirm={async () => {
            await api.libraries.remove(lib.id)
            const fallback = app.libraries.find((l) => l.isDefault && l.id !== lib.id)
            if (fallback && app.library?.id === lib.id) app.selectLibrary(fallback.id)
            toast(`Biblioteca "${lib.name}" deletada`, 'success')
            navigate({ name: 'home' }, true)
            await refresh()
          }}
        />
      )),
    [openDialog, app, toast, navigate, refresh],
  )

  const scan = useCallback(async () => {
    toast('Escaneando a pasta…')
    try {
      const r = await api.scan()
      toast(
        `Scan concluído: ${r.added} novas, ${r.updated} atualizadas, ${r.missing} ausentes, ${plural(r.playlistsCreated, 'playlist criada', 'playlists criadas')}.`,
        'success',
      )
      await refresh()
    } catch (e) {
      fail(e)
    }
  }, [toast, refresh, fail])

  const sync = useCallback(() => {
    if (!library) return
    openDialog((close) => <SyncDialog library={library} onClose={close} onDone={refresh} />)
  }, [library, openDialog, refresh])

  return {
    toggleFavorite,
    addToPlaylist,
    dropOnPlaylist,
    removeFromPlaylist,
    editSongTags,
    openSongMenu,
    createPlaylist,
    renamePlaylist,
    movePlaylist,
    deletePlaylist,
    editPlaylistTags,
    playPlaylist,
    openPlaylistMenu,
    createLibrary,
    renameLibrary,
    deleteLibrary,
    scan,
    sync,
  }
}
