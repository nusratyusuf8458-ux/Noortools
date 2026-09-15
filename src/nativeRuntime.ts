import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Geolocation } from '@capacitor/geolocation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Keyboard } from '@capacitor/keyboard'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Share } from '@capacitor/share'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isAndroidRuntime = () => Capacitor.getPlatform() === 'android'
export const isNativeRuntime = () => Capacitor.isNativePlatform()

export async function initializeAndroidRuntime(): Promise<void> {
  if (!isAndroidRuntime()) return
  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Light }),
    SplashScreen.hide({ fadeOutDuration: 150 }),
  ])
}

export async function getNativeLocationPermission() {
  if (!isNativeRuntime()) return { location: 'web' as const }
  return Geolocation.checkPermissions()
}

export async function requestNativeLocationPermission() {
  if (!isNativeRuntime()) return { location: 'web' as const }
  return Geolocation.requestPermissions()
}

export async function getNativePosition() {
  if (!isNativeRuntime()) throw new Error('Native location is unavailable in the web runtime.')
  return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
}

export async function triggerNativeHaptic(): Promise<boolean> {
  if (!isNativeRuntime()) return false
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
    return true
  } catch {
    return false
  }
}

export async function requestNativeNotificationPermission() {
  if (!isNativeRuntime()) return { display: 'web' as const }
  return LocalNotifications.requestPermissions()
}

export async function createNativeNotificationChannel() {
  if (!isAndroidRuntime()) return false
  await LocalNotifications.createChannel({ id: 'noortools-default', name: 'NoorTools reminders', description: 'User-enabled NoorTools reminders', importance: 3 })
  return true
}

export async function cancelNativeNotifications() {
  if (!isNativeRuntime()) return false
  await LocalNotifications.cancelAll()
  return true
}

export async function shareNative(payload: { title?: string; text?: string; url?: string }) {
  return Share.share(payload)
}

export async function registerNativeAppLifecycle(onState: (isActive: boolean) => void) {
  if (!isNativeRuntime()) return null
  return App.addListener('appStateChange', ({ isActive }) => onState(isActive))
}

export async function registerKeyboardVisibility(onVisibleChange: (visible: boolean) => void) {
  if (!isNativeRuntime()) return null
  const show = await Keyboard.addListener('keyboardDidShow', () => onVisibleChange(true))
  const hide = await Keyboard.addListener('keyboardDidHide', () => onVisibleChange(false))
  return {
    remove: async () => {
      await Promise.all([show.remove(), hide.remove()])
    },
  }
}
