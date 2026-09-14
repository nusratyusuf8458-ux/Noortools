import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const GUTENBERG_URL = 'https://www.gutenberg.org/ebooks/16955.txt.utf-8'
const GUTENBERG_PAGE = 'https://www.gutenberg.org/ebooks/16955'
const IA_URL = 'https://archive.org/stream/in.ernet.dli.2015.216140/2015.216140.The-Meaning_djvu.txt'
const IA_PAGE = 'https://archive.org/details/in.ernet.dli.2015.216140'
const OUT = 'public/content/phase-2.3-quran-translations.json'

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function compactLetters(value) { return value.toLocaleLowerCase().replace(/[^a-z]+/g, '') }

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
    if (line.startsWith('P: ')) {
      current.parts.push(line.slice(3).trim())
      collecting = true
    } else if (/^(Y|S):\s/.test(line)) {
      collecting = false
    } else if (collecting && line.trim() && !/^[-*]{3,}$/.test(line.trim())) {
      current.parts.push(line.trim())
    }
  }
  if (current?.parts.length) items.push({ ...current, text: current.parts.join(' ').replace(/\s+/g, ' ').trim() })
  return items
}

const MISSING_FROM_GUTENBERG = new Map([
  ['17:33', 'And slay not the life which Allah hath forbidden save with right. Whoso is slain wrongfully, We have given power unto his heir, but let him not commit excess in slaying. Lo! he will be helped.'],
  ['39:46', 'Say: O Allah! Creator of the heavens and the earth! Knower of the Invisible and the Visible! Thou wilt judge between Thy slaves concerning that wherein they used to differ.'],
  [
    '45:32',
    "And when it was said: Lo! Allah's promise is the truth, and there is no doubt of the Hour's coming, ye said: We know not what the Hour is. We deem it naught but an opinion, and we are not convinced.",
  ],
  ['56:26', 'No idle talk, no cause of sin,'],
])

const TOTAL_VERSES = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 18, 15, 15, 15, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 6]

const response = await fetch(GUTENBERG_URL)
if (!response.ok) throw new Error(`Pickthall Gutenberg source download failed: HTTP ${response.status}`)
const gutenbergBytes = new Uint8Array(await response.arrayBuffer())
const gutenbergHash = sha256(gutenbergBytes)
const gutenbergText = new TextDecoder('utf-8', { fatal: true }).decode(gutenbergBytes)
const gutenbergItems = parsePickthall(gutenbergText)

const iaResponse = await fetch(IA_URL)
if (!iaResponse.ok) throw new Error(`Pickthall Internet Archive scan text download failed: HTTP ${iaResponse.status}`)
const iaBytes = new Uint8Array(await iaResponse.arrayBuffer())
const iaHash = sha256(iaBytes)
const iaText = new TextDecoder('utf-8', { fatal: true }).decode(iaBytes)
for (const phrase of ['slay not the life', 'Creator of the heavens and the earth', "Allah's promise is the truth", 'no idle talk']) {
  if (!compactLetters(iaText).includes(compactLetters(phrase))) throw new Error(`Internet Archive scan text does not contain required evidence phrase: ${phrase}`)
}

const expectedKeys = []
for (let surah = 1; surah <= 114; surah += 1) for (let ayah = 1; ayah <= TOTAL_VERSES[surah - 1]; ayah += 1) expectedKeys.push(`${surah}:${ayah}`)
const gutenbergMap = new Map(gutenbergItems.map(item => [`${item.surah}:${item.ayah}`, item.text]))
const sources = {
  gutenberg: { id: 'quran-translation.pickthall.1930.gutenberg', name: 'Project Gutenberg eBook #16955', version: 'Updated 2020-12-12', sourceURL: GUTENBERG_URL, license: 'Public domain work', licenseURL: GUTENBERG_PAGE, copyrightHolder: 'Marmaduke William Pickthall (1875-1936), original 1930 work', attribution: 'Translator: Marmaduke William Pickthall; Project Gutenberg eBook #16955', redistributionStatus: 'cleared', modificationStatus: 'permitted', commercialUseStatus: 'permitted', contentHash: gutenbergHash, verificationStatus: 'verified', reviewStatus: 'pending_scholar_review' },
  internetArchive: { id: 'quran-translation.pickthall.1930.internet-archive', name: 'Internet Archive — The Meaning Of The Glorious Koran', version: '1930 edition; item in.ernet.dli.2015.216140; FULL TEXT export', sourceURL: IA_URL, license: 'Public domain work', licenseURL: IA_PAGE, copyrightHolder: 'Marmaduke William Pickthall (1875-1936), original 1930 work', attribution: 'Translator: Marmaduke William Pickthall; Internet Archive item in.ernet.dli.2015.216140', redistributionStatus: 'cleared', modificationStatus: 'permitted', commercialUseStatus: 'permitted', contentHash: iaHash, verificationStatus: 'verified', reviewStatus: 'pending_scholar_review' },
}

const translations = expectedKeys.map(key => {
  const [surah, ayah] = key.split(':').map(Number)
  const fromGutenberg = gutenbergMap.get(key)
  const text = fromGutenberg || MISSING_FROM_GUTENBERG.get(key)
  if (!text) throw new Error(`Missing Pickthall ayah with no audited source: ${key}`)
  const source = fromGutenberg ? sources.gutenberg : sources.internetArchive
  return {
    id: `quran-translation:en:pickthall-1930:${surah}:${ayah}`,
    surah,
    ayah,
    language: 'en',
    translator: 'Marmaduke William Pickthall',
    edition: 'The Meaning of the Glorious Koran (1930)',
    text,
    contentHash: sha256(new TextEncoder().encode(text)),
    source: { ...source, importDate: new Date().toISOString() },
    reviewState: 'pending_scholar_review',
  }
})

if (translations.length !== 6236) throw new Error(`Pickthall import expected 6236 ayahs; received ${translations.length}.`)
await mkdir('public/content', { recursive: true })
await writeFile(OUT, JSON.stringify({ schema: 'noortools.quran-translations', version: 1, translations }, null, 2) + '\n', 'utf8')
console.log(`Phase 2.3 translation import: ${translations.length} Pickthall ayahs`)
console.log(`Pickthall Gutenberg SHA-256: ${gutenbergHash}`)
console.log(`Pickthall Internet Archive SHA-256: ${iaHash}`)
console.log('Four Gutenberg omissions are sourced from the audited 1930 scan/full-text record set; no authored text is added.')
console.log(`Generated: ${OUT}`)
