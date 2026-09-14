import { localParts, timezoneOffsetMinutes } from './timezone'

export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type CalculationMethod = 'MWL' | 'ISNA' | 'Egypt' | 'Makkah' | 'Karachi' | 'Tehran' | 'Jafari'
export type HighLatitudeMethod = 'none' | 'angleBased' | 'oneSeventh' | 'middleOfNight'
export type AsrMethod = 'standard' | 'hanafi'
export type PrayerAdjustments = Partial<Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', number>>
export type PrayerSettings = { method?: CalculationMethod; asrMethod?: AsrMethod; hanafi?: boolean; highLatitude?: HighLatitudeMethod; adjustments?: PrayerAdjustments }
export type Prayer = { name: PrayerName; time: Date }
export type PrayerCalculationMetadata = { method: CalculationMethod; asrMethod: AsrMethod; highLatitude: HighLatitudeMethod; adjustments: PrayerAdjustments; location: { lat: number; lon: number; timeZone: string } }

type CalendarDate = { year: number; month: number; day: number }
type SolarPosition = { declination: number; equationOfTime: number; solarNoonUtcMinutes: number }

const KAABA = { lat: 21.422487, lon: 39.826206 }
const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const norm = (d: number) => ((d % 360) + 360) % 360

export const CALCULATION_METHODS: Record<CalculationMethod, { label: string; fajrAngle: number; ishaAngle?: number; ishaMinutes?: number; maghribAngle?: number; source: string }> = {
  MWL: { label: 'Muslim World League', fajrAngle: 18, ishaAngle: 17, source: 'Pray Times convention: MWL' },
  ISNA: { label: 'ISNA', fajrAngle: 15, ishaAngle: 15, source: 'Pray Times convention: ISNA' },
  Egypt: { label: 'Egyptian General Authority of Survey', fajrAngle: 19.5, ishaAngle: 17.5, source: 'Pray Times convention: Egypt' },
  Makkah: { label: 'Umm al-Qura University, Makkah', fajrAngle: 18.5, ishaMinutes: 90, source: 'Pray Times convention: Makkah; Isha fixed 90 minutes after sunset' },
  Karachi: { label: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18, source: 'Pray Times convention: Karachi' },
  Tehran: { label: 'University of Tehran', fajrAngle: 17.7, ishaAngle: 14, maghribAngle: 4.5, source: 'Pray Times convention: Tehran' },
  Jafari: { label: 'Jafari', fajrAngle: 16, ishaAngle: 14, maghribAngle: 4, source: 'Pray Times convention: Jafari' },
}

function calendarDate(date: Date, timeZone: string): CalendarDate { const p = localParts(date, timeZone); return { year: p.year, month: p.month, day: p.day } }
function addDays(date: CalendarDate, days: number): CalendarDate { const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } }
function dayOfYear(date: CalendarDate) { return Math.floor((Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(date.year, 0, 1)) / 86400000) + 1 }
function solarPosition(date: CalendarDate, lon: number): SolarPosition { const n = dayOfYear(date); const gamma = 2 * Math.PI / 365 * (n - 1); const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)); const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma); return { declination, equationOfTime, solarNoonUtcMinutes: 720 - 4 * lon - equationOfTime } }
function fromUtcMinutes(date: CalendarDate, utcMinutes: number) { return new Date(Date.UTC(date.year, date.month - 1, date.day) + utcMinutes * 60000) }
function solarTime(date: CalendarDate, lat: number, lon: number, altitudeDegrees: number, morning: boolean) { const { declination, solarNoonUtcMinutes } = solarPosition(date, lon); const altitude = rad(altitudeDegrees); const denominator = Math.cos(rad(lat)) * Math.cos(declination); if (Math.abs(denominator) < 1e-12) return null; const cosHourAngle = (Math.sin(altitude) - Math.sin(rad(lat)) * Math.sin(declination)) / denominator; if (cosHourAngle > 1 || cosHourAngle < -1) return null; const hourAngle = deg(Math.acos(cosHourAngle)); return fromUtcMinutes(date, solarNoonUtcMinutes + (morning ? -4 * hourAngle : 4 * hourAngle)) }
function solarNoon(date: CalendarDate, lon: number) { return fromUtcMinutes(date, solarPosition(date, lon).solarNoonUtcMinutes) }
function asr(date: CalendarDate, lat: number, lon: number, shadowRatio: number) { const declination = solarPosition(date, lon).declination; const altitude = deg(Math.atan(1 / (shadowRatio + Math.tan(Math.abs(rad(lat) - declination))))); return solarTime(date, lat, lon, altitude, false) }
function toLocalInstant(date: CalendarDate, timeZone: string, localHourValue: number) { const normalized = ((localHourValue % 24) + 24) % 24; const hour = Math.floor(normalized); const minuteFloat = (normalized - hour) * 60; const minute = Math.floor(minuteFloat); const second = Math.round((minuteFloat - minute) * 60); const base = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second); let guess = base; for (let i = 0; i < 6; i += 1) guess = base - timezoneOffsetMinutes(new Date(guess), timeZone) * 60000; return new Date(guess) }
function fallbackFraction(method: HighLatitudeMethod, angle: number) { if (method === 'middleOfNight') return 0.5; if (method === 'oneSeventh') return 1 / 7; return angle / 60 }
function fallbackFajr(sunrise: Date, nightHours: number, method: HighLatitudeMethod, angle: number) { return new Date(sunrise.getTime() - nightHours * fallbackFraction(method, angle) * 3600000) }
function fallbackIsha(sunset: Date, nextSunrise: Date, method: HighLatitudeMethod, angle: number) { const nightHours = (nextSunrise.getTime() - sunset.getTime()) / 3600000; return new Date(sunset.getTime() + nightHours * fallbackFraction(method, angle) * 3600000) }
function instantAtLocalNoon(date: CalendarDate, timeZone: string) { return toLocalInstant(date, timeZone, 12) }
function adjustment(settings: PrayerSettings, name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha') { const value = settings.adjustments?.[name]; return typeof value === 'number' && Number.isFinite(value) ? value : 0 }
function adjusted(time: Date | null, settings: PrayerSettings, name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha') { if (!(time instanceof Date) || !Number.isFinite(time.getTime())) return null; return new Date(time.getTime() + adjustment(settings, name) * 60000) }

export function calculatePrayerTimes(date: Date, lat: number, lon: number, timeZone = 'UTC', settings: PrayerSettings = {}): Prayer[] {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || typeof timeZone !== 'string' || !timeZone.trim()) return []
  const method = settings.method ?? 'MWL'
  const config = CALCULATION_METHODS[method] ?? CALCULATION_METHODS.MWL
  const asrMethod = settings.asrMethod ?? (settings.hanafi ? 'hanafi' : 'standard')
  const highLatitude = settings.highLatitude ?? 'none'
  const localDate = calendarDate(date, timeZone)
  const tomorrow = addDays(localDate, 1)
  const yesterday = addDays(localDate, -1)
  let resolvedFajr = solarTime(localDate, lat, lon, -config.fajrAngle, true)
  const sunrise = solarTime(localDate, lat, lon, -0.833, true)
  const dhuhr = solarNoon(localDate, lon)
  const asrTime = asr(localDate, lat, lon, asrMethod === 'hanafi' ? 2 : 1)
  const astronomicalSunset = solarTime(localDate, lat, lon, -0.833, false)
  const maghrib = config.maghribAngle === undefined ? astronomicalSunset : solarTime(localDate, lat, lon, -config.maghribAngle, false)
  const nextSunrise = solarTime(tomorrow, lat, lon, -0.833, true)
  const previousSunset = solarTime(yesterday, lat, lon, -0.833, false)
  let resolvedIsha: Date | null
  if (config.ishaMinutes !== undefined && astronomicalSunset) resolvedIsha = new Date(astronomicalSunset.getTime() + config.ishaMinutes * 60000)
  else resolvedIsha = config.ishaAngle === undefined ? null : solarTime(localDate, lat, lon, -config.ishaAngle, false)
  if (highLatitude !== 'none' && sunrise && astronomicalSunset && nextSunrise) { const nightHours = (nextSunrise.getTime() - astronomicalSunset.getTime()) / 3600000; if (!resolvedFajr) resolvedFajr = fallbackFajr(sunrise, nightHours, highLatitude, config.fajrAngle); if (!resolvedIsha) resolvedIsha = fallbackIsha(astronomicalSunset, nextSunrise, highLatitude, config.ishaAngle ?? 18) }
  const events: Array<[PrayerName, Date | null]> = [['Fajr', adjusted(resolvedFajr, settings, 'Fajr')], ['Sunrise', sunrise], ['Dhuhr', adjusted(dhuhr, settings, 'Dhuhr')], ['Asr', adjusted(asrTime, settings, 'Asr')], ['Maghrib', adjusted(maghrib, settings, 'Maghrib')], ['Isha', adjusted(resolvedIsha, settings, 'Isha')]]
  void previousSunset
  return events.filter((x): x is [PrayerName, Date] => x[1] instanceof Date && Number.isFinite(x[1].getTime())).map(([name, time]) => ({ name, time }))
}

export function nextPrayer(prayers: Prayer[], lat: number, lon: number, timeZone: string, settings: PrayerSettings = {}, now = new Date()) { const upcoming = prayers.filter(p => p.name !== 'Sunrise').find(p => p.time.getTime() > now.getTime()); if (upcoming) return upcoming; const tomorrow = addDays(calendarDate(now, timeZone), 1); return calculatePrayerTimes(instantAtLocalNoon(tomorrow, timeZone), lat, lon, timeZone, settings).find(p => p.name === 'Fajr') ?? null }
export function currentPrayer(prayers: Prayer[], now = new Date()): Exclude<PrayerName, 'Sunrise'> | null { let current: Exclude<PrayerName, 'Sunrise'> | null = null; for (const prayer of prayers) { if (prayer.name === 'Sunrise') continue; if (prayer.time.getTime() <= now.getTime()) current = prayer.name; else break } return current }
export function prayerTimeLabel(date: Date, timeZone: string, use24Hour = false) { return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: !use24Hour }).format(date) }
export function nightMidpoint(date: Date, lat: number, lon: number, timeZone: string, settings: PrayerSettings = {}) { const prayers = calculatePrayerTimes(date, lat, lon, timeZone, settings); const sunset = prayers.find(p => p.name === 'Maghrib'); const tomorrow = addDays(calendarDate(date, timeZone), 1); const tomorrowPrayers = calculatePrayerTimes(instantAtLocalNoon(tomorrow, timeZone), lat, lon, timeZone, settings); const tomorrowFajr = tomorrowPrayers.find(p => p.name === 'Fajr'); if (!sunset || !tomorrowFajr) return null; return new Date(sunset.time.getTime() + (tomorrowFajr.time.getTime() - sunset.time.getTime()) / 2) }
export function qiblaBearing(lat: number, lon: number) { const kaabaLat = rad(KAABA.lat), kaabaLon = rad(KAABA.lon), phi = rad(lat), dl = kaabaLon - rad(lon); return norm(deg(Math.atan2(Math.sin(dl), Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dl)))) }
