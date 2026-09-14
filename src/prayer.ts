import { localParts, timezoneOffsetMinutes } from './timezone'

export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type HighLatitudeMethod = 'none' | 'angleBased' | 'oneSeventh' | 'middleOfNight'
export type PrayerSettings = { method?: 'MWL' | 'ISNA'; hanafi?: boolean; highLatitude?: HighLatitudeMethod }
export type Prayer = { name: PrayerName; time: Date }

type CalendarDate = { year: number; month: number; day: number }

const KAABA = { lat: 21.422487, lon: 39.826206 }
const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const norm = (d: number) => ((d % 360) + 360) % 360

function calendarDate(date: Date, timeZone: string): CalendarDate {
  const p = localParts(date, timeZone)
  return { year: p.year, month: p.month, day: p.day }
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function dayOfYear(date: CalendarDate) {
  return Math.floor((Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(date.year, 0, 1)) / 86400000) + 1
}

function solarPosition(date: CalendarDate, lon: number) {
  const n = dayOfYear(date)
  const gamma = 2 * Math.PI / 365 * (n - 1)
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma)
  return { declination, solarNoonUtcMinutes: 720 - 4 * lon - equationOfTime }
}

function fromUtcMinutes(date: CalendarDate, utcMinutes: number) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day) + utcMinutes * 60000)
}

function localHour(date: Date, timeZone: string) {
  const p = localParts(date, timeZone)
  return p.hour + p.minute / 60 + p.second / 3600
}

function solarTime(date: CalendarDate, lat: number, lon: number, altitudeDegrees: number, morning: boolean) {
  const { declination, solarNoonUtcMinutes } = solarPosition(date, lon)
  const altitude = rad(altitudeDegrees)
  const cosHourAngle = (Math.sin(altitude) - Math.sin(rad(lat)) * Math.sin(declination)) / (Math.cos(rad(lat)) * Math.cos(declination))
  if (cosHourAngle > 1 || cosHourAngle < -1) return null
  const hourAngle = deg(Math.acos(cosHourAngle))
  return fromUtcMinutes(date, solarNoonUtcMinutes + (morning ? -4 * hourAngle : 4 * hourAngle))
}

function solarNoon(date: CalendarDate, lon: number) {
  return fromUtcMinutes(date, solarPosition(date, lon).solarNoonUtcMinutes)
}

function asr(date: CalendarDate, lat: number, lon: number, shadowRatio: number) {
  const declination = solarPosition(date, lon).declination
  const altitude = deg(Math.atan(1 / (shadowRatio + Math.tan(Math.abs(rad(lat) - declination)))))
  return solarTime(date, lat, lon, altitude, false)
}

function toLocalInstant(date: CalendarDate, timeZone: string, localHourValue: number) {
  const hour = Math.floor(localHourValue)
  const minuteFloat = (localHourValue - hour) * 60
  const minute = Math.floor(minuteFloat)
  const second = Math.round((minuteFloat - minute) * 60)
  let guess = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second)
  for (let i = 0; i < 3; i += 1) guess -= timezoneOffsetMinutes(new Date(guess), timeZone) * 60000
  return new Date(guess)
}

function fallbackFajr(sunrise: Date, nightHours: number, method: HighLatitudeMethod, angle: number, date: CalendarDate, timeZone: string) {
  const portion = method === 'middleOfNight' ? nightHours / 2 : method === 'oneSeventh' ? nightHours / 7 : (angle / 60) * nightHours
  return toLocalInstant(date, timeZone, localHour(sunrise, timeZone) - portion)
}

function fallbackIsha(sunset: Date, nextSunrise: Date, method: HighLatitudeMethod, angle: number, date: CalendarDate, timeZone: string) {
  const nightHours = (nextSunrise.getTime() - sunset.getTime()) / 3600000
  const portion = method === 'middleOfNight' ? nightHours / 2 : method === 'oneSeventh' ? nightHours / 7 : (angle / 60) * nightHours
  const sunsetLocal = localHour(sunset, timeZone)
  return toLocalInstant(date, timeZone, sunsetLocal + portion)
}

export function calculatePrayerTimes(date: Date, lat: number, lon: number, timeZone = 'UTC', settings: PrayerSettings = {}): Prayer[] {
  const method = settings.method ?? 'MWL'
  const hanafi = settings.hanafi ?? false
  const highLatitude = settings.highLatitude ?? 'none'
  const angles = method === 'ISNA' ? { fajr: 15, isha: 15 } : { fajr: 18, isha: 17 }
  const localDate = calendarDate(date, timeZone)
  const tomorrow = addDays(localDate, 1)
  const fajr = solarTime(localDate, lat, lon, -angles.fajr, true)
  const sunrise = solarTime(localDate, lat, lon, -0.833, true)
  const dhuhr = solarNoon(localDate, lon)
  const asrTime = asr(localDate, lat, lon, hanafi ? 2 : 1)
  const sunset = solarTime(localDate, lat, lon, -0.833, false)
  const isha = solarTime(localDate, lat, lon, -angles.isha, false)
  const nextSunrise = solarTime(tomorrow, lat, lon, -0.833, true)
  let resolvedFajr = fajr
  let resolvedIsha = isha
  if (highLatitude !== 'none' && sunrise && sunset && nextSunrise) {
    const nightHours = (nextSunrise.getTime() - sunset.getTime()) / 3600000
    if (!resolvedFajr) resolvedFajr = fallbackFajr(sunrise, nightHours, highLatitude, angles.fajr, localDate, timeZone)
    if (!resolvedIsha) resolvedIsha = fallbackIsha(sunset, nextSunrise, highLatitude, angles.isha, localDate, timeZone)
  }
  const events: [PrayerName, Date | null][] = [
    ['Fajr', resolvedFajr],
    ['Sunrise', sunrise],
    ['Dhuhr', dhuhr],
    ['Asr', asrTime],
    ['Maghrib', sunset],
    ['Isha', resolvedIsha],
  ]
  return events.filter((x): x is [PrayerName, Date] => x[1] instanceof Date && Number.isFinite(x[1].getTime())).map(([name, time]) => ({ name, time }))
}

export function nextPrayer(prayers: Prayer[], lat: number, lon: number, timeZone: string, settings: PrayerSettings = {}, now = new Date()) {
  const upcoming = prayers.find(p => p.time.getTime() > now.getTime())
  if (upcoming) return upcoming
  const tomorrow = addDays(calendarDate(now, timeZone), 1)
  const tomorrowInstant = fromUtcMinutes(tomorrow, 0)
  return calculatePrayerTimes(tomorrowInstant, lat, lon, timeZone, settings).find(p => p.name === 'Fajr') ?? null
}

export function currentPrayer(prayers: Prayer[], now = new Date()): PrayerName | null {
  let current: PrayerName | null = null
  for (const prayer of prayers.filter(p => p.name !== 'Sunrise')) {
    if (prayer.time.getTime() <= now.getTime()) current = prayer.name
    else break
  }
  return current
}

export function qiblaBearing(lat: number, lon: number) {
  const kaabaLat = rad(KAABA.lat), kaabaLon = rad(KAABA.lon), phi = rad(lat), dl = kaabaLon - rad(lon)
  return norm(deg(Math.atan2(Math.sin(dl), Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dl))))
}
