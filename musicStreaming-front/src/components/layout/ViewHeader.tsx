import type { ReactNode } from 'react'
import type { TagDTO } from '../../api/types'
import { useRoute } from '../../hooks/useRoute'
import { Cover } from '../common/Cover'
import type { IconName } from '../common/Icon'

interface Props {
  kind: string
  title: string
  seed: string
  icon?: IconName
  variant?: 'default' | 'favorites' | 'muted'
  meta?: ReactNode
  tags?: TagDTO[]
  breadcrumb?: ReactNode
  actions?: ReactNode
}

export function ViewHeader({ kind, title, seed, icon, variant, meta, tags, breadcrumb, actions }: Props) {
  const [, navigate] = useRoute()
  return (
    <>
      <header className="view-header">
        <Cover seed={seed} size="fill" icon={icon} variant={variant} className="view-header__cover" />
        <div className="view-header__text">
          {breadcrumb && <div className="view-header__crumbs">{breadcrumb}</div>}
          <span className="view-header__kind">{kind}</span>
          <h1 className="view-header__title">{title}</h1>
          {meta && <div className="view-header__meta">{meta}</div>}
          {tags && tags.length > 0 && (
            <div className="chips">
              {tags.map((t) => (
                <button key={t.id} className="chip chip--link" onClick={() => navigate({ name: 'tag', tag: t.name })}>
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {actions && <div className="view-actions">{actions}</div>}
    </>
  )
}
