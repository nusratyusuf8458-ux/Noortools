import { useEffect, useState } from 'react'
import ContentHub from './ContentHub'

export default function ContentShell() {
  const [open, setOpen] = useState(() => window.location.hash === '#library')

  useEffect(() => {
    const onHash = () => setOpen(window.location.hash === '#library')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openLibrary = () => { history.pushState({ view: 'library' }, '', '#library'); setOpen(true) }
  const closeLibrary = () => { history.pushState({ view: 'home' }, '', '#home'); setOpen(false) }

  return <>
    {!open && <button className="library-launcher" onClick={openLibrary} aria-label="Open verified library">Library</button>}
    {open && <div className="content-overlay"><ContentHub onBack={closeLibrary} /></div>}
  </>
}
