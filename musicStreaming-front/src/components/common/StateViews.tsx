import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Empty({ icon = 'music', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <Icon name={icon} size={36} />
      <strong>{title}</strong>
      {children && <div className="state__hint">{children}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <Icon name="info" size={32} />
      <strong>Algo deu errado</strong>
      <span className="state__hint">{message}</span>
      {onRetry && (
        <button className="btn btn--ghost" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}
