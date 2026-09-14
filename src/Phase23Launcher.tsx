import { useEffect, useMemo, useState } from 'react'
import { loadQuranTranslations, type QuranTranslation } from './quranTranslation'
import { HADITH_UI_STATE } from './hadith'
import { AUDIO_UI_STATE } from './quranAudio'

const sections = ['translation', 'hadith', 'audio'] as const
type Section = typeof sections[number]

export default function Phase23Launcher() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<Section>('translation')
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [translations, setTranslations] = useState<QuranTranslation[]>([])
  const [bookmarks, setBookmarks] = useState<string[]>(() => JSON.parse(localStorage.getItem('noortools:phase23:translation-bookmarks') || '[]') as string[])
  const [error, setError] = useState('')

  useEffect(() => { if (!open) return; void loadQuranTranslations().then(dataset => setTranslations(dataset.translations)).catch(e => setError(e instanceof Error ? e.message : 'Translation could not be loaded.')) }, [open])
  useEffect(() => { localStorage.setItem('noortools:phase23:translation-bookmarks', JSON.stringify(bookmarks)) }, [bookmarks])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return translations.filter(item => (selectedSurah === null || item.surah === selectedSurah) && (!needle || `${item.surah}:${item.ayah} ${item.text}`.toLocaleLowerCase().includes(needle))).slice(0, 80)
  }, [translations, selectedSurah, query])
  const surahs = useMemo(() => Array.from(new Set(translations.map(item => item.surah))), [translations])
  const toggleBookmark = (id: string) => setBookmarks(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  return <>
    <button className="phase23-launcher" onClick={() => setOpen(true)} aria-label="Open Phase 2.3 verified content">2.3 <span>Hadith · Translation · Audio</span></button>
    {open && <div className="phase2-overlay" role="dialog" aria-modal="true" aria-label="Phase 2.3 verified source library">
      <section className="page content-page">
        <div className="back"><button onClick={() => setOpen(false)} aria-label="Close Phase 2.3">←</button><h1>Phase 2.3</h1></div>
        <div className="content-tabs" role="tablist" aria-label="Phase 2.3 sections">{sections.map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{item === 'translation' ? 'Quran Translation' : item === 'hadith' ? 'Hadith' : 'Quran Audio'}</button>)}</div>
        {error && <div className="empty-panel" role="alert"><span>!</span><p>{error}</p></div>}

        {section === 'translation' && <div className="card">
          <p className="eyebrow">ENGLISH · PICKTHALL 1930</p>
          <h2>The Meaning of the Glorious Koran</h2>
          <p className="muted">Translator: Marmaduke William Pickthall · 1930 edition · source-verified public-domain work. No text edits are introduced by NoorTools.</p>
          <div className="row"><button className={selectedSurah === null ? 'selected' : ''} onClick={() => setSelectedSurah(null)}>All Surahs</button>{surahs.slice(0, 20).map(n => <button key={n} className={selectedSurah === n ? 'selected' : ''} onClick={() => setSelectedSurah(n)}>Surah {n}</button>)}</div>
          <input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search English translation" />
          {filtered.length === 0 ? <p className="muted">No matching translation ayahs.</p> : <div className="reader-list">{filtered.map(item => <article className="ayah-card" key={item.id}><div className="ayah-meta"><span>{item.surah}:{item.ayah}</span><button onClick={() => toggleBookmark(item.id)}>{bookmarks.includes(item.id) ? '★' : '☆'}</button></div><p>{item.text}</p><p className="footnote">{item.edition} · {item.translator}<br />Source: Project Gutenberg eBook #16955 · SHA-256 {item.source.contentHash}</p></article>)}</div>}
          <p className="footnote">Displayed text is fetched from the versioned Project Gutenberg source during build; generated data is validated to 6,236 ayahs. Translation review state: pending_scholar_review.</p>
        </div>}

        {section === 'hadith' && <div className="card"><p className="eyebrow">HADITH</p><h2>Unavailable — source not cleared</h2><p className="muted">No major Hadith collection is bundled or displayed yet. Sunnah.com API access does not establish a redistribution grant, and the audited fawazahmed0 corpus has unresolved text-license questions.</p><span className="status-pill">{HADITH_UI_STATE.reviewState}</span><p className="footnote">No Hadith number, Arabic, translation, grading, or reference is fabricated. A collection can be integrated only after edition-specific provenance and redistribution permission are proven.</p></div>}

        {section === 'audio' && <div className="card"><p className="eyebrow">QURAN AUDIO</p><h2>Unavailable — recording rights not cleared</h2><p className="muted">No recitation is streamed, bundled, or offered for download in this phase because a recording-specific NoorTools redistribution grant has not been established.</p><span className="status-pill">{AUDIO_UI_STATE.reviewState}</span><p className="footnote">The audio architecture is rights-gated. Offline/download controls are intentionally absent until the provider grants those rights.</p></div>}
      </section>
    </div>}
  </>
}
