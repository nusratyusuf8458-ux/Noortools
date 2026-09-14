export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type Prayer = { name: PrayerName; time: Date }

const rad = (d: number) => d * Math.PI / 180
const deg = (r: number) => r * 180 / Math.PI
const norm = (d: number) => ((d % 360) + 360) % 360

// Dependency-free NOAA-style solar calculation. Returned Date values are in the
// device's local timezone, so the UI remains correct across DST transitions.
function solar(date: Date, lat: number, lon: number, zenith: number, morning: boolean) {
  const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
  const lngHour = lon / 15
  const t = n + ((morning ? 6 : 18) - lngHour) / 24
  const M = 0.9856 * t - 3.289
  const L = norm(M + 1.916 * Math.sin(rad(M)) + 0.020 * Math.sin(rad(2 * M)) + 282.634)
  let RA = norm(deg(Math.atan(0.91764 * Math.tan(rad(L)))))
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15
  const sinDec = 0.39782 * Math.sin(rad(L))
  const cosDec = Math.cos(Math.asin(sinDec))
  const cosH = (Math.cos(rad(zenith)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)))
  if (cosH > 1 || cosH < -1) return null
  let H = morning ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))
  H /= 15
  const UT = H + RA - 0.06571 * t - 6.622
  const utcHour = ((UT - lngHour) % 24 + 24) % 24
  const localHour = utcHour - date.getTimezoneOffset() / 60
  const local = new Date(date)
  local.setHours(0, 0, 0, 0)
  local.setMinutes(Math.round(localHour * 60))
  return local
}

function solarDeclination(day: number) {
  const gamma = 2 * Math.PI / 365 * (day - 1)
  return 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2*gamma) + 0.000907 * Math.sin(2*gamma) - 0.002697 * Math.cos(3*gamma) + 0.00148 * Math.sin(3*gamma)
}

function asr(date: Date, lat: number, ratio: number) {
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000)
  const decl = solarDeclination(day)
  const phi = rad(lat)
  const altitude = deg(Math.atan(1 / (ratio + Math.tan(Math.abs(phi - decl)))))
  return solar(date, lat, 0, 90 - altitude, false)
}

export function calculatePrayerTimes(date: Date, lat: number, lon: number, method: 'MWL' | 'ISNA' = 'MWL', hanafi = false): Prayer[] {
  const angles = method === 'ISNA' ? { fajr: 15, isha: 15 } : { fajr: 18, isha: 17 }
  const fajr = solar(date, lat, lon, 90 + angles.fajr, true)
  const sunrise = solar(date, lat, lon, 90.833, true)
  const dhuhr = solar(date, lat, lon, 90.833, false)
  const maghrib = solar(date, lat, lon, 90.833, false)
  const isha = solar(date, lat, lon, 90 + angles.isha, false)
  // Asr needs longitude only for the displayed clock conversion; use the same
  // local-time convention as the other solar events.
  const asrTime = asr(date, lat, hanafi ? 2 : 1)
  if (asrTime) asrTime.setMinutes(asrTime.getMinutes() + Math.round(lon / 15 * 4))
  return ([['Fajr', fajr], ['Sunrise', sunrise], ['Dhuhr', dhuhr], ['Asr', asrTime], ['Maghrib', maghrib], ['Isha', isha]] as [PrayerName, Date | null][])
    .filter((x): x is [PrayerName, Date] => x[1] instanceof Date)
    .map(([name, time]) => ({ name, time }))
}

export function nextPrayer(prayers: Prayer[], lat: number, lon: number, now = new Date()) {
  const upcoming = prayers.find(p => p.time.getTime() > now.getTime())
  if (upcoming) return upcoming
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const tomorrowFajr = calculatePrayerTimes(tomorrow, lat, lon)[0]
  return tomorrowFajr || { name: 'Fajr' as PrayerName, time: new Date(tomorrow.getTime() + 5 * 3600000) }
}

export function qiblaBearing(lat: number, lon: number) {
  const kaabaLat = rad(21.422487), kaabaLon = rad(39.826206)
  const phi = rad(lat), dl = kaabaLon - rad(lon)
  return norm(deg(Math.atan2(Math.sin(dl), Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(dl))))
}
