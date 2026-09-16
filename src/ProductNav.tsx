import { useCallback, useState } from 'react'

type NavItem = { label: string; icon: string; selector: string }

const primary: NavItem[] = [
  { label: 'Home', icon: '⌂', selector: '' },
  { label: 'Prayer', icon: '☼', selector: '.phase3-launcher' },
  { label: 'Quran', icon: '☾', selector: '.phase2-launcher' },
  { label: 'Search', icon: '⌕', selector: '.global-search-launcher' },
]

const more: NavItem[] = [
  { label: 'Tools', icon: '✓', selector: '.phase3b-launcher' },
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

function activate(selector: string) {
  closeDialogs()
  if (!selector) {
    history.replaceState({ view: 'home' }, '', location.pathname + location.search)
    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'home' } }))
    return
  }
  document.querySelector<HTMLButtonElement>(selector)?.click()
}

export default function ProductNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const onClick = useCallback((selector: string) => {
    setMoreOpen(false)
    activate(selector)
  }, [])
  return <>
    {moreOpen && <div className="product-more-panel" role="dialog" aria-label="More NoorTools features" onClick={() => setMoreOpen(false)}>
      <div id="noortools-more-menu" className="product-more-menu" onClick={event => event.stopPropagation()}>
        <div className="product-more-head"><strong>More</strong><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more menu">×</button></div>
        {more.map(item => <button key={item.label} type="button" onClick={() => onClick(item.selector)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      </div>
    </div>}
    <nav className="bottom-nav product-nav" aria-label="Primary navigation">
      {primary.map(item => <button key={item.label} type="button" onClick={() => onClick(item.selector)} aria-label={item.label}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
      </button>)}
      <button type="button" onClick={() => setMoreOpen(value => !value)} aria-expanded={moreOpen} aria-controls="noortools-more-menu" aria-label="More features">
        <span aria-hidden="true">☰</span>More
      </button>
    </nav>
  </>
}
