import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { QuranAyah, SourceMetadata } from './content'
import { validateQuranItems } from './content'

export const TANZIL_QURAN_EXPECTED_AYAHS = 6236

export type QuranDataset = {
  source: SourceMetadata
  ayahs: QuranAyah[]
  sha256: string
}

export function parseTanzilText(text: string, source: SourceMetadata): QuranDataset {
  const ayahs: QuranAyah[] = []
  const lines = text.split(/\r?\n/)
  for (const [index, raw] of lines.entries()) {
    const line = raw.trimEnd()
    if (!line || line.startsWith('#')) continue
    const first = line.indexOf('|')
    const second = line.indexOf('|', first + 1)
    if (first <= 0 || second <= first + 1) throw new Error(`Invalid Tanzil row at line ${index + 1}.`)
    const surah = Number(line.slice(0, first))
    const ayah = Number(line.slice(first + 1, second))
    const arabic = line.slice(second + 1)
    if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114 || ayah < 1 || arabic.length === 0) throw new Error(`Invalid Quran row at line ${index + 1}.`)
    ayahs.push({
      id: `quran:${surah}:${ayah}`,
      type: 'quran_ayah',
      surah,
      ayah,
      arabic,
      source: { ...source, importedAt: new Date().toISOString(), importVersion: source.version, verificationStatus: 'verified' },
    })
  }
  const structural = validateQuranStructure(ayahs)
  if (!structural.valid) throw new Error(structural.errors.join(' '))
  const validation = validateQuranItems(ayahs)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  return { source: ayahs[0]?.source ?? source, ayahs, sha256: createHash('sha256').update(text, 'utf8').digest('hex') }
}

export function validateQuranStructure(ayahs: Pick<QuranAyah, 'surah' | 'ayah'>[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const bySurah = new Map<number, number[]>()
  for (const item of ayahs) {
    const values = bySurah.get(item.surah) ?? []
    values.push(item.ayah)
    bySurah.set(item.surah, values)
  }
  const surahs = [...bySurah.keys()].sort((a, b) => a - b)
  if (surahs.length !== 114) errors.push(`Expected 114 surahs; found ${surahs.length}.`)
  for (let expected = 1; expected <= 114; expected += 1) if (!bySurah.has(expected)) errors.push(`Missing surah ${expected}.`)
  let total = 0
  for (let surah = 1; surah <= 114; surah += 1) {
    const numbers = [...(bySurah.get(surah) ?? [])].sort((a, b) => a - b)
    total += numbers.length
    for (let index = 0; index < numbers.length; index += 1) if (numbers[index] !== index + 1) errors.push(`Surah ${surah} has missing or duplicated ayah numbering around ${index + 1}.`)
  }
  if (total !== TANZIL_QURAN_EXPECTED_AYAHS) errors.push(`Expected ${TANZIL_QURAN_EXPECTED_AYAHS} ayahs; found ${total}.`)
  return { valid: errors.length === 0, errors }
}

export function importTanzilFile(path: string, source: SourceMetadata): QuranDataset {
  return parseTanzilText(readFileSync(path, 'utf8'), source)
}
