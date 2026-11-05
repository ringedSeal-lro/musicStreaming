import type {
  ApiErrorBody,
  CreatePlaylistRequest,
  FolderDTO,
  FolderTreeDTO,
  LibraryDTO,
  LibraryTreeDTO,
  PageDTO,
  PlaylistDTO,
  PlaylistSummaryDTO,
  ScanResultDTO,
  SearchResultDTO,
  SongDTO,
  SyncResultDTO,
  TagDTO,
  TagRef,
  UpdatePlaylistRequest,
} from './types'

/** URL base configurável (VITE_API_BASE). Padrão: /api, servido via proxy. */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Usa o "message" do GlobalExceptionHandler; cai para "error" (erro padrão do Spring). */
async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as Partial<ApiErrorBody>
    if (data.message) return data.message
    if (data.error) return `${data.error} (${response.status})`
  } catch {
    // corpo vazio ou não-JSON
  }
  return `Erro ${response.status}`
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  scan: () => request<ScanResultDTO>('POST', '/scan'),
  settings: () => request<Record<string, string>>('GET', '/settings'),
  search: (q: string, libraryId?: number | null) =>
    request<SearchResultDTO>('GET', `/search${query({ q, libraryId })}`),

  libraries: {
    list: () => request<LibraryDTO[]>('GET', '/libraries'),
    get: (id: number) => request<LibraryDTO>('GET', `/libraries/${id}`),
    create: (name: string) => request<LibraryDTO>('POST', '/libraries', { name }),
    rename: (id: number, name: string) => request<LibraryDTO>('PATCH', `/libraries/${id}`, { name }),
    remove: (id: number) => request<void>('DELETE', `/libraries/${id}`),
    tree: (id: number) => request<LibraryTreeDTO>('GET', `/libraries/${id}/tree`),
    playlists: (id: number) => request<PlaylistSummaryDTO[]>('GET', `/libraries/${id}/playlists`),
    createPlaylist: (id: number, body: CreatePlaylistRequest) =>
      request<PlaylistDTO>('POST', `/libraries/${id}/playlists`, body),
    sync: (id: number, dryRun: boolean) =>
      request<SyncResultDTO>('POST', `/libraries/${id}/sync${query({ dryRun })}`),
  },

  playlists: {
    get: (id: number) => request<PlaylistDTO>('GET', `/playlists/${id}`),
    update: (id: number, body: UpdatePlaylistRequest) => request<PlaylistDTO>('PATCH', `/playlists/${id}`, body),
    remove: (id: number) => request<void>('DELETE', `/playlists/${id}`),
    songs: (id: number) => request<SongDTO[]>('GET', `/playlists/${id}/songs`),
    addSongs: (id: number, songIds: number[]) => request<SongDTO[]>('POST', `/playlists/${id}/songs`, { songIds }),
    removeSong: (id: number, songId: number) => request<void>('DELETE', `/playlists/${id}/songs/${songId}`),
    reorder: (id: number, songIds: number[]) =>
      request<SongDTO[]>('PUT', `/playlists/${id}/songs/order`, { songIds }),
    addTag: (id: number, ref: TagRef) => request<PlaylistDTO>('POST', `/playlists/${id}/tags`, ref),
    removeTag: (id: number, tagId: number) => request<void>('DELETE', `/playlists/${id}/tags/${tagId}`),
  },

  songs: {
    list: (params: { favorite?: boolean; tag?: string; page?: number; size?: number } = {}) =>
      request<PageDTO<SongDTO>>('GET', `/songs${query(params)}`),
    get: (id: number) => request<SongDTO>('GET', `/songs/${id}`),
    streamUrl: (id: number) => `${API_BASE}/songs/${id}/stream`,
    setFavorite: (id: number, favorite: boolean) =>
      request<SongDTO>(favorite ? 'PUT' : 'DELETE', `/songs/${id}/favorite`),
    addTag: (id: number, ref: TagRef) => request<SongDTO>('POST', `/songs/${id}/tags`, ref),
    removeTag: (id: number, tagId: number) => request<void>('DELETE', `/songs/${id}/tags/${tagId}`),
  },

  tags: {
    list: () => request<TagDTO[]>('GET', '/tags'),
    create: (name: string) => request<TagDTO>('POST', '/tags', { name }),
    remove: (id: number) => request<void>('DELETE', `/tags/${id}`),
  },

  folders: {
    roots: () => request<FolderDTO[]>('GET', '/folders'),
    get: (id: number) => request<FolderDTO>('GET', `/folders/${id}`),
    tree: (id: number) => request<FolderTreeDTO>('GET', `/folders/${id}/tree`),
  },
}

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Erro inesperado.'
}
