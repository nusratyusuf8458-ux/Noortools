import type { QuranAyah } from './content'
import { validateQuranItems } from './content'

export const TANZIL_QURAN_EXPECTED_AYAHS = 6236

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

export function validateImportedQuran(ayahs: QuranAyah[]) {
  const structure = validateQuranStructure(ayahs)
  const content = validateQuranItems(ayahs)
  return { valid: structure.valid && content.valid, errors: [...structure.errors, ...content.errors] }
}
