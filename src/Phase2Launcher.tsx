import { useState } from 'react'
import ContentHub from './ContentHub'

export default function Phase2Launcher() {
  const [open, setOpen] = useState(false)
  if (!open) return <button className="phase2-launcher" onClick={() => setOpen(true)} aria-label="Open verified Islamic library">✦ <span>Library</span></button>
  return <div className="phase2-overlay" role="dialog" aria-modal="true" aria-label="Verified Islamic library"><ContentHub onBack={() => setOpen(false)} /></div>
}
