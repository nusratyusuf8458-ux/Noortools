import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const GUTENBERG_URL = 'https://www.gutenberg.org/ebooks/16955.txt.utf-8'
const GUTENBERG_PAGE = 'https://www.gutenberg.org/ebooks/16955'
const OUT = 'public/content/phase-2.3-quran-translations.json'
const EXCLUDED = [
  { surah: 17, ayah: 33, printedPage: 285, reason: 'Absent from Project Gutenberg transcription; exact printed text not conclusively verified for redistribution.', sourceName: 'Internet Archive — The Meaning Of The Glorious Koran', sourceURL: 'https://archive.org/details/in.ernet.dli.2015.216140', recordURL: 'https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt', edition: 'The Meaning of the Glorious Koran, 1930', publisher: 'George Allen & Unwin', digitization: 'scan with ABBYY OCR-derived full text', manualCorrection: false, shippingStatus: 'unavailable_pending_verification' },
  { surah: 39, ayah: 46, printedPage: 478, reason: 'Absent from Project Gutenberg transcription; exact printed text not conclusively verified for redistribution.', sourceName: 'Internet Archive — The Meaning Of The Glorious Koran', sourceURL: 'https://archive.org/details/in.ernet.dli.2015.216140', recordURL: 'https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt', edition: 'The Meaning of the Glorious Koran, 1930', publisher: 'George Allen & Unwin', digitization: 'scan with ABBYY OCR-derived full text', manualCorrection: false, shippingStatus: 'unavailable_pending_verification' },
  { surah: 45, ayah: 32, printedPage: 516, reason: 'Absent from Project Gutenberg transcription; Internet Archive OCR wording differs from a previously hardcoded fallback, so no fallback is distributable.', sourceName: 'Internet Archive — The Meaning Of The Glorious Koran', sourceURL: 'https://archive.org/details/in.ernet.dli.2015.216140', recordURL: 'https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt', edition: 'The Meaning of the Glorious Koran, 1930', publisher: 'George Allen & Unwin', digitization: 'scan with ABBYY OCR-derived full text', manualCorrection: false, shippingStatus: 'unavailable_pending_verification' },
  { surah: 56, ayah: 26, printedPage: 562, reason: 'Absent from Project Gutenberg transcription; available OCR evidence conflicts with the previous fallback, which was rejected as incorrect.', sourceName: 'Internet Archive — The Meaning Of The Glorious Koran', sourceURL: 'https://archive.org/details/in.ernet.dli.2015.216140', recordURL: 'https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt', edition: 'The Meaning of the Glorious Koran, 1930', publisher: 'George Allen & Unwin', digitization: 'scan with ABBYY OCR-derived full text', manualCorrection: false, shippingStatus: 'unavailable_pending_verification' },
]

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }

function parsePickthall(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const items = []
  let current = null
  let collecting = false
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const marker = line.match(/^(\d{3})\.(\d{3})\s*$/)
    if (marker) {
      if (current?.parts.length) items.push({ ...current, text: current.parts.join(' ').replace(/\s+/g, ' ').trim() })
      current = { surah: Number(marker[1]), ayah: Number(marker[2]), parts: [] }
      collecting = false
      continue
    }
    if (!current) continue
    if (line.startsWith('P: ')) { current.parts.push(line.slice(3).trim()); collecting = true }
    else if (/^(Y|S):\s/.test(line)) collecting = false
    else if (collecting && line.trim() && !/^[-*]{3,}$/.test(line.trim())) current.parts.push(line.trim())
  }
  if (current?.parts.length) items.push({ ...current, text: current.parts.join(' ').replace(/\s+/g, ' ').trim() })
  return items
}

const tanzilManifest = JSON.parse(await readFile('public/content/quran-manifest.json', 'utf8'))
const surahCounts = tanzilManifest.surahCounts
if (!Array.isArray(surahCounts) || surahCounts.length !== 114 || surahCounts.reduce((sum, count) => sum + count, 0) !== 6236) throw new Error('Verified Tanzil manifest does not contain the expected 114-surah/6236-ayah partition.')

const response = await fetch(GUTENBERG_URL)
if (!response.ok) throw new Error(`Pickthall Gutenberg source download failed: HTTP ${response.status}`)
const gutenbergBytes = new Uint8Array(await response.arrayBuffer())
const gutenbergHash = sha256(gutenbergBytes)
const gutenbergItems = parsePickthall(new TextDecoder('utf-8', { fatal: true }).decode(gutenbergBytes))
const excludedKeys = new Set(EXCLUDED.map(item => `${item.surah}:${item.ayah}`))

const translations = gutenbergItems
  .filter(item => !excludedKeys.has(`${item.surah}:${item.ayah}`))
  .map(item => ({
    id: `quran-translation:en:pickthall-1930:${item.surah}:${item.ayah}`,
    surah: item.surah,
    ayah: item.ayah,
    language: 'en',
    translator: 'Marmaduke William Pickthall',
    edition: 'The Meaning of the Glorious Koran (1930)',
    text: item.text,
    contentHash: sha256(new TextEncoder().encode(item.text)),
    source: {
      id: 'quran-translation.pickthall.1930.gutenberg',
      name: 'Project Gutenberg eBook #16955',
      version: 'Updated 2020-12-12',
      sourceURL: GUTENBERG_URL,
      license: 'Public domain work',
      licenseURL: GUTENBERG_PAGE,
      copyrightHolder: 'Marmaduke William Pickthall (1875-1936), original 1930 work',
      attribution: 'Translator: Marmaduke William Pickthall; Project Gutenberg eBook #16955',
      redistributionStatus: 'cleared',
      modificationStatus: 'permitted',
      commercialUseStatus: 'permitted',
      contentHash: gutenbergHash,
      verificationStatus: 'verified',
      reviewStatus: 'pending_scholar_review',
      importDate: new Date().toISOString(),
    },
    reviewState: 'pending_scholar_review',
  }))

if (translations.length !== 6232) throw new Error(`Pickthall distributable set expected 6232 ayahs; received ${translations.length}.`)
const allKeys = new Set(translations.map(item => `${item.surah}:${item.ayah}`))
if (EXCLUDED.some(item => allKeys.has(`${item.surah}:${item.ayah}`))) throw new Error('An excluded Pickthall record was accidentally included.')
if (translations.some(item => !item.text.trim())) throw new Error('A distributable Pickthall record has empty translation text.')

await mkdir('public/content', { recursive: true })
await writeFile(OUT, JSON.stringify({
  schema: 'noortools.quran-translations', version: 2,
  translations,
  excluded: EXCLUDED.map(item => ({ ...item, sourceHash: null, recordContentHash: null, reviewer: null, reviewState: 'unavailable' })),
  audit: { canonicalAyahCount: 6236, distributableAyahCount: 6232, excludedAyahCount: 4, excludedKeys: EXCLUDED.map(item => `${item.surah}:${item.ayah}`), sourceHash: gutenbergHash, source: 'Project Gutenberg eBook #16955', note: 'The four excluded records are not reconstructed, normalized from another edition, or copied from Tanzil Arabic.' },
}, null, 2) + '\n', 'utf8')
console.log(`Phase 2.3 translation import: ${translations.length} distributable Pickthall ayahs / 4 excluded pending verification`)
console.log(`Pickthall Gutenberg SHA-256: ${gutenbergHash}`)
console.log(`Excluded: ${EXCLUDED.map(item => `${item.surah}:${item.ayah} p.${item.printedPage}`).join(', ')}`)
console.log(`Generated: ${OUT}`)
