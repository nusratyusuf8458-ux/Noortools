import { useEffect, useMemo, useState } from 'react'
import { loadQuranTranslations, searchQuranTranslations, toggleTranslationBookmark, type QuranTranslation } from './quranTranslation'
import { HADITH_UI_STATE } from './hadith'
import { AUDIO_UI_STATE } from './quranAudio'
import { preserveCorruptStorage } from './storageRecovery'

const sections = ['translation', 'hadith', 'audio'] as const
type Section = typeof sections[number]

function safeBookmarks(): string[] {
  const key = 'noortools:phase23:translation-bookmarks'
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) return parsed
      preserveCorruptStorage(key, raw, 'Translation bookmark data has an invalid structure.')
    } catch (error) {
      preserveCorruptStorage(key, raw, error instanceof Error ? error.message : 'Translation bookmark data is not valid JSON.')
    }
  } catch {}
  return []
}

export default function Phase23Launcher() {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<Section>('translation')
  const [query, setQuery] = useState('')
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null)
  const [translations, setTranslations] = useState<QuranTranslation[]>([])
  const [bookmarks, setBookmarks] = useState<string[]>(safeBookmarks)
  const [excluded, setExcluded] = useState<{ surah: number; ayah: number; printedPage: number }[]>([])
  const [error, setError] = useState('')

  useEffect(() => { if (!open) return; void loadQuranTranslations().then(dataset => { setTranslations(dataset.translations); setExcluded(dataset.excluded.map(item => ({ surah: item.surah, ayah: item.ayah, printedPage: item.printedPage }))) }).catch(e => setError(e instanceof Error ? e.message : 'Translation could not be loaded.')) }, [open])
  useEffect(() => { localStorage.setItem('noortools:phase23:translation-bookmarks', JSON.stringify(bookmarks)) }, [bookmarks])

  const filtered = useMemo(() => searchQuranTranslations(translations.filter(item => selectedSurah === null || item.surah === selectedSurah), query).slice(0, 80), [translations, selectedSurah, query])
  const surahs = useMemo(() => Array.from(new Set(translations.map(item => item.surah))), [translations])

  return <>
    <button className="phase23-launcher" onClick={() => setOpen(true)} aria-label="Open Quran translations, Hadith and audio"Quran translations <span>Hadith · Translation · Audio</span></button>
    {open && <div className="phase2-overlay" role="dialog" aria-modal="true" aria-label="Quran translations, Hadith and audio">
      <section className="page content-page">
        <div className="back"><button onClick={() => setOpen(false)} aria-label="Close Quran translations, Hadith and audio">←</button><h1>Quran translations & audio</h1></div>
        <div className="content-tabs" role="tablist" aria-label="Quran translations, Hadith and audio sections">{sections.map(item => <button key={item} className={section === item ? 'selected' : ''} onClick={() => setSection(item)} role="tab" aria-selected={section === item}>{item === 'translation' ? 'Quran Translation' : item === 'hadith' ? 'Hadith' : 'Quran Audio'}</button>)}</div>
        {error && <div className="empty-panel" role="alert"><span>!</span><p>{error}</p></div>}

        {section === 'translation' && <div className="card">
          <p className="eyebrow">ENGLISH · PICKTHALL 1930</p>
          <h2>The Meaning of the Glorious Koran</h2>
          <p className="muted">Translator: Marmaduke William Pickthall · 1930 edition · source-verified public-domain work. NoorTools does not claim scholar review.</p>
          <label>Surah<select value={selectedSurah ?? ''} onChange={e => setSelectedSurah(e.target.value ? Number(e.target.value) : null)}><option value="">All Surahs</option>{surahs.map(n => <option key={n} value={n}>Surah {n}</option>)}</select></label>
          <input className="content-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search English translation or 2:255" />
          {filtered.length === 0 ? <p className="muted">{translations.length ? 'No matching translation ayahs.' : 'Loading the verified translation…'}</p> : <div className="reader-list">{filtered.map(item => <article className="ayah-card" key={item.id}><div className="ayah-meta"><span>{item.surah}:{item.ayah}</span><button aria-label={`${bookmarks.includes(item.id) ? 'Remove' : 'Add'} bookmark for ${item.surah}:${item.ayah}`} onClick={() => setBookmarks(current => toggleTranslationBookmark(current, item.id))}>{bookmarks.includes(item.id) ? '★' : '☆'}</button></div><p>{item.text}</p><p className="footnote">{item.edition} · {item.translator}<br />Source: {item.source.name}<br />{item.source.sourceURL}<br />Source SHA-256 {item.source.contentHash}<br />Record SHA-256 {item.contentHash}</p></article>)}</div>}
          <div className="empty-panel"><span>!</span><p><b>4 ayahs are unavailable pending exact edition verification:</b> {excluded.map(item => `${item.surah}:${item.ayah} (printed p. ${item.printedPage})`).join(', ')}. They are not reconstructed, merged from another edition, or copied from Tanzil Arabic.</p></div>
          <p className="footnote">Distributable set: 6,232 of the canonical 6,236 ayah IDs. Translation review state: pending_scholar_review. No “Scholar Verified” claim is made.</p>
        </div>}

        {section === 'hadith' && <div className="card"><p className="eyebrow">HADITH</p><h2>Unavailable — source not cleared</h2><p className="muted">No major Hadith collection is bundled or displayed yet. Sunnah.com API access does not establish a redistribution grant, and the audited fawazahmed0 corpus has unresolved text-license questions.</p><span className="status-pill">{HADITH_UI_STATE.reviewState}</span><p className="footnote">No Hadith number, Arabic, translation, grading, or reference is fabricated. A collection can be integrated only after edition-specific provenance and redistribution permission are proven.</p></div>}

        {section === 'audio' && <div className="card"><p className="eyebrow">QURAN AUDIO</p><h2>Unavailable — recording rights not cleared</h2><p className="muted">No recitation is streamed, bundled, or offered for download because a recording-specific NoorTools redistribution grant has not been established.</p><span className="status-pill">{AUDIO_UI_STATE.reviewState}</span><p className="footnote">The audio architecture is rights-gated. Offline/download controls are intentionally absent until the provider grants those rights.</p></div>}
      </section>
    </div>}
  </>
}
