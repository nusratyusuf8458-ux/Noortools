export type HijriDate = { year: number; month: number; day: number; monthName: string }
export type IslamicCalendarDay = { gregorian: Date; hijri: HijriDate; isCurrentMonth: boolean }
export type IslamicMonthView = { year: number; month: number; monthName: string; days: IslamicCalendarDay[]; startGregorian: Date; endGregorian: Date }
export type ImportantIslamicEvent = { id: string; hijriMonth: number; hijriDay: number; label: string; source: string; reviewState: 'source_verified' | 'pending_scholar_review' }

const CALENDAR = 'islamic-umalqura'
const MIN_ADJUSTMENT = -3
const MAX_ADJUSTMENT = 3

function safeAdjustment(value: number) { return Number.isInteger(value) ? Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, value)) : 0 }
function formatter(timeZone: string, adjustmentDays: number) {
  return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' , timeZoneName: undefined })
}
function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
  const result = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value])) as Record<string, string>
  return { year: Number(result.year), month: Number(result.month), day: Number(result.day) }
}
function shiftedDate(date: Date, days: number) { return new Date(date.getTime() + days * 86400000) }
function monthNameFor(date: Date, timeZone: string) { return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { timeZone, month: 'long' }).format(date) }
function dateOnly(date: Date, timeZone: string, adjustmentDays: number) { return shiftedDate(date, adjustmentDays) }

export function hijriDate(date = new Date(), timeZone = 'UTC', adjustmentDays = 0): HijriDate {
  const adjustment = safeAdjustment(adjustmentDays)
  const target = dateOnly(date, timeZone, adjustment)
  const parts = partsFor(target, timeZone)
  return { ...parts, monthName: monthNameFor(target, timeZone) }
}

export function islamicDateLabel(date = new Date(), timeZone = 'UTC', adjustmentDays = 0) {
  const h = hijriDate(date, timeZone, adjustmentDays)
  const g = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  return `${g} · ${h.day} ${h.monthName} ${h.year} AH`
}

export function buildIslamicMonthView(anchor = new Date(), timeZone = 'UTC', adjustmentDays = 0): IslamicMonthView {
  const adjustment = safeAdjustment(adjustmentDays)
  const shiftedAnchor = dateOnly(anchor, timeZone, adjustment)
  const target = partsFor(shiftedAnchor, timeZone)
  let cursor = shiftedAnchor
  for (let i = 0; i < 35 && partsFor(cursor, timeZone).day !== 1; i += 1) cursor = shiftedDate(cursor, -1)
  const startGregorian = shiftedDate(cursor, -adjustment)
  const days: IslamicCalendarDay[] = []
  for (let i = 0; i < 31; i += 1) {
    const gregorian = shiftedDate(startGregorian, i)
    const h = hijriDate(gregorian, timeZone, adjustment)
    const isCurrentMonth = h.year === target.year && h.month === target.month
    if (!isCurrentMonth && h.day === 1 && days.length > 0) break
    days.push({ gregorian, hijri: h, isCurrentMonth })
  }
  const firstWeekday = startGregorian.getDay()
  const padded: IslamicCalendarDay[] = []
  for (let i = 0; i < firstWeekday; i += 1) padded.push({ gregorian: shiftedDate(startGregorian, -(firstWeekday - i)), hijri: hijriDate(shiftedDate(startGregorian, -(firstWeekday - i)), timeZone, adjustment), isCurrentMonth: false })
  padded.push(...days)
  while (padded.length % 7 !== 0) {
    const next = padded[padded.length - 1].gregorian
    const gregorian = shiftedDate(next, 1)
    padded.push({ gregorian, hijri: hijriDate(gregorian, timeZone, adjustment), isCurrentMonth: false })
  }
  return { year: target.year, month: target.month, monthName: monthNameFor(shiftedAnchor, timeZone), days: padded, startGregorian, endGregorian: days[days.length - 1].gregorian }
}

export function shiftIslamicMonth(anchor: Date, direction: -1 | 1, timeZone = 'UTC', adjustmentDays = 0) {
  const current = buildIslamicMonthView(anchor, timeZone, adjustmentDays)
  return buildIslamicMonthView(shiftedDate(current.startGregorian, direction * 32), timeZone, adjustmentDays).startGregorian
}

export function calendarSupportsUmmAlQura() {
  try { return Intl.DateTimeFormat.supportedLocalesOf('en-US-u-ca-islamic-umalqura').length === 1 } catch { return false }
}

export const IMPORTANT_ISLAMIC_EVENTS: ImportantIslamicEvent[] = []
export const IMPORTANT_EVENT_STATUS = 'No source-cleared event dataset is bundled; calculated Hijri dates are kept distinct from source-defined events.'

void formatter
