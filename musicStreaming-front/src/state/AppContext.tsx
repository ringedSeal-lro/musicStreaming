import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, errorText } from '../api/client'
import type { LibraryDTO, LibraryTreeDTO } from '../api/types'
import type { IconName } from '../components/common/Icon'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

export interface MenuItem {
  label: string
  icon?: IconName
  onSelect?: () => void
  disabled?: boolean
  /** Dica mostrada em itens desabilitados (ex.: "em breve"). */
  hint?: string
  /** Recurso sem suporte na API: mostra o selo "em breve". */
  soon?: boolean
  danger?: boolean
}

export type MenuEntry = MenuItem | 'separator'

export interface MenuState {
  x: number
  y: number
  title?: string
  items: MenuEntry[]
}

type DialogRender = (close: () => void) => ReactNode

interface AppContextValue {
  libraries: LibraryDTO[]
  library: LibraryDTO | null
  librariesLoading: boolean
  librariesError: string | null
  selectLibrary: (id: number) => void
  tree: LibraryTreeDTO | null
  treeLoading: boolean
  treeError: string | null
  /** Incrementa a cada refresh; as telas usam como dependência para recarregar. */
  version: number
  refresh: () => Promise<void>
  toast: (message: string, kind?: ToastKind) => void
  toasts: Toast[]
  dismissToast: (id: number) => void
  dialog: DialogRender | null
  openDialog: (render: DialogRender) => void
  closeDialog: () => void
  menu: MenuState | null
  openMenu: (menu: MenuState) => void
  closeMenu: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const STORAGE_KEY = 'musicStreaming.libraryId'

function readStoredLibrary(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [libraries, setLibraries] = useState<LibraryDTO[]>([])
  const [librariesLoading, setLibrariesLoading] = useState(true)
  const [librariesError, setLibrariesError] = useState<string | null>(null)
  const [libraryId, setLibraryId] = useState<number | null>(readStoredLibrary)
  const [tree, setTree] = useState<LibraryTreeDTO | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<DialogRender | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const toastId = useRef(0)

  const library = useMemo(() => {
    if (!libraries.length) return null
    return (
      libraries.find((l) => l.id === libraryId) ?? libraries.find((l) => l.isDefault) ?? libraries[0]
    )
  }, [libraries, libraryId])

  const loadLibraries = useCallback(async () => {
    try {
      const list = await api.libraries.list()
      setLibraries(list)
      setLibrariesError(null)
    } catch (e) {
      setLibrariesError(errorText(e))
    } finally {
      setLibrariesLoading(false)
    }
  }, [])

  const loadTree = useCallback(async (id: number) => {
    setTreeLoading(true)
    try {
      setTree(await api.libraries.tree(id))
      setTreeError(null)
    } catch (e) {
      setTreeError(errorText(e))
    } finally {
      setTreeLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLibraries()
  }, [loadLibraries])

  const currentId = library?.id ?? null
  useEffect(() => {
    if (currentId == null) {
      setTree(null)
      return
    }
    void loadTree(currentId)
  }, [currentId, loadTree])

  const selectLibrary = useCallback((id: number) => {
    setLibraryId(id)
    try {
      localStorage.setItem(STORAGE_KEY, String(id))
    } catch {
      // armazenamento indisponível: só não lembra a escolha
    }
  }, [])

  const refresh = useCallback(async () => {
    await loadLibraries()
    if (currentId != null) await loadTree(currentId)
    setVersion((v) => v + 1)
  }, [loadLibraries, loadTree, currentId])

  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++toastId.current
      setToasts((list) => [...list.slice(-3), { id, message, kind }])
      window.setTimeout(() => dismissToast(id), kind === 'error' ? 7000 : 4000)
    },
    [dismissToast],
  )

  const openDialog = useCallback((render: DialogRender) => {
    setMenu(null)
    setDialog(() => render)
  }, [])
  const closeDialog = useCallback(() => setDialog(null), [])
  const openMenu = useCallback((state: MenuState) => setMenu(state), [])
  const closeMenu = useCallback(() => setMenu(null), [])

  const value: AppContextValue = {
    libraries,
    library,
    librariesLoading,
    librariesError,
    selectLibrary,
    tree: tree && tree.id === currentId ? tree : null,
    treeLoading,
    treeError,
    version,
    refresh,
    toast,
    toasts,
    dismissToast,
    dialog,
    openDialog,
    closeDialog,
    menu,
    openMenu,
    closeMenu,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fora do AppProvider')
  return ctx
}
