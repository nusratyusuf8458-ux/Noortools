import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const input = process.argv[2] || 'content-source/quran-uthmani.txt'
const output = process.argv[3] || 'content-source/quran-verified.json'
const raw = readFileSync(resolve(input), 'utf8')
const lines = raw.split(/\r?\n/)
const ayahs = []
const seen = new Set()
const bySurah = new Map()
for (const [index, original] of lines.entries()) {
  const line = original.trimEnd()
  if (!line || line.startsWith('#')) continue
  const first = line.indexOf('|')
  const second = line.indexOf('|', first + 1)
  if (first <= 0 || second <= first + 1) throw new Error(`Invalid Tanzil row at line ${index + 1}.`)
  const surah = Number(line.slice(0, first)); const ayah = Number(line.slice(first + 1, second)); const arabic = line.slice(second + 1)
  const id = `quran:${surah}:${ayah}`
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1 || !arabic || seen.has(id)) throw new Error(`Invalid or duplicate Quran row at line ${index + 1}.`)
  seen.add(id); ayahs.push({ id, type: 'quran_ayah', surah, ayah, arabic })
  const values = bySurah.get(surah) || []; values.push(ayah); bySurah.set(surah, values)
}
if (bySurah.size !== 114 || ayahs.length !== 6236) throw new Error(`Tanzil dataset must contain 114 surahs and 6236 ayahs; found ${bySurah.size} surahs and ${ayahs.length} ayahs.`)
for (let surah = 1; surah <= 114; surah += 1) {
  const numbers = [...bySurah.get(surah)].sort((a, b) => a - b)
  for (let index = 0; index < numbers.length; index += 1) if (numbers[index] !== index + 1) throw new Error(`Surah ${surah} has a numbering gap at ${index + 1}.`)
}
const sha256 = createHash('sha256').update(raw, 'utf8').digest('hex')
const dataset = {
  schema: 'noortools.quran-dataset',
  datasetVersion: 1,
  source: {
    source: 'Tanzil Project', edition: 'Uthmani', version: '1.1', license: 'Creative Commons Attribution 3.0; verbatim/no-modification terms', sourceUrl: 'https://tanzil.net/download/',
    importedAt: new Date().toISOString(), importVersion: '1.1', sourceSha256: sha256, verificationStatus: 'needs_review', reviewerStatus: 'not_reviewed'
  },
  ayahs,
}
writeFileSync(resolve(output), JSON.stringify(dataset), 'utf8')
console.log(`Imported ${ayahs.length} ayahs from Tanzil Uthmani v1.1.`)
console.log(`SHA-256: ${sha256}`)
console.log('Status: needs_review. No scholar review is implied by structural validation.')
