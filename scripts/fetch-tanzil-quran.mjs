import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const QURAN_URL = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&rub=true&stanween=true'
const METADATA_URL = 'https://tanzil.net/res/text/metadata/quran-data.xml'
const OUT_DIR = 'public/content'

function fail(message) { throw new Error(`Tanzil import failed: ${message}`) }
function attr(tag, name) { return tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] ?? '' }

const [quranResponse, metadataResponse] = await Promise.all([
  fetch(QURAN_URL, { headers: { 'user-agent': 'NoorTools/phase-2.1 content importer' } }),
  fetch(METADATA_URL, { headers: { 'user-agent': 'NoorTools/phase-2.1 metadata importer' } }),
])
if (!quranResponse.ok) fail(`Quran HTTP ${quranResponse.status}`)
if (!metadataResponse.ok) fail(`metadata HTTP ${metadataResponse.status}`)

const quranBytes = Buffer.from(await quranResponse.arrayBuffer())
const quranText = quranBytes.toString('utf8').replace(/^\uFEFF/, '')
if (!quranText.includes('Tanzil Quran Text') || !quranText.includes('Creative Commons Attribution 3.0')) fail('download is missing the required Tanzil copyright/license notice')

const lines = quranText.split(/\r?\n/)
const ayahs = []
const seen = new Set()
for (const [index, line] of lines.entries()) {
  if (!line || line.startsWith('#')) continue
  const first = line.indexOf('|')
  const second = line.indexOf('|', first + 1)
  if (first <= 0 || second <= first + 1) fail(`invalid Quran row at source line ${index + 1}`)
  const surah = Number(line.slice(0, first))
  const ayah = Number(line.slice(first + 1, second))
  const arabic = line.slice(second + 1)
  const id = `quran:${surah}:${ayah}`
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) fail(`invalid surah at line ${index + 1}`)
  if (!Number.isInteger(ayah) || ayah < 1 || !arabic) fail(`invalid ayah at line ${index + 1}`)
  if (seen.has(id)) fail(`duplicate ${id}`)
  seen.add(id)
  ayahs.push({ id, type: 'quran_ayah', surah, ayah, arabic })
}
if (ayahs.length !== 6236) fail(`expected 6236 ayahs, received ${ayahs.length}`)
const surahCounts = Array(114).fill(0)
for (const item of ayahs) {
  const expected = ++surahCounts[item.surah - 1]
  if (item.ayah !== expected) fail(`surah ${item.surah} has missing or duplicated ayah numbering at ${item.ayah}`)
}
if (surahCounts.some(count => count === 0)) fail('one or more surahs are missing')

const metadataText = await metadataResponse.text()
const suras = []
for (const match of metadataText.matchAll(/<sura[^>]*>/gi)) {
  const tag = match[0]
  const number = Number(attr(tag, 'index'))
  if (!Number.isInteger(number) || number < 1 || number > 114) continue
  suras.push({ number, nameArabic: attr(tag, 'name'), nameTransliteration: attr(tag, 'tname'), nameEnglish: attr(tag, 'ename'), ayahCount: Number(attr(tag, 'ayas')) })
}
if (suras.length !== 114 || suras.some((item, index) => item.number !== index + 1)) fail('metadata does not contain an ordered set of 114 surahs')
for (const item of suras) if (item.ayahCount !== surahCounts[item.number - 1]) fail(`metadata ayah count mismatch for surah ${item.number}`)

const partition = (tagName) => [...metadataText.matchAll(new RegExp(`<${tagName}[^>]*>`, 'gi'))].map(match => ({ index: Number(attr(match[0], 'index')), surah: Number(attr(match[0], 'sura')), ayah: Number(attr(match[0], 'aya')) })).filter(item => Number.isInteger(item.index) && item.index > 0 && Number.isInteger(item.surah) && item.surah > 0 && Number.isInteger(item.ayah) && item.ayah > 0)
const juz = partition('juz')
const pages = partition('page')
if (juz.length !== 30 || pages.length !== 604) fail(`expected 30 juz and 604 pages in Tanzil metadata; found ${juz.length} juz and ${pages.length} pages`)

const sha256 = createHash('sha256').update(quranBytes).digest('hex')
const source = {
  sourceId: 'tanzil-uthmani',
  sourceName: 'Tanzil Project',
  sourceVersion: '1.1',
  edition: 'Uthmani',
  license: 'Creative Commons Attribution 3.0; verbatim copying only; changing the text is not allowed',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  sourceUrl: QURAN_URL,
  attributionUrl: 'https://tanzil.net',
  reference: 'Tanzil Quran Text, Uthmani, Version 1.1',
  verificationStatus: 'verified',
  reviewStatus: 'not_reviewed',
  reviewer: null,
  reviewDate: null,
  reviewNotes: null,
  importVersion: 'noortools-quran-tanzil-1.1',
  importedAt: new Date().toISOString(),
  contentHash: sha256,
}

await mkdir(OUT_DIR, { recursive: true })
await writeFile(`${OUT_DIR}/quran-uthmani-v1.1.txt`, quranBytes)
await writeFile(`${OUT_DIR}/quran-uthmani-v1.1.json`, JSON.stringify({ source, ayahs }, null, 2))
await writeFile(`${OUT_DIR}/quran-metadata.json`, JSON.stringify({ source: { sourceId: 'tanzil-quran-metadata', sourceName: 'Tanzil Project', sourceVersion: '1.0', edition: 'Quran Metadata', license: 'Creative Commons Attribution 3.0', sourceUrl: METADATA_URL }, surahs, juz, pages }, null, 2))
await writeFile(`${OUT_DIR}/quran-manifest.json`, JSON.stringify({ dataset: 'quran', datasetVersion: '1.0.0', source, sourceDownloadUrl: QURAN_URL, metadataDownloadUrl: METADATA_URL, byteLength: quranBytes.length, surahCount: 114, ayahCount: 6236, surahCounts, juzCount: 30, pageCount: 604, canonicalStorage: 'verbatim source Arabic strings; no normalization or content edits', changeNotes: 'Initial NoorTools Tanzil Uthmani v1.1 integration.' }, null, 2))
console.log(`Tanzil Uthmani v1.1: 114 surahs / 6236 ayahs / 30 juz / 604 pages / ${quranBytes.length} bytes / sha256=${sha256}`)
