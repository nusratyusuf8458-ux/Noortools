import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const OUT_DIR = 'public/content'
const SOURCES = {
  names: {
    sourceId: 'ummah-library-asma', sourceName: 'UmmahLibrary / my-prayers muslim-data', sourceVersion: '1.0.0',
    sourceUrl: 'https://raw.githubusercontent.com/UmmahLibrary/ummah-library/12c9a9123c235a8dd1f2e8524e1f53716b62f7e2/packages/data/datasets/asma.json',
    license: 'Apache-2.0', licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    reference: 'Names are sourced from the Qur\'an and Sunnah; Arabic, transliteration and English meaning are taken from my-prayers/muslim-data.',
    sourceCommit: '12c9a9123c235a8dd1f2e8524e1f53716b62f7e2',
  },
  duas: {
    sourceId: 'fitrahive-dua-dhikr', sourceName: 'Fitrahive Dua & Dhikr', sourceVersion: 'f42f895f914319a844c3e3c2279483cae060ea19',
    license: 'MIT', licenseUrl: 'https://opensource.org/license/mit', sourceUrl: 'https://github.com/fitrahive/dua-dhikr',
    reference: 'Each record preserves the source field supplied by Fitrahive.', sourceCommit: 'f42f895f914319a844c3e3c2279483cae060ea19',
  },
  azkar: {
    sourceId: 'seen-arabic-morning-evening-adhkar', sourceName: 'Seen Arabic · Morning-And-Evening-Adhkar-DB', sourceVersion: '29d7623fede52eca835a789025dfda866e8cfe44',
    license: 'MIT', licenseUrl: 'https://opensource.org/license/mit', sourceUrl: 'https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB',
    reference: 'Collection sources are documented by the dataset as Hisn Al-Muslim and cited scholarly works.', sourceCommit: '29d7623fede52eca835a789025dfda866e8cfe44',
  },
}

const urls = {
  names: SOURCES.names.sourceUrl,
  duaSelected: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/f42f895f914319a844c3e3c2279483cae060ea19/data/dua-dhikr/selected-dua/en.json',
  duaDaily: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/f42f895f914319a844c3e3c2279483cae060ea19/data/dua-dhikr/daily-dua/en.json',
  azkar: 'https://raw.githubusercontent.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/29d7623fede52eca835a789025dfda866e8cfe44/result/en.json',
}

function fail(message) { throw new Error(`Phase 2.2 content import failed: ${message}`) }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function stableHash(value) { return hash(Buffer.from(JSON.stringify(value, Object.keys(value).sort()), 'utf8')) }
async function getJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'NoorTools/phase-2.2 content importer' } })
  if (!response.ok) fail(`${url} returned HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  return { bytes, value: JSON.parse(bytes.toString('utf8')) }
}
function meta(base, contentHash, importVersion) {
  return {
    sourceId: base.sourceId, sourceName: base.sourceName, sourceVersion: base.sourceVersion,
    license: base.license, reference: base.reference, sourceUrl: base.sourceUrl,
    verificationStatus: 'verified', reviewStatus: 'not_reviewed', reviewState: 'source_verified',
    reviewer: null, reviewDate: null, reviewNotes: null, importVersion, importDate: new Date().toISOString(), contentHash,
  }
}
function classifyDua(title) {
  const t = title.toLocaleLowerCase()
  if (t.includes('morning')) return 'Morning'
  if (t.includes('evening')) return 'Evening'
  if (t.includes('sleep')) return 'Before sleeping'
  if (t.includes('waking') || t.includes('wake')) return 'After waking'
  if (t.includes('travel') || t.includes('vehicle')) return 'Travel'
  if (t.includes('home') || t.includes('house')) return 'Home'
  if (t.includes('food') || t.includes('eat') || t.includes('meal')) return 'Food'
  if (t.includes('forgiv')) return 'Forgiveness'
  if (t.includes('protect') || t.includes('refuge') || t.includes('evil')) return 'Protection'
  if (t.includes('difficulty') || t.includes('distress') || t.includes('trouble')) return 'Difficulty'
  if (t.includes('prayer') || t.includes('salah') || t.includes('mosque')) return 'Prayer'
  return 'General'
}

const [namesRaw, selectedRaw, dailyRaw, azkarRaw] = await Promise.all([
  getJson(urls.names), getJson(urls.duaSelected), getJson(urls.duaDaily), getJson(urls.azkar),
])

if (!namesRaw.value || !Array.isArray(namesRaw.value.names) || namesRaw.value.names.length !== 99) fail('99 Names dataset must contain exactly 99 names')
const nameNumbers = new Set()
const names = namesRaw.value.names.map((item, index) => {
  if (item.number !== index + 1) fail(`99 Names ordering broke at position ${index + 1}`)
  if (nameNumbers.has(item.number)) fail(`duplicate Allah name number ${item.number}`)
  nameNumbers.add(item.number)
  if (typeof item.arabic !== 'string' || !item.arabic || typeof item.transliteration !== 'string' || !item.transliteration || typeof item.meaning !== 'string' || !item.meaning) fail(`99 Names item ${item.number} is missing required sourced fields`)
  return {
    id: `allah-name:${item.number}`, type: 'allah_name', title: item.transliteration, arabic: item.arabic, transliteration: item.transliteration, meaning: item.meaning,
    references: Array.isArray(item.references) ? item.references : [], source: meta(SOURCES.names, hash(Buffer.from(JSON.stringify(item), 'utf8')), 'noortools-asma-1.0.0'),
  }
})

const duaInputs = [
  ['selected', selectedRaw.value],
  ['daily', dailyRaw.value],
]
const duas = []
for (const [collection, raw] of duaInputs) {
  if (!Array.isArray(raw)) fail(`Fitrahive ${collection} dua dataset is not an array`)
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') fail(`invalid Fitrahive ${collection} dua item ${index + 1}`)
    if (typeof item.arabic !== 'string' || !item.arabic || typeof item.translation !== 'string' || !item.translation || typeof item.source !== 'string' || !item.source) fail(`Fitrahive ${collection} dua ${index + 1} is missing Arabic, translation or source reference`)
    const id = `dua:fitrahive:${collection}:${index + 1}`
    duas.push({ id, type: 'dua', title: typeof item.title === 'string' ? item.title : id, arabic: item.arabic, translation: item.translation, transliteration: typeof item.latin === 'string' ? item.latin : '', category: classifyDua(typeof item.title === 'string' ? item.title : ''), count: null, notes: item.notes ?? null, reference: item.source, source: meta(SOURCES.duas, hash(Buffer.from(JSON.stringify(item), 'utf8')), `noortools-fitrahive-${SOURCES.duas.sourceCommit.slice(0, 12)}`) })
  })
}
if (duas.length === 0) fail('no Dua records were imported')
if (new Set(duas.map(item => item.id)).size !== duas.length) fail('duplicate Dua IDs detected')

if (!Array.isArray(azkarRaw.value) || azkarRaw.value.length === 0) fail('Morning/Evening Adhkar dataset is empty')
const azkar = azkarRaw.value.map((item, index) => {
  if (!item || typeof item !== 'object') fail(`invalid Azkar item ${index + 1}`)
  if (!Number.isInteger(item.order) || item.order <= 0) fail(`Azkar item ${index + 1} has invalid source order`)
  if (typeof item.content !== 'string' || !item.content || typeof item.translation !== 'string' || !item.translation || typeof item.source !== 'string' || !item.source) fail(`Azkar item ${item.order} is missing required sourced fields`)
  if (!Number.isInteger(item.count) || item.count < 1) fail(`Azkar item ${item.order} has invalid source count`)
  return { id: `azkar:seen-arabic:${item.order}`, type: 'azkar', title: `Morning & Evening · ${item.order}`, arabic: item.content, translation: item.translation, transliteration: typeof item.transliteration === 'string' ? item.transliteration : '', reference: item.source, count: item.count, category: 'Morning & Evening', source: meta(SOURCES.azkar, hash(Buffer.from(JSON.stringify(item), 'utf8')), `noortools-seen-arabic-${SOURCES.azkar.sourceCommit.slice(0, 12)}`) }
})
if (new Set(azkar.map(item => item.id)).size !== azkar.length) fail('duplicate Azkar IDs detected')

const output = {
  schema: 'noortools.verified-content', version: 2, generatedAt: new Date().toISOString(),
  datasets: {
    names: { version: '1.0.0', source: meta(SOURCES.names, hash(namesRaw.bytes), 'noortools-asma-1.0.0'), items: names },
    duas: { version: '1.0.0', source: meta(SOURCES.duas, hash(Buffer.concat([selectedRaw.bytes, dailyRaw.bytes])), `noortools-fitrahive-${SOURCES.duas.sourceCommit.slice(0, 12)}`), items: duas },
    azkar: { version: '1.0.0', source: meta(SOURCES.azkar, hash(azkarRaw.bytes), `noortools-seen-arabic-${SOURCES.azkar.sourceCommit.slice(0, 12)}`), items: azkar },
  },
}
await mkdir(OUT_DIR, { recursive: true })
await writeFile(`${OUT_DIR}/phase-2.2-content.json`, JSON.stringify(output, null, 2), 'utf8')
console.log(`Phase 2.2 content import: 99 names / ${duas.length} duas / ${azkar.length} azkar`)
console.log(`Names source sha256=${hash(namesRaw.bytes)}`)
console.log(`Duas source sha256=${hash(Buffer.concat([selectedRaw.bytes, dailyRaw.bytes]))}`)
console.log(`Azkar source sha256=${hash(azkarRaw.bytes)}`)
