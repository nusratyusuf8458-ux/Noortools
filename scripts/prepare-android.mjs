import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const androidDir = join(root, 'android')
const appDir = join(androidDir, 'app')
const appGradle = join(appDir, 'build.gradle')
const manifest = join(appDir, 'src', 'main', 'AndroidManifest.xml')
const strings = join(appDir, 'src', 'main', 'res', 'values', 'strings.xml')
const valuesDir = join(appDir, 'src', 'main', 'res', 'values')
const mipmapDir = join(appDir, 'src', 'main', 'res', 'mipmap-anydpi-v26')
const mipmapCompatDir = join(appDir, 'src', 'main', 'res', 'mipmap-anydpi-v21')
const drawableDir = join(appDir, 'src', 'main', 'res', 'drawable')
const xmlDir = join(appDir, 'src', 'main', 'res', 'xml')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

if (!existsSync(androidDir)) execFileSync(npx, ['cap', 'add', 'android'], { stdio: 'inherit' })
if (!existsSync(appGradle) || !existsSync(manifest)) throw new Error('Capacitor Android project was not generated.')

let gradle = readFileSync(appGradle, 'utf8')
gradle = gradle.replace(/applicationId\s+["'][^"']+["']/, 'applicationId "com.noortools.mobile"')
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 1')
gradle = gradle.replace(/versionName\s+["'][^"']+["']/, 'versionName "0.1.0"')
if (!gradle.includes('preview {')) {
  gradle = gradle.replace(/buildTypes\s*\{/, 'buildTypes {\n        preview {\n            initWith debug\n            debuggable false\n            matchingFallbacks = [\'debug\']\n        }')
}
if (process.env.NOORTOOLS_KEYSTORE_PATH && process.env.NOORTOOLS_KEYSTORE_PASSWORD && process.env.NOORTOOLS_KEY_ALIAS && process.env.NOORTOOLS_KEY_PASSWORD && !gradle.includes('NOORTOOLS_KEYSTORE_PATH')) {
  const signing = `\n    signingConfigs {\n        noortoolsRelease {\n            storeFile file(System.getenv("NOORTOOLS_KEYSTORE_PATH"))\n            storePassword System.getenv("NOORTOOLS_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("NOORTOOLS_KEY_ALIAS")\n            keyPassword System.getenv("NOORTOOLS_KEY_PASSWORD")\n        }\n    }\n`
  gradle = gradle.replace('android {', `android {${signing}`)
  gradle = gradle.replace(/release\s*\{/, 'release { signingConfig signingConfigs.noortoolsRelease')
}
writeFileSync(appGradle, gradle)

let xml = readFileSync(manifest, 'utf8')
xml = xml.replace('android:allowBackup="true"', 'android:allowBackup="false"')
if (!xml.includes('android.permission.ACCESS_COARSE_LOCATION')) xml = xml.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.VIBRATE" />')
if (!xml.includes('android.intent.category.BROWSABLE')) {
  xml = xml.replace('</intent-filter>', '</intent-filter>\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="noortools" android:host="open" />\n            </intent-filter>', 1)
}
writeFileSync(manifest, xml)

if (existsSync(strings)) {
  let valueXml = readFileSync(strings, 'utf8')
  valueXml = valueXml.replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">NoorTools</string>')
  valueXml = valueXml.replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">NoorTools</string>')
  writeFileSync(strings, valueXml)
}

mkdirSync(valuesDir, { recursive: true })
mkdirSync(mipmapDir, { recursive: true })
mkdirSync(mipmapCompatDir, { recursive: true })
mkdirSync(drawableDir, { recursive: true })
mkdirSync(xmlDir, { recursive: true })
writeFileSync(join(valuesDir, 'noortools-brand.xml'), '<?xml version="1.0" encoding="utf-8"?><resources><color name="noortools_brand">#102A2A</color><color name="noortools_accent">#D9B86C</color></resources>\n')
const mark = '<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#D9B86C" android:pathData="M24,20H39V59L69,20H84V88H69V49L39,88H24Z"/></vector>\n'
writeFileSync(join(drawableDir, 'ic_noortools_foreground.xml'), mark)
const compat = '<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#102A2A" android:pathData="M54,4A50,50 0,1 0,54 104A50,50 0,1 0,54 4"/><path android:fillColor="#D9B86C" android:pathData="M24,20H39V59L69,20H84V88H69V49L39,88H24Z"/></vector>\n'
writeFileSync(join(mipmapCompatDir, 'ic_launcher.xml'), compat)
writeFileSync(join(mipmapCompatDir, 'ic_launcher_round.xml'), compat)
const adaptive = '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/noortools_brand"/><foreground android:drawable="@drawable/ic_noortools_foreground"/></adaptive-icon>\n'
writeFileSync(join(mipmapDir, 'ic_launcher.xml'), adaptive)
writeFileSync(join(mipmapDir, 'ic_launcher_round.xml'), adaptive)
writeFileSync(join(xmlDir, 'file_paths.xml'), '<?xml version="1.0" encoding="utf-8"?><paths xmlns:android="http://schemas.android.com/apk/res/android"><cache-path name="cache" path="." /></paths>\n')

execFileSync(npx, ['cap', 'sync', 'android'], { stdio: 'inherit' })
