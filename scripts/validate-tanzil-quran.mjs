import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const input = process.argv[2] || 'content-source/quran-uthmani.txt'
const reportPath = process.argv[3] || 'content-source/quran-integrity-report.json'
const absolute = resolve(input)
const raw = readFileSync(absolute, 'utf8')
const lines = raw.split(/\r?\n/)
const bySurah = new Map()
let rows = 0
for (const [index, original] of lines.entries()) {
  const line = original.trimEnd()
  if (!line || line.startsWith('#')) continue
  const first = line.indexOf('|')
  const second = line.indexOf('|', first + 1)
  if (first <= 0 || second <= first + 1) throw new Error(`Invalid Tanzil row at line ${index + 1}.`)
  const surah = Number(line.slice(0, first))
  const ayah = Number(line.slice(first + 1, second))
  const text = line.slice(second + 1)
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114 || ayah < 1 || text.length === 0) throw new Error(`Invalid Quran row at line ${index + 1}.`)
  const values = bySurah.get(surah) || []
  values.push(ayah)
  bySurah.set(surah, values)
  rows += 1
}
const errors = []
if (bySurah.size !== 114) errors.push(`Expected 114 surahs; found ${bySurah.size}.`)
for (let surah = 1; surah <= 114; surah += 1) {
  const numbers = [...(bySurah.get(surah) || [])].sort((a, b) => a - b)
  if (!numbers.length) errors.push(`Missing surah ${surah}.`)
  for (let index = 0; index < numbers.length; index += 1) if (numbers[index] !== index + 1) errors.push(`Surah ${surah} has missing or duplicated ayah numbering around ${index + 1}.`)
}
if (rows !== 6236) errors.push(`Expected 6236 ayahs; found ${rows}.`)
const report = {
  source: 'Tanzil Project',
  edition: 'Uthmani',
  version: '1.1',
  license: 'Creative Commons Attribution 3.0; verbatim redistribution only, no text changes',
  sourceUrl: 'https://tanzil.net/download/',
  importFile: input,
  sha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
  ayahs: rows,
  surahs: bySurah.size,
  validStructure: errors.length === 0,
  verificationStatus: 'needs_review',
  generatedAt: new Date().toISOString(),
  errors,
}
writeFileSync(resolve(reportPath), JSON.stringify(report, null, 2) + '\n', 'utf8')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Tanzil structure valid: ${rows} ayahs across ${bySurah.size} surahs.`)
  console.log(`SHA-256: ${report.sha256}`)
}
