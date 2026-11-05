import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: number
  active?: boolean
  filled?: boolean
}

/** Botão só com ícone; label vira aria-label e tooltip. Área de toque mínima de 44px no CSS. */
export function IconButton({ icon, label, size = 20, active, filled, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-btn ${active ? 'is-active' : ''} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} filled={filled} />
    </button>
  )
}
