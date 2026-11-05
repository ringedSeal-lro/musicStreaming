// Espelho exato dos DTOs do back-end (musicStreaming-api/.../dto).
// Datas (Instant) chegam como string ISO-8601.

export interface TagDTO {
  id: number
  name: string
}

export interface SongDTO {
  id: number
  title: string
  artist: string | null
  album: string | null
  albumArtist: string | null
  durationSec: number | null
  favorite: boolean
  available: boolean
  addedAt: string
  tags: TagDTO[]
  paths: string[]
}

export interface LibraryDTO {
  id: number
  name: string
  isDefault: boolean
  playlistCount: number
  createdAt: string
}

export interface PlaylistTreeDTO {
  id: number
  parentId: number | null
  name: string
  position: number
  tags: TagDTO[]
  songs: SongDTO[]
  children: PlaylistTreeDTO[]
}

export interface LibraryTreeDTO {
  id: number
  name: string
  isDefault: boolean
  playlists: PlaylistTreeDTO[]
  unorganizedSongs: SongDTO[]
}

export interface PlaylistSummaryDTO {
  id: number
  libraryId: number
  parentId: number | null
  name: string
  position: number
  songCount: number
  childCount: number
  tags: TagDTO[]
}

export interface PlaylistDTO {
  id: number
  libraryId: number
  parentId: number | null
  name: string
  position: number
  songCount: number
  tags: TagDTO[]
  children: PlaylistSummaryDTO[]
  createdAt: string
  updatedAt: string
}

export interface FolderDTO {
  id: number
  parentId: number | null
  name: string
  path: string
  childCount: number
  songCount: number
}

export interface FolderTreeDTO {
  id: number
  name: string
  path: string
  songs: SongDTO[]
  children: FolderTreeDTO[]
}

export interface SearchResultDTO {
  query: string
  songs: SongDTO[]
  playlists: PlaylistSummaryDTO[]
}

export interface ScanResultDTO {
  added: number
  updated: number
  missing: number
  foldersCreated: number
  foldersRemoved: number
  playlistsCreated: number
}

export type SyncOperationType = 'MKDIR' | 'MOVE' | 'LINK' | 'RMDIR'

export interface SyncOperationDTO {
  type: SyncOperationType
  source: string | null
  target: string
}

export interface SyncResultDTO {
  libraryId: number
  dryRun: boolean
  operations: SyncOperationDTO[]
  applied: number
  error: string | null
  scan: ScanResultDTO | null
}

export interface PageDTO<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Corpo de erro do GlobalExceptionHandler. */
export interface ApiErrorBody {
  status: number
  error: string
  message: string
  timestamp: string
}

// ---- corpos de requisição ----

export interface CreatePlaylistRequest {
  name: string
  parentId?: number | null
}

/** PATCH /playlists/{id}: campos ausentes não mudam; parentId: null move para a raiz. */
export interface UpdatePlaylistRequest {
  name?: string
  parentId?: number | null
}

/** Tag por id existente ou por nome (criada se não existir). */
export type TagRef = { tagId: number } | { name: string }
