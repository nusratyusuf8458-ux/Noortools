import { timezoneFromCoordinates } from './timezone'
import type { Coordinate, LocationPermissionState } from './mosque'
export function validateManualLocation(latText: string, lonText: string): Coordinate | null {
  const lat = Number(latText.trim()); const lon = Number(lonText.trim())
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null
}
export function locationPermissionMessage(state: LocationPermissionState): string {
  if (state === 'denied') return 'Location permission was denied. Manual location remains available.'
  if (state === 'unsupported') return 'This browser does not provide location access. Manual location remains available.'
  if (state === 'granted') return 'Location permission granted.'
  return 'Location permission has not been granted.'
}
export function resolveLocationTimezone(coordinate: Coordinate): string | null {
  try { return timezoneFromCoordinates(coordinate.lat, coordinate.lon) } catch { return null }
}
