import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.ANDROID_QA_OUT || 'artifacts/android-ui'
mkdirSync(OUT, { recursive: true })

const adb = (...args) => execFileSync('adb', ['-s', 'emulator-5554', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const adbBounded = (timeout, ...args) => execFileSync('adb', ['-s', 'emulator-5554', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout }).trim()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function displaySize() {
  const raw = adb('shell', 'wm', 'size')
  const match = raw.match(/Physical size:\s*(\d+)x(\d+)/) || raw.match(/Override size:\s*(\d+)x(\d+)/)
  if (!match) throw new Error(`Could not determine emulator display size from: ${raw}`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

function dumpUi() {
  adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
  return adb('exec-out', 'cat', '/sdcard/window.xml')
}

function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*\/>/g)].map(match => {
    const raw = match[0]
    const text = raw.match(/\btext="([^"]*)"/)?.[1] || ''
    const desc = raw.match(/\bcontent-desc="([^"]*)"/)?.[1] || ''
    const b = raw.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    if (!b) return { raw, text, desc, x: 0, y: 0 }
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
  const found = banned.find(text => nodes(xml).some(node => node.text.includes(text) || node.desc.includes(text)))
  if (found) throw new Error(`${label}: previous/other surface still visible: ${found}`)
}

function capture(name) {
  execFileSync('bash', ['-lc', `adb -s emulator-5554 exec-out screencap -p > "$1"`, '--', join(OUT, `${name}.png`)], { stdio: 'inherit', timeout: 10000 })
}

async function checkScreen(name, expected, banned = []) {
  const xml = dumpUi()
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
  assertContains(afterUp, expected, `${name} after scroll up`)
  adb('shell', 'input', 'swipe', String(x), String(bottom), String(x), String(top), '350')
  await sleep(500)
  const afterDown = dumpUi()
  assertContains(afterDown, expected, `${name} after scroll down`)
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
  await checkScreen(`${prefix}02-quran`, 'Noor Library', ['Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
  await tap('Quran', { maxY: 1000 })
  await sleep(800)
  let xml = dumpUi()
  let surah = nodes(xml).find(node => /Al-Fatihah|Fātiḥah|Fatihah/i.test(`${node.text} ${node.desc}`))
  if (!surah) {
    const { width, height } = displaySize()
    adb('shell', 'input', 'swipe', String(Math.round(width * 0.76)), String(Math.round(height * 0.78)), String(Math.round(width * 0.76)), String(Math.round(height * 0.26)), '400')
    await sleep(600)
    xml = dumpUi()
    surah = nodes(xml).find(node => /Al-Fatihah|Fātiḥah|Fatihah/i.test(`${node.text} ${node.desc}`))
  }
  if (!surah) throw new Error('Quran Reader: Al-Fatihah entry was not exposed to Android UIAutomator')
  adb('shell', 'input', 'tap', String(surah.x), String(surah.y))
  await sleep(1000)
  await checkScreen(`${prefix}03-quran-reader`, 'Al-Fatihah', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])
}

async function runSuite(prefix = '') {
  await adb('shell', 'am', 'force-stop', 'com.noortools.mobile')
  adb('shell', 'am', 'start', '-W', '-n', 'com.noortools.mobile/.MainActivity')
  const pid = await waitForApp()
  if (!pid) {
    writeFileSync(join(OUT, `${prefix}startup-logcat.txt`), adbBounded(5000, 'logcat', '-d', '-t', '700'))
    writeFileSync(join(OUT, `${prefix}startup-activity.txt`), adbBounded(5000, 'shell', 'dumpsys', 'activity', 'activities'))
    throw new Error('Application process did not remain running after launch; startup evidence was saved.')
  }

  await checkScreen(`${prefix}01-home`, 'Assalamu Alaikum', ['Noor Library', 'Search verified content', 'Zakat · Ramadan · Fasting', 'Prayer times'])

  await openQuranReader(prefix)
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
  try { writeFileSync(join(OUT, 'failure-logcat.txt'), adbBounded(5000, 'logcat', '-d', '-t', '900')) } catch {}
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
}
