import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.noortools.mobile',
  appName: 'NoorTools',
  webDir: 'dist',
  loggingBehavior: 'none',
  webContentsDebuggingEnabled: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#102a2a',
    minWebViewVersion: 60,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      launchFadeOutDuration: 150,
      backgroundColor: '#102a2a',
      showSpinner: false,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'LIGHT',
      hidden: false,
    },
  },
}

export default config
