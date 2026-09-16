import { useCallback, useState } from 'react'

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

function closeDialogs() {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
  for (const dialog of dialogs.reverse()) {
    const close = dialog.querySelector<HTMLButtonElement>('.back button, button[aria-label^="Close"], button[aria-label*="Close"]')
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
    if (item.view === 'home') {
      closeDialogs()
      history.replaceState({ view: 'home' }, '', location.pathname + location.search)
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'home' } }))
    } else navigateView(item.view)
    return
  }
  closeDialogs()
  document.querySelector<HTMLButtonElement>(item.selector)?.click()
}

export default function ProductNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const onClick = useCallback((item: NavItem) => {
    setMoreOpen(false)
    activate(item)
  }, [])
  return <>
    {moreOpen && <div className="product-more-panel" role="dialog" aria-label="More NoorTools features" onClick={() => setMoreOpen(false)}>
      <div id="noortools-more-menu" className="product-more-menu" onClick={event => event.stopPropagation()}>
        <div className="product-more-head"><strong>More</strong><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more menu">×</button></div>
        {more.map(item => <button key={item.label} type="button" onClick={() => onClick(item)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      </div>
    </div>}
    <nav className="bottom-nav product-nav" aria-label="Primary navigation">
      {primary.map(item => <button key={item.label} type="button" onClick={() => onClick(item)} aria-label={item.label}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
      </button>)}
      <button type="button" onClick={() => setMoreOpen(value => !value)} aria-expanded={moreOpen} aria-controls="noortools-more-menu" aria-label="More features">
        <span aria-hidden="true">☰</span>More
      </button>
    </nav>
  </>
}
