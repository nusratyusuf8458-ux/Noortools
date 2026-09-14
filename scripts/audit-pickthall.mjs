import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const GUTENBERG_URL = 'https://www.gutenberg.org/ebooks/16955.txt.utf-8'
const OUT = 'public/content/phase-2.3-quran-translations.json'
const EXCLUDED_KEYS = ['17:33', '39:46', '45:32', '56:26']

function sha256Text(text) { return createHash('sha256').update(new TextEncoder().encode(text)).digest('hex') }
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

const manifest = JSON.parse(await readFile('public/content/quran-manifest.json', 'utf8'))
if (!Array.isArray(manifest.surahCounts) || manifest.surahCounts.length !== 114 || manifest.surahCounts.reduce((a, b) => a + b, 0) !== 6236) throw new Error('Canonical Quran ID inventory is invalid.')
const generated = JSON.parse(await readFile(OUT, 'utf8'))
if (generated.schema !== 'noortools.quran-translations' || generated.version !== 2) throw new Error('Pickthall generated dataset schema/version is invalid.')
if (generated.translations.length !== 6232 || generated.excluded.length !== 4) throw new Error('Pickthall distributable/excluded counts are invalid.')

const canonicalKeys = []
for (let surah = 1; surah <= 114; surah += 1) for (let ayah = 1; ayah <= manifest.surahCounts[surah - 1]; ayah += 1) canonicalKeys.push(`${surah}:${ayah}`)
const canonical = new Set(canonicalKeys)
const present = new Set()
for (const item of generated.translations) {
  const key = `${item.surah}:${item.ayah}`
  if (!canonical.has(key)) throw new Error(`Translation contains non-canonical ayah ${key}.`)
  if (present.has(key)) throw new Error(`Duplicate translation key ${key}.`)
  present.add(key)
  if (item.id !== `quran-translation:en:pickthall-1930:${key}`) throw new Error(`Unstable translation id ${item.id}.`)
  if (item.language !== 'en' || item.translator !== 'Marmaduke William Pickthall' || item.edition !== 'The Meaning of the Glorious Koran (1930)') throw new Error(`Unexpected edition metadata for ${key}.`)
  if (item.source.id !== 'quran-translation.pickthall.1930.gutenberg' || item.source.redistributionStatus !== 'cleared' || item.source.verificationStatus !== 'verified') throw new Error(`Rights metadata failed for ${key}.`)
  if (item.reviewState !== 'pending_scholar_review') throw new Error(`Unexpected review state for ${key}.`)
  if (item.contentHash !== sha256Text(item.text) || !/^[a-f0-9]{64}$/.test(item.contentHash) || !/^[a-f0-9]{64}$/.test(item.source.contentHash)) throw new Error(`Content hash failed for ${key}.`)
}
for (const key of EXCLUDED_KEYS) if (present.has(key)) throw new Error(`Excluded key ${key} is present in distributable translations.`)
const missing = canonicalKeys.filter(key => !present.has(key))
if (missing.join(',') !== EXCLUDED_KEYS.join(',')) throw new Error(`Canonical ID inventory mismatch; missing=${missing.join(',')}`)

const response = await fetch(GUTENBERG_URL)
if (!response.ok) throw new Error(`Gutenberg audit download failed: HTTP ${response.status}`)
const sourceBytes = new Uint8Array(await response.arrayBuffer())
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex')
if (generated.audit.sourceHash !== sourceHash) throw new Error('Generated source hash does not match freshly fetched Gutenberg bytes.')
const sourceItems = parsePickthall(new TextDecoder('utf-8', { fatal: true }).decode(sourceBytes))
if (sourceItems.length !== 6232) throw new Error(`Gutenberg parser expected 6232 records; received ${sourceItems.length}.`)
const sourceMap = new Map(sourceItems.map(item => [`${item.surah}:${item.ayah}`, item.text]))
for (const item of generated.translations) {
  const key = `${item.surah}:${item.ayah}`
  if (sourceMap.get(key) !== item.text) throw new Error(`Exact Gutenberg text mismatch for ${key}.`)
}

const excluded = generated.excluded.map(item => `${item.surah}:${item.ayah}`)
if (excluded.join(',') !== EXCLUDED_KEYS.join(',')) throw new Error('Excluded record order/inventory changed.')
for (const item of generated.excluded) {
  if (item.shippingStatus !== 'unavailable_pending_verification' || item.reviewState !== 'unavailable' || item.manualCorrection !== false || item.sourceHash !== null || item.recordContentHash !== null || item.reviewer !== null) throw new Error(`Unsafe excluded metadata for ${item.surah}:${item.ayah}.`)
  if (item.sourceName !== 'Internet Archive — The Meaning Of The Glorious Koran' || item.edition !== 'The Meaning of the Glorious Koran, 1930' || item.publisher !== 'George Allen & Unwin') throw new Error(`Excluded provenance metadata failed for ${item.surah}:${item.ayah}.`)
}

const uiSource = await readFile('src/Phase23Launcher.tsx', 'utf8')
if (uiSource.includes('>Scholar Verified<') || uiSource.includes('status-pill">Scholar Verified')) throw new Error('Translation UI contains a displayed Scholar Verified claim.')
if (!uiSource.includes('pending_scholar_review')) throw new Error('Translation UI must expose pending scholar review state.')

console.log('Pickthall ruthless audit passed: 6236 canonical IDs checked; 6232 exact Gutenberg records verified; 4 records excluded pending exact edition verification.')
console.log(`Gutenberg SHA-256: ${sourceHash}`)
console.log(`Excluded: ${EXCLUDED_KEYS.join(', ')}`)
