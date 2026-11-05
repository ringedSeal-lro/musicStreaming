import { useRoute, type Route } from '../../hooks/useRoute'
import { Icon, type IconName } from '../common/Icon'

const ITEMS: { route: Route; label: string; icon: IconName; match: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Início', icon: 'home', match: ['home'] },
  { route: { name: 'search', q: '' }, label: 'Buscar', icon: 'search', match: ['search', 'tag'] },
  {
    route: { name: 'library' },
    label: 'Biblioteca',
    icon: 'library',
    match: ['library', 'playlist', 'favorites', 'all', 'unorganized'],
  },
]

export function BottomNav() {
  const [route, navigate] = useRoute()
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {ITEMS.map((item) => {
        const active = item.match.includes(route.name)
        return (
          <button
            key={item.label}
            className={`bottom-nav__item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item.route)}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
