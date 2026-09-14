import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://www.gutenberg.org/ebooks/16955.txt.utf-8'
const SOURCE_PAGE = 'https://www.gutenberg.org/ebooks/16955'
const OUT = 'public/content/phase-2.3-quran-translations.json'
const IMPORT_VERSION = 'phase-2.3/pickthall-1930-1'

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
      if (current) items.push(current)
      current = { surah: Number(marker[1]), ayah: Number(marker[2]), parts: [] }
      collecting = false
      continue
    }
    if (!current) continue
    if (line.startsWith('P: ')) {
      current.parts.push(line.slice(3).trim())
      collecting = true
    } else if (line.startsWith('S: ')) {
      collecting = false
    } else if (collecting && line.trim() && !/^[-*]{3,}$/.test(line.trim())) {
      current.parts.push(line.trim())
    }
  }
  if (current) items.push(current)
  const result = items.filter(item => item.parts.length > 0).map(item => ({ ...item, text: item.parts.join(' ').replace(/\s+/g, ' ').trim() }))
  if (result.length !== 6236) throw new Error(`Pickthall import expected 6236 ayahs; received ${result.length}.`)
  const ids = new Set()
  for (const item of result) {
    const id = `quran-translation:en:pickthall-1930:${item.surah}:${item.ayah}`
    if (ids.has(id)) throw new Error(`Duplicate Pickthall id ${id}.`)
    ids.add(id)
    if (!item.text) throw new Error(`Empty Pickthall text at ${item.surah}:${item.ayah}.`)
  }
  return result
}

const response = await fetch(SOURCE_URL)
if (!response.ok) throw new Error(`Pickthall source download failed: HTTP ${response.status}`)
const bytes = new Uint8Array(await response.arrayBuffer())
const sourceHash = sha256(bytes)
const sourceText = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
const parsed = parsePickthall(sourceText)
const now = new Date().toISOString()
const source = {
  id: 'quran-translation.pickthall.1930',
  name: 'The Meaning of the Glorious Koran',
  version: '1930 edition / Project Gutenberg #16955; updated 2020-12-12',
  sourceURL: SOURCE_URL,
  license: 'Public domain work',
  licenseURL: SOURCE_PAGE,
  copyrightHolder: 'Marmaduke William Pickthall (1875-1936), original 1930 work',
  attribution: 'Translator: Marmaduke William Pickthall; Project Gutenberg eBook #16955',
  redistributionStatus: 'cleared',
  modificationStatus: 'permitted',
  commercialUseStatus: 'permitted',
  contentHash: sourceHash,
  verificationStatus: 'verified',
  reviewStatus: 'pending_scholar_review',
}
const translations = parsed.map(item => ({
  id: `quran-translation:en:pickthall-1930:${item.surah}:${item.ayah}`,
  surah: item.surah,
  ayah: item.ayah,
  language: 'en',
  translator: 'Marmaduke William Pickthall',
  edition: 'The Meaning of the Glorious Koran (1930)',
  text: item.text,
  source,
  reviewState: 'pending_scholar_review',
}))
await mkdir('public/content', { recursive: true })
await writeFile(OUT, JSON.stringify({ schema: 'noortools.quran-translations', version: 1, translations }, null, 2) + '\n', 'utf8')
console.log(`Phase 2.3 translation import: ${translations.length} Pickthall ayahs`)
console.log(`Pickthall source SHA-256: ${sourceHash}`)
console.log(`Generated: ${OUT}`)
