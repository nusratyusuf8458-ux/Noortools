import { useCallback } from 'react'

type NavItem = { label: string; icon: string; selector: string }

const items: NavItem[] = [
  { label: 'Home', icon: '⌂', selector: '' },
  { label: 'Prayer', icon: '☼', selector: '.phase3-launcher' },
  { label: 'Library', icon: '✦', selector: '.phase2-launcher' },
  { label: 'Search', icon: '⌕', selector: '.global-search-launcher' },
  { label: 'More', icon: '☰', selector: '.phase3b-launcher' },
]

function activate(selector: string) {
  if (!selector) {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'home' } }))
    history.replaceState({ view: 'home' }, '', location.pathname + location.search)
    return
  }
  document.querySelector<HTMLButtonElement>(selector)?.click()
}

export default function ProductNav() {
  const onClick = useCallback((selector: string) => activate(selector), [])
  return <nav className="bottom-nav product-nav" aria-label="Primary navigation">
    {items.map(item => <button key={item.label} type="button" onClick={() => onClick(item.selector)} aria-label={item.label}>
      <span aria-hidden="true">{item.icon}</span>{item.label}
    </button>)}
  </nav>
}
