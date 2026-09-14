import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const URL = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&rub=true&stanween=true'
const OUT_DIR = 'public/content'
const RAW_PATH = `${OUT_DIR}/quran-uthmani-v1.1.txt`
const JSON_PATH = `${OUT_DIR}/quran-uthmani-v1.1.json`
const MANIFEST_PATH = `${OUT_DIR}/quran-manifest.json`

const res = await fetch(URL, { headers: { 'user-agent': 'NoorTools/phase-2.1 content importer' } })
if (!res.ok) throw new Error(`Tanzil download failed: HTTP ${res.status}`)
const bytes = Buffer.from(await res.arrayBuffer())
const raw = bytes.toString('utf8').replace(/^\uFEFF/, '')
const lines = raw.split(/\r?\n/)
const ayahs = []
const seen = new Set()

for (const [index, line] of lines.entries()) {
  if (!line || line.startsWith('#')) continue
  const first = line.indexOf('|')
  const second = line.indexOf('|', first + 1)
  if (first <= 0 || second <= first + 1) throw new Error(`Invalid Tanzil row at source line ${index + 1}`)
  const surah = Number(line.slice(0, first))
  const ayah = Number(line.slice(first + 1, second))
  const arabic = line.slice(second + 1)
  const id = `quran:${surah}:${ayah}`
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1 || !arabic) throw new Error(`Invalid Quran row at source line ${index + 1}`)
  if (seen.has(id)) throw new Error(`Duplicate canonical ID ${id}`)
  seen.add(id)
  ayahs.push({ id, type: 'quran_ayah', surah, ayah, arabic })
}

if (ayahs.length !== 6236) throw new Error(`Expected 6236 ayahs, received ${ayahs.length}`)
const surahCounts = Array.from({ length: 114 }, () => 0)
for (const item of ayahs) {
  surahCounts[item.surah - 1] += 1
  if (item.ayah !== surahCounts[item.surah - 1]) throw new Error(`Missing or duplicate ayah number in surah ${item.surah} around ${item.ayah}`)
}
if (surahCounts.some(count => count === 0)) throw new Error('One or more surahs are missing')

const sha256 = createHash('sha256').update(bytes).digest('hex')
const source = {
  sourceId: 'tanzil-uthmani',
  sourceName: 'Tanzil Project',
  sourceVersion: '1.1',
  edition: 'Uthmani',
  license: 'Creative Commons Attribution 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  sourceUrl: URL,
  attributionUrl: 'https://tanzil.net',
  reference: 'Tanzil Quran Text, Uthmani, Version 1.1',
  importedAt: new Date().toISOString(),
  contentHash: sha256,
  verificationStatus: 'verified',
  reviewStatus: 'not_reviewed',
  importVersion: 'noortools-quran-tanzil-1.1'
}
await mkdir(OUT_DIR, { recursive: true })
await writeFile(RAW_PATH, bytes)
await writeFile(JSON_PATH, JSON.stringify({ source, ayahs }, null, 2))
await writeFile(MANIFEST_PATH, JSON.stringify({ dataset: 'quran', datasetVersion: '1.0.0', source, file: 'quran-uthmani-v1.1.txt', byteLength: bytes.length, surahCount: 114, ayahCount: ayahs.length, surahCounts, notes: 'Generated directly from the official Tanzil download URL. Canonical Arabic strings are copied verbatim; presentation must not mutate them.' }, null, 2))
console.log(`Tanzil Quran v1.1 imported: ${ayahs.length} ayahs / 114 surahs / sha256 ${sha256}`)
