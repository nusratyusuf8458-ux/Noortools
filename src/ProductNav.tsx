import { useCallback, useEffect, useState } from 'react'

type NavItem = { label: string; icon: string; selector: string; view?: string }

const primary: NavItem[] = [
  { label: 'Home', icon: '⌂', selector: '', view: 'home' },
  { label: 'Prayer', icon: '☼', selector: '.phase3-launcher' },
  { label: 'Quran', icon: '☾', selector: '.phase2-launcher' },
  { label: 'Search', icon: '⌕', selector: '.global-search-launcher' },
]

const more: NavItem[] = [
  { label: 'Qibla', icon: '◉', selector: '', view: 'qibla' },
  { label: 'Tasbih', icon: '◌', selector: '', view: 'tasbih' },
  { label: 'Salah', icon: '✓', selector: '', view: 'salah' },
  { label: 'Tools', icon: '⌘', selector: '.phase3b-launcher' },
  { label: 'Hajj & Umrah', icon: '✧', selector: '.phase3c-launcher' },
  { label: 'Mosques', icon: '⌖', selector: '.mosque-launcher' },
  { label: 'Learning', icon: '📖', selector: '.phase3e-launcher' },
  { label: 'Translations', icon: '文', selector: '.phase23-launcher' },
]

const overlaySelectors = [
  '.phase2-overlay', '.phase23-overlay', '.phase3-overlay', '.phase3b-overlay',
  '.phase3c-overlay', '.phase3e-overlay', '.mosque-overlay', '.search-experience',
]

function closeDialogs() {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>(overlaySelectors.join(',')))
  for (const overlay of overlays.reverse()) {
    const close = overlay.querySelector<HTMLButtonElement>(
      '.back button, .mosque-header > button, .search-header > button, .back-link, button[aria-label*="Close"], button[aria-label*="close"]',
    )
    close?.click()
  }
}

function navigateView(view: string) {
  closeDialogs()
  history.pushState({ view }, '', `#${view}`)
  window.dispatchEvent(new PopStateEvent('popstate', { state: { view } }))
}

function activate(item: NavItem) {
  if (item.view) {
    closeDialogs()
    if (item.view === 'home') history.replaceState({ view: 'home' }, '', location.pathname + location.search)
    else history.pushState({ view: item.view }, '', `#${item.view}`)
    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: item.view } }))
    return
  }
  closeDialogs()
  document.querySelector<HTMLButtonElement>(item.selector)?.click()
}

function viewKeyFromHash() {
  const hash = location.hash.replace(/^#/, '')
  return hash || 'home'
}

export default function ProductNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [active, setActive] = useState(viewKeyFromHash)
  const onClick = useCallback((item: NavItem) => {
    setMoreOpen(false)
    setActive(item.view || item.label.toLowerCase())
    activate(item)
  }, [])
  useEffect(() => {
    const onPop = () => setActive(viewKeyFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return <>
    {moreOpen && <div className="product-more-panel" role="dialog" aria-modal="true" aria-label="More NoorTools features" onClick={() => setMoreOpen(false)}>
      <div id="noortools-more-menu" className="product-more-menu" onClick={event => event.stopPropagation()}>
        <div className="product-more-head"><strong>More</strong><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more menu">×</button></div>
        {more.map(item => <button key={item.label} type="button" onClick={() => onClick(item)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      </div>
    </div>}
    <nav className="bottom-nav product-nav" aria-label="Primary navigation">
      {primary.map(item => <button key={item.label} type="button" onClick={() => onClick(item)} aria-label={item.label} aria-current={active === (item.view || item.label.toLowerCase()) ? 'page' : undefined}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
      </button>)}
      <button type="button" onClick={() => setMoreOpen(value => !value)} aria-expanded={moreOpen} aria-controls="noortools-more-menu" aria-label="More features">
        <span aria-hidden="true">☰</span>More
      </button>
    </nav>
  </>
}
