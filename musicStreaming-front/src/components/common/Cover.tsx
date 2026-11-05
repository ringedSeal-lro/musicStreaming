import { hashString } from '../../utils/format'
import { Icon, type IconName } from './Icon'

interface Props {
  seed: string
  size?: number | 'fill'
  icon?: IconName
  variant?: 'default' | 'favorites' | 'muted'
  className?: string
}

/** Capa gerada: gradiente com matiz derivado do nome + ícone. */
export function Cover({ seed, size = 48, icon = 'music', variant = 'default', className = '' }: Props) {
  const hue = hashString(seed) % 360
  const background =
    variant === 'favorites'
      ? 'linear-gradient(135deg, var(--accent-strong), #f472b6)'
      : variant === 'muted'
        ? 'linear-gradient(135deg, #3a3a44, #24242b)'
        : `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 50) % 360} 60% 22%))`
  const style =
    size === 'fill' ? { background } : { background, width: size, height: size, minWidth: size }
  const iconSize = size === 'fill' ? 48 : Math.max(16, Math.round(size * 0.42))
  return (
    <div className={`cover ${className}`} style={style} aria-hidden="true">
      <Icon name={icon} size={iconSize} filled={variant === 'favorites' && icon === 'heart'} />
    </div>
  )
}
