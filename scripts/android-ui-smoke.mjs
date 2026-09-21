import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ANDROID_QA_OUT || 'artifacts/android-ui'
mkdirSync(OUT, { recursive: true })

const adb = (...args) => execFileSync('adb', ['-s', 'emulator-5554', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function displaySize() {
  const raw = adb('shell', 'wm', 'size')
  const match = raw.match(/Override size:\s*(\d+)x(\d+)/) || raw.match(/Physical size:\s*(\d+)x(\d+)/)
  if (!match) throw new Error(`Could not determine emulator display size from: ${raw}`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

function dumpUi() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
  return adb('exec-out', 'cat', '/sdcard/window.xml')
}

function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*\/>/g)].filter(match => {
    const raw = match[0]
    const visibility = raw.match(/\bvisible-to-user="(true|false)"/)?.[1]
    if (visibility === 'false') return false
    const b = raw.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    return Boolean(b) && +b[3] > +b[1] && +b[4] > +b[2]
  }).map(match => {
    const raw = match[0]
    const text = raw.match(/\btext="([^"]*)"/)?.[1] || ''
    const desc = raw.match(/\bcontent-desc="([^"]*)"/)?.[1] || ''
    const b = raw.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    return { raw, text, desc, x: Math.round((+b[1] + +b[3]) / 2), y: Math.round((+b[2] + +b[4]) / 2) }
  })
}

async function tap(label, { contains = false, maxY = Infinity, timeout = 10000 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const found = nodes(dumpUi()).find(node => {
      if (node.y > maxY) return false
      return contains ? node.text.includes(label) || node.desc.includes(label) : node.text === label || node.desc === label
    })
    if (found) {
      adb('shell', 'input', 'tap', String(found.x), String(found.y))
      await sleep(800)
      return found
    }
    await sleep(250)
  }
  throw new Error(`UI target not found: ${label}`)
}

function assertContains(xml, text, label) {
  if (!nodes(xml).some(node => node.text.includes(text) || node.desc.includes(text))) throw new Error(`${label}: expected UI text missing: ${text}`)
}

function assertNoCrossSurface(xml, label, banned) {
  for (const node of nodes(xml)) {
    const found = banned.find(text => node.text.includes(text) || node.desc.includes(text))
    if (found) throw new Error(`${label}: previous/other surface still visible: ${found}. Node: ${node.raw}`)
  }
}

function capture(name) {
  execFileSync('bash', ['-lc', `adb -s emulator-5554 exec-out screencap -p > "$1"`, '--', join(OUT, `${name}.png`)], { stdio: 'inherit' })
}

async function checkScreen(name, expected, banned = [], scrollExpected = expected) {
  const xml = dumpUi()
  writeFileSync(join(OUT, `${name}-precheck.xml`), xml)
  assertContains(xml, expected, name)
  assertNoCrossSurface(xml, name, banned)
  writeFileSync(join(OUT, `${name}.xml`), xml)
  capture(name)
  const { width, height } = displaySize()
  const x = Math.round(width * 0.76)
  const top = Math.round(height * 0.78)
  const bottom = Math.round(height * 0.26)
  adb('shell', 'input', 'swipe', String(x), String(top), String(x), String(bottom), '350')
  await sleep(500)
  const afterUp = dumpUi()
  writeFileSync(join(OUT, `${name}-after-scroll-up.xml`), afterUp)
  assertContains(afterUp, scrollExpected, `${name} after scroll up`)
  assertNoCrossSurface(afterUp, `${name} after scroll up`, banned)
  adb('shell', 'input', 'swipe', String(x), String(bottom), String(x), String(top), '350')
  await sleep(500)
  const afterDown = dumpUi()
  writeFileSync(join(OUT, `${name}-after-scroll-down.xml`), afterDown)
  assertContains(afterDown, scrollExpected, `${name} after scroll down`)
  assertNoCrossSurface(afterDown, `${name} after scroll down`, banned)
}

async function waitForApp(timeout = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const pid = adb('shell', 'pidof', 'com.noortools.mobile')
      if (pid) return pid
    } catch {}
    await sleep(1000)
  }
  return ''
}

async function waitForUi(label, timeout = 15000) {
  const start = Date.now()
  let last = ''
  while (Date.now() - start < timeout) {
    try {
      const xml = dumpUi()
      if (nodes(xml).some(node => node.text === label || node.desc === label)) return
      last = xml
    } catch {}
    await sleep(250)
  }
  writeFileSync(join(OUT, 'readiness-last-ui.xml'), last)
  const allNodes = [...last.matchAll(/<node\b[^>]*\/>/g)].map(match => match[0])
  const webViews = allNodes.filter(raw => /class="android\.webkit\.WebView"/.test(raw))
  const visibleNodes = allNodes.filter(raw => /\bvisible-to-user="true"/.test(raw))
  const diagnostics = {
    label,
    allSelfClosingNodes: allNodes.length,
    visibleNodes: visibleNodes.length,
    webViewNodeCount: webViews.length,
    webViewNodes: webViews.slice(0, 20),
  }
  writeFileSync(join(OUT, 'readiness-ui-diagnostics.json'), JSON.stringify(diagnostics, null, 2))
  throw new Error(`Timed out waiting for UI readiness: ${label}. Raw UI XML and diagnostics were saved to the QA artifact. Last UI snapshot: ${last.slice(0, 2500)}`)
}

async function closeWithBack() {
  adb('shell', 'input', 'keyevent', '4')
  await sleep(700)
}

async function openMore(item) {
  await tap('More')
  await tap(item)
}

async function openQuranReader(prefix = '') {
  await tap('Quran')
  await checkScreen(`${prefix}02-quran`, 'Noor Library', ['Verified content search', 'Zakat · Ramadan · Fasting', 'Prayer times'], 'Noor Library sections')
  await tap('Quran Reader', { maxY: 1000 })
  await waitForUi('Surah browser')
  let xml = dumpUi()
  writeFileSync(join(OUT, `${prefix}03-quran-reader-entry.xml`), xml)
  capture(`${prefix}03-quran-reader-entry`)

  const { width, height } = displaySize()
  const isUsableNode = node => node.x > 0 && node.y > 0 && node.x < width && node.y < height
  const findAlFatihah = documentXml => nodes(documentXml).find(node =>
    /^001\s+Al-Faatiha\b/i.test(node.text) &&
    /class="android\.widget\.Button"/.test(node.raw) &&
    isUsableNode(node)
  )

  let surah = findAlFatihah(xml)
  for (let attempt = 0; !surah && attempt < 6; attempt += 1) {
    adb('shell', 'input', 'swipe',
      String(Math.round(width * 0.80)), String(Math.round(height * 0.88)),
      String(Math.round(width * 0.80)), String(Math.round(height * 0.76)), '300')
    await sleep(300)
    xml = dumpUi()
    writeFileSync(join(OUT, `${prefix}03-quran-reader-scan-${attempt + 1}.xml`), xml)
    if (attempt === 0) capture(`${prefix}03-quran-reader-scan-${attempt + 1}`)
    surah = findAlFatihah(xml)
  }

  if (!surah) throw new Error('Quran Reader: Al-Fatihah entry was not exposed to Android UIAutomator')
  adb('shell', 'input', 'tap', String(surah.x), String(surah.y))
  await sleep(1000)
  await checkScreen(`${prefix}03-quran-reader`, 'Al-Faatiha', ['Read with focus. Keep your data yours.', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
}

async function runSuite(prefix = '') {
  try {
    writeFileSync(join(OUT, `${prefix}android-build-props.txt`), [
      adb('shell', 'getprop', 'ro.build.version.sdk'),
      adb('shell', 'getprop', 'ro.build.version.release'),
      adb('shell', 'getprop', 'ro.product.model'),
      adb('shell', 'getprop', 'ro.build.version.security_patch'),
    ].join('\\n'))
    writeFileSync(join(OUT, `${prefix}webview-provider.txt`), adb('shell', 'dumpsys', 'webviewupdate'))
    writeFileSync(join(OUT, `${prefix}webview-package.txt`), adb('shell', 'dumpsys', 'package', 'com.google.android.webview'))
    writeFileSync(join(OUT, `${prefix}accessibility-settings.txt`), [
      adb('shell', 'settings', 'get', 'secure', 'accessibility_enabled'),
      adb('shell', 'settings', 'get', 'secure', 'enabled_accessibility_services'),
    ].join('\\n'))
  } catch (error) {
    writeFileSync(join(OUT, `${prefix}runtime-diagnostics-error.txt`), String(error))
  }
  await adb('shell', 'am', 'force-stop', 'com.noortools.mobile')
  adb('shell', 'am', 'start', '-W', '-n', 'com.noortools.mobile/.MainActivity')
  const pid = await waitForApp()
  if (!pid) {
    writeFileSync(join(OUT, `${prefix}startup-logcat.txt`), adb('logcat', '-d', '-t', '700'))
    writeFileSync(join(OUT, `${prefix}startup-activity.txt`), adb('shell', 'dumpsys', 'activity', 'activities'))
    throw new Error('Application process did not remain running after launch; startup evidence was saved.')
  }

  await waitForUi('Assalamu Alaikum')

  await checkScreen(`${prefix}01-home`, 'Assalamu Alaikum', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Back from Prayer times'])

  await openQuranReader(prefix)
  await closeWithBack()
  await tap('Bookmarks', { maxY: 1000 })
  await checkScreen(`${prefix}02b-quran-bookmarks`, 'Bookmarks & Favorites', ['Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
  await closeWithBack()

  await tap('Prayer')
  await checkScreen(`${prefix}04-prayer`, 'Prayer', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Qibla', 'Tasbih'])
  await closeWithBack()

  await openMore('Qibla')
  await checkScreen(`${prefix}05-qibla`, 'Qibla', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
  await closeWithBack()

  await openMore('Tasbih')
  await checkScreen(`${prefix}06-tasbih`, 'Tasbih', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
  await closeWithBack()

  await tap('Quran')
  await sleep(700)
  await tap('Duas', { maxY: 1000 })
  await checkScreen(`${prefix}07-duas`, 'Duas', ['Al-Fatihah', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
  await closeWithBack()

  await tap('Search')
  await checkScreen(`${prefix}08-search`, 'Search verified content', ['Noor Library', 'Zakat · Ramadan · Fasting', 'Prayer times', 'Qibla', 'Tasbih'])
  await closeWithBack()

  await openMore('Tools')
  await checkScreen(`${prefix}09-tools`, 'Zakat', ['Noor Library', 'Search verified content', 'Qibla · Tasbih', 'Prayer times'])
  await closeWithBack()

  await tap('Settings')
  await checkScreen(`${prefix}10-settings`, 'Settings', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times', 'Qibla', 'Tasbih'])
  await closeWithBack()

  await tap('Home')
  await checkScreen(`${prefix}11-bottom-home`, 'Assalamu Alaikum')
  await tap('Quran')
  await checkScreen(`${prefix}12-bottom-quran`, 'Noor Library')
  await closeWithBack()
  await tap('Search')
  await checkScreen(`${prefix}13-bottom-search`, 'Search verified content')
  await closeWithBack()
  await tap('Home')
  await checkScreen(`${prefix}14-bottom-home-repeat`, 'Assalamu Alaikum')

  await openMore('Qibla')
  await checkScreen(`${prefix}15-back-qibla`, 'Qibla')
  await closeWithBack()
  await checkScreen(`${prefix}16-back-home`, 'Assalamu Alaikum')
}

try {
  adb('wait-for-device')
  await runSuite('')

  adb('shell', 'wm', 'size', '480x854')
  await sleep(700)
  try {
    await runSuite('small-')
  } finally {
    adb('shell', 'wm', 'size', 'reset')
  }

  console.log('ANDROID_UI_SMOKE_PASS')
} catch (error) {
  try { capture('failure-last-screen') } catch {}
  try { writeFileSync(join(OUT, 'failure-logcat.txt'), adb('logcat', '-d', '-t', '900')) } catch {}
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
}
