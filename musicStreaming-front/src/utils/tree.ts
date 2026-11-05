import type { PlaylistTreeDTO } from '../api/types'

export interface FlatPlaylist {
  playlist: PlaylistTreeDTO
  depth: number
  path: string
}

export function flattenTree(nodes: PlaylistTreeDTO[], depth = 0, prefix = ''): FlatPlaylist[] {
  return nodes.flatMap((p) => {
    const path = prefix ? `${prefix} / ${p.name}` : p.name
    return [{ playlist: p, depth, path }, ...flattenTree(p.children, depth + 1, path)]
  })
}

export function findPlaylist(nodes: PlaylistTreeDTO[], id: number): PlaylistTreeDTO | undefined {
  for (const p of nodes) {
    if (p.id === id) return p
    const found = findPlaylist(p.children, id)
    if (found) return found
  }
  return undefined
}

/** Ids da playlist e de todos os descendentes. */
export function subtreeIds(node: PlaylistTreeDTO): Set<number> {
  const ids = new Set<number>([node.id])
  for (const child of node.children) subtreeIds(child).forEach((id) => ids.add(id))
  return ids
}

/** Caminho da raiz até a playlist (para breadcrumbs e expandir a árvore). */
export function ancestorsOf(nodes: PlaylistTreeDTO[], id: number): PlaylistTreeDTO[] {
  for (const p of nodes) {
    if (p.id === id) return [p]
    const inner = ancestorsOf(p.children, id)
    if (inner.length) return [p, ...inner]
  }
  return []
}

export function countSongs(nodes: PlaylistTreeDTO[]): number {
  return nodes.reduce((sum, p) => sum + p.songs.length + countSongs(p.children), 0)
}
