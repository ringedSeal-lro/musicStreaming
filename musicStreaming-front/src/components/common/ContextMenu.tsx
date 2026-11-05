import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../../state/AppContext'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { Icon } from './Icon'

/** Menu de contexto: popup posicionado no desktop, folha inferior no celular. */
export function ContextMenu() {
  const { menu, closeMenu } = useApp()
  const isMobile = useIsMobile()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!menu || isMobile || !ref.current) return setPos(null)
    const { width, height } = ref.current.getBoundingClientRect()
    const margin = 8
    setPos({
      left: Math.max(margin, Math.min(menu.x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(menu.y, window.innerHeight - height - margin)),
    })
  }, [menu, isMobile])

  useEffect(() => {
    if (!menu) return
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length
        buttons[next]?.focus()
      }
    }
    const onScroll = () => !isMobile && closeMenu()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menu, closeMenu, isMobile])

  if (!menu) return null

  return (
    <div
      className={`menu-backdrop ${isMobile ? 'menu-backdrop--sheet' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && closeMenu()}
      onContextMenu={(e) => {
        e.preventDefault()
        closeMenu()
      }}
    >
      <div
        ref={ref}
        role="menu"
        aria-label={menu.title}
        className={isMobile ? 'menu menu--sheet' : 'menu'}
        style={isMobile ? undefined : pos ?? { left: menu.x, top: menu.y, visibility: 'hidden' }}
      >
        {menu.title && <div className="menu__title">{menu.title}</div>}
        {menu.items.map((item, i) =>
          item === 'separator' ? (
            <div key={i} className="menu__sep" role="separator" />
          ) : (
            <button
              key={i}
              role="menuitem"
              className={`menu__item ${item.danger ? 'menu__item--danger' : ''}`}
              disabled={item.disabled}
              title={item.disabled ? item.hint : undefined}
              onClick={() => {
                closeMenu()
                item.onSelect?.()
              }}
            >
              {item.icon && <Icon name={item.icon} size={18} />}
              <span>{item.label}</span>
              {item.soon && <small className="menu__hint">em breve</small>}
            </button>
          ),
        )}
        {isMobile && (
          <button className="menu__item menu__cancel" onClick={closeMenu}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
