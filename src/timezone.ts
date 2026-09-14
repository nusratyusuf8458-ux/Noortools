import tzlookup from '@photostructure/tz-lookup'

export function timezoneFromCoordinates(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) throw new Error('Invalid coordinates')
  return tzlookup(lat, lon)
}

export function timezoneLabel(timeZone: string): string {
  return timeZone.replace(/_/g, ' ')
}

export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])) as Record<string, number>
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second }
}

export function localDateKey(date: Date, timeZone: string) {
  const p = localParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function timezoneOffsetMinutes(date: Date, timeZone: string) {
  const p = localParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - date.getTime()) / 60000)
}
