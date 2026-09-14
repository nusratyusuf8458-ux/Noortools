import { useState } from 'react'
import SearchExperience from './SearchExperience'

export default function GlobalSearchLauncher() {
  const [open, setOpen] = useState(false)
  return <>{!open && <button className="global-search-launcher" onClick={() => setOpen(true)} aria-label="Open verified content search">⌕ <span>Search</span></button>}{open && <SearchExperience onClose={() => setOpen(false)} />}</>
}
