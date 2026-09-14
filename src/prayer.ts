export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type Prayer = { name: PrayerName; time: Date }

const KAABA = { lat: 21.422487, lon: 39.826206 }
const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const norm = (d: number) => ((d % 360) + 360) % 360

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((current.getTime() - start.getTime()) / 86400000) + 1
}

function solarPosition(date: Date, lon: number) {
  const n = dayOfYear(date)
  const gamma = 2 * Math.PI / 365 * (n - 1)
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma)
  const solarNoonUtcMinutes = 720 - 4 * lon - equationOfTime
  return { declination, solarNoonUtcMinutes }
}

function fromUtcMinutes(date: Date, utcMinutes: number) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + utcMinutes * 60000)
}

function solarTime(date: Date, lat: number, lon: number, altitudeDegrees: number, morning: boolean) {
  const { declination, solarNoonUtcMinutes } = solarPosition(date, lon)
  const altitude = rad(altitudeDegrees)
  const cosHourAngle = (Math.sin(altitude) - Math.sin(rad(lat)) * Math.sin(declination)) / (Math.cos(rad(lat)) * Math.cos(declination))
  if (cosHourAngle > 1 || cosHourAngle < -1) return null
  const hourAngle = deg(Math.acos(cosHourAngle))
  const utcMinutes = solarNoonUtcMinutes + (morning ? -4 * hourAngle : 4 * hourAngle)
  return fromUtcMinutes(date, utcMinutes)
}

function solarNoon(date: Date, lon: number) {
  return fromUtcMinutes(date, solarPosition(date, lon).solarNoonUtcMinutes)
}

function asr(date: Date, lat: number, lon: number, shadowRatio: number) {
  const declination = solarPosition(date, lon).declination
  const altitude = deg(Math.atan(1 / (shadowRatio + Math.tan(Math.abs(rad(lat) - declination)))))
  return solarTime(date, lat, lon, altitude, false)
}

export function calculatePrayerTimes(date: Date, lat: number, lon: number, method: 'MWL' | 'ISNA' = 'MWL', hanafi = false): Prayer[] {
  const angles = method === 'ISNA' ? { fajr: 15, isha: 15 } : { fajr: 18, isha: 17 }
  const events: [PrayerName, Date | null][] = [
    ['Fajr', solarTime(date, lat, lon, -angles.fajr, true)],
    ['Sunrise', solarTime(date, lat, lon, -0.833, true)],
    ['Dhuhr', solarNoon(date, lon)],
    ['Asr', asr(date, lat, lon, hanafi ? 2 : 1)],
    ['Maghrib', solarTime(date, lat, lon, -0.833, false)],
    ['Isha', solarTime(date, lat, lon, -angles.isha, false)],
  ]
  return events.filter((x): x is [PrayerName, Date] => x[1] instanceof Date).map(([name, time]) => ({ name, time }))
}

export function nextPrayer(prayers: Prayer[], lat: number, lon: number, now = new Date()) {
  const upcoming = prayers.find(p => p.time.getTime() > now.getTime())
  if (upcoming) return upcoming
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(12, 0, 0, 0)
  return calculatePrayerTimes(tomorrow, lat, lon).find(p => p.name === 'Fajr') ?? null
}

export function currentPrayer(prayers: Prayer[], now = new Date()): PrayerName | null {
  const ordered = prayers.filter(p => p.name !== 'Sunrise')
  let current: PrayerName | null = null
  for (const prayer of ordered) {
    if (prayer.time.getTime() <= now.getTime()) current = prayer.name
    else break
  }
  return current
}

export function qiblaBearing(lat: number, lon: number) {
  const kaabaLat = rad(KAABA.lat), kaabaLon = rad(KAABA.lon), phi = rad(lat), dl = kaabaLon - rad(lon)
  return norm(deg(Math.atan2(Math.sin(dl), Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dl))))
}
