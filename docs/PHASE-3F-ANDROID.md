# NoorTools — Phase 3F Android + Real Device Readiness

## Native shell
Phase 3F adds a reproducible Capacitor 8 Android target for the existing Vite/React application. There is no Expo configuration in the repository; the migration path is intentionally Capacitor rather than introducing a second application framework.

The build configuration pins Capacitor core, CLI and Android to 8.5.2. Supporting native adapters use App 8.1.1, Geolocation 8.2.2, Haptics 8.0.2, Keyboard 8.0.5, Local Notifications 8.3.1, Share 8.0.1, Splash Screen 8.0.2 and Status Bar 8.0.3.

## Android metadata
- Application ID: `com.noortools.mobile`
- App name: `NoorTools`
- Version name: `0.1.0`
- Version code: `1`
- Compile/target SDK: 36 through Capacitor 8's Android template
- Minimum SDK: 24 through Capacitor 8's Android template
- Java: 21
- Android scheme: HTTPS
- Cleartext traffic: disabled
- Web debugging: disabled in production configuration
- Native logging: disabled in production configuration
- App backup: disabled so local private notes/progress are not silently placed in device backup

## Build profiles
- Debug APK: `npm run android:debug`
- Preview APK: `npm run android:preview`
- Release APK: `npm run android:release`
- Release AAB: `npm run android:bundle`

The native project is reproducibly generated and hardened by `scripts/prepare-android.mjs`. Release signing activates only when all `NOORTOOLS_KEYSTORE_*` environment variables are present. No keystore is committed. Without protected signing variables, release artifacts are unsigned and are not Play Store submission artifacts.

## Permissions
The native shell declares Internet, coarse/fine location, notification and vibration permissions. Location is not requested at startup. `POST_NOTIFICATIONS` is declared for Android 13+ but no notification prompt is forced during launch. Background location permission is not declared.

## System UI and safe areas
Capacitor 8 SystemBars insets handling is configured for CSS variables with a `viewport-fit=cover` hint. Status and navigation bars remain visible. The configuration avoids relying on Android 16 status-bar overlay/background behavior that is no longer supported for Capacitor 8 targets.

## Native bridge
`src/nativeRuntime.ts` is a small platform-gated adapter for native capabilities already relevant to NoorTools:
- location permission and current-position access
- haptic feedback with safe fallback
- notification permission/channel creation/cancellation
- system sharing
- app foreground/background lifecycle
- keyboard visibility events

The adapter never treats browser execution as Android and never simulates sensors.

## Location / prayer / Qibla
The Phase 3A calculation engine remains the source for NoorTools-calculated prayer times. Native location access is prepared for Android, but Phase 3F does not replace or hardcode the calculation engine.

No compass/Qibla sensor implementation is fabricated. Sensor availability, accuracy, calibration and bearing behavior require an actual Android environment. The current coding container has no Android SDK, `adb`, emulator binary or connected handset, so those behaviors cannot be claimed as tested locally.

## Notifications
The Local Notifications plugin is included and the native shell declares `POST_NOTIFICATIONS`. Android 13+ requires runtime notification permission. Exact-alarm access is intentionally not requested in Phase 3F; future scheduling should prefer inexact alarms unless a later product decision and policy review justify exact alarms.

## Emulator / device testing
A GitHub Actions workflow is included with an Android API 35 Google APIs emulator job. It installs the debug APK, launches the app, exercises restart/foreground/back navigation, and checks package metadata and a location-permission denial app-op. This is an automated emulator smoke test, not a full manual QA pass.

**Physical-device testing: NOT PHYSICALLY VERIFIED.**

The current coding environment does not expose a physical Android handset or local emulator. Therefore this branch makes no claim that a physical device was tested.

## Accessibility
Existing web accessibility architecture is retained: RTL, dark mode, keyboard focus, reduced motion and large touch targets. TalkBack and real-device font-scaling behavior are not certified by this phase because no physical-device test was available locally.

## Performance / lifecycle
No periodic background polling, location tracking, or always-on native process was introduced. The native adapter keeps listeners explicit so callers can remove lifecycle/keyboard listeners. Android CI uses the production web build before syncing native assets.

## Security
- no secrets or keystores committed
- cleartext WebView traffic disabled
- mixed content disabled
- production web contents debugging disabled
- native logs disabled through Capacitor configuration
- no analytics, tracking, Firebase, AdMob, payments or subscriptions
- no fake sensor or permission logic
- deep link uses the product-specific `noortools://open` scheme

## Store readiness
This is **not** a Play Store readiness or approval claim. Before publishing, NoorTools still needs a real privacy-policy URL, final signed release credentials, Data Safety declaration, content-rating declaration, package-name ownership/registration and final store assets/review.

## Known limitations
The native Android project is generated by the pinned Capacitor toolchain during preparation rather than stored as a large generated tree in this web repository. A user or CI runner therefore needs network/package access to run `npm run android:prepare` the first time. The coding environment used for this change has no Android SDK, so Android/Gradle compilation and emulator execution are delegated to GitHub Actions rather than performed locally.

### References
- https://capacitorjs.com/
- https://www.npmjs.com/package/@capacitor/core
- https://www.npmjs.com/package/@capacitor/android
- https://developer.android.com/about/versions/13/behavior-changes-all
- https://developer.android.com/develop/ui/compose/notifications/notification-permission
- https://developer.android.com/build/build-variants
- https://developer.android.com/developer-verification/guides/developer-console-api
