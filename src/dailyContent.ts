import type { AllahName, Azkar, Dua } from './verifiedContentRuntime'

function stableDayOfYear(date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000)
}
function pickIndex(length: number, date = new Date(), salt = 0): number {
  if (length <= 0) return -1
  return (stableDayOfYear(date) - 1 + salt) % length
}
export function selectDailyName(items: AllahName[], date = new Date()): AllahName | null { const index = pickIndex(items.length, date, 0); return index < 0 ? null : items[index] }
export function selectDailyDua(items: Dua[], date = new Date()): Dua | null { const index = pickIndex(items.length, date, 7); return index < 0 ? null : items[index] }
export function selectDailyDhikr(items: Azkar[], date = new Date()): Azkar | null { const index = pickIndex(items.length, date, 13); return index < 0 ? null : items[index] }
export function dailySelectionId(kind: 'name' | 'dua' | 'dhikr', id: string, date = new Date()): string { return `daily:${kind}:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}:${id}` }
