export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type Prayer = { name: PrayerName; time: Date }

const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const norm = (d: number) => ((d % 360) + 360) % 360

// NOAA-style solar-position approximation. It is intentionally dependency-free and
// keeps the calculation deterministic for local/offline use.
function solar(date: Date, lat: number, lon: number, zenith: number, morning: boolean) {
  const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
  const lngHour = lon / 15
  const t = n + ((morning ? 6 : 18) - lngHour) / 24
  const M = (0.9856 * t) - 3.289
  const L = norm(M + 1.916 * Math.sin(rad(M)) + 0.020 * Math.sin(rad(2 * M)) + 282.634)
  let RA = deg(Math.atan(0.91764 * Math.tan(rad(L))))
  RA = norm(RA)
  const lq = Math.floor(L / 90) * 90
  const raq = Math.floor(RA / 90) * 90
  RA = RA + (lq - raq)
  RA /= 15
  const sinDec = 0.39782 * Math.sin(rad(L))
  const cosDec = Math.cos(Math.asin(sinDec))
  const cosH = (Math.cos(rad(zenith)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)))
  if (cosH > 1 || cosH < -1) return null
  let H = morning ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))
  H /= 15
  const UT = H + RA - 0.06571 * t - 6.622
  const utcHour = ((UT - lngHour) % 24 + 24) % 24
  const local = new Date(date)
  local.setHours(0, 0, 0, 0)
  local.setTime(local.getTime() + utcHour * 3600000)
  return local
}

function asr(date: Date, lat: number, lon: number, timezone: number) {
  // Standard Shafi/Maliki/Hanbali shadow ratio 1. Hanafi uses ratio 2.
  const declDate = new Date(date); declDate.setHours(12, 0, 0, 0)
  const noon = solar(declDate, lat, lon, 90.833, false)
  if (!noon) return null
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
  const g = rad(0.98560028 * (day - 1) + 357.529 + 1.9148 * Math.sin(rad(day)))
  const decl = Math.asin(Math.sin(rad(23.44)) * Math.sin(g))
  const angle = deg(Math.acos((Math.sin(Math.atan(1 / (1 + Math.tan(Math.abs(rad(lat) - decl)))))-Math.sin(rad(lat))*Math.sin(decl))/(Math.cos(rad(lat))*Math.cos(decl))))
  return solar(date, lat, lon, Math.max(90.833, angle), false)
}

export function calculatePrayerTimes(date: Date, lat: number, lon: number, method: 'MWL' | 'ISNA' = 'MWL', hanafi = false): Prayer[] {
  const angles = method === 'ISNA' ? { fajr: 15, isha: 15 } : { fajr: 18, isha: 17 }
  const fajr = solar(date, lat, lon, 90 + angles.fajr, true)
  const sunrise = solar(date, lat, lon, 90.833, true)
  const dhuhr = solar(date, lat, lon, 90.833, false)
  const maghrib = solar(date, lat, lon, 90.833, false)
  const isha = solar(date, lat, lon, 90 + angles.isha, false)
  const asrTime = hanafi ? asr(date, lat, lon, -1) : asr(date, lat, lon, -1)
  return ([
    ['Fajr', fajr], ['Sunrise', sunrise], ['Dhuhr', dhuhr], ['Asr', asrTime], ['Maghrib', maghrib], ['Isha', isha],
  ] as [PrayerName, Date | null][]).filter((x): x is [PrayerName, Date] => !!x[1]).map(([name, time]) => ({ name, time }))
}

export function nextPrayer(prayers: Prayer[], now = new Date()) {
  const upcoming = prayers.find(p => p.time.getTime() > now.getTime())
  if (upcoming) return upcoming
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
  const tomorrowPrayers = calculatePrayerTimes(tomorrow, 0, 0)
  return { name: 'Fajr' as PrayerName, time: new Date(tomorrow.getTime() + (tomorrowPrayers[0]?.time.getHours() || 5) * 3600000 + (tomorrowPrayers[0]?.time.getMinutes() || 0) * 60000) }
}

export function qiblaBearing(lat: number, lon: number) {
  const kaabaLat = rad(21.422487), kaabaLon = rad(39.826206)
  const phi = rad(lat), dl = kaabaLon - rad(lon)
  return norm(deg(Math.atan2(Math.sin(dl), Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dl))))
}
