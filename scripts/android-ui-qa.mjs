import { execFileSync } from 'node:child_process'
import { request } from 'node:http'

const PACKAGE = 'com.noortools.mobile'
const LOCAL_PORT = 9222
const startedAt = Date.now()
const DEADLINE = 9 * 60 * 1000

function adb(args, options = {}) {
  return execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim()
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function httpJson(path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: LOCAL_PORT, path, timeout: 5000 }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode} from ${path}`))
        else {
          try { resolve(JSON.parse(body)) } catch (error) { reject(error) }
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function waitFor(predicate, label, timeout = 30000) {
  const end = Date.now() + timeout
  let last = ''
  while (Date.now() < end) {
    try {
      const result = await predicate()
      if (result) return result
    } catch (error) { last = error instanceof Error ? error.message : String(error) }
    await sleep(500)
  }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last}` : ''}`)
}

function websocketEval(ws, expression) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9)
    let settled = false
    const timer = setTimeout(() => { if (!settled) { settled = true; ws.close(); reject(new Error(`CDP evaluation timed out: ${expression.slice(0, 120)}`)) } }, 10000)
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.removeEventListener('message', onMessage)
      if (error) reject(error); else resolve(value)
    }
    const onMessage = event => {
      try {
        const message = JSON.parse(event.data)
        if (message.id !== id) return
        if (message.error) finish(new Error(message.error.message || 'CDP evaluation failed'))
        else finish(null, message.result?.result?.value)
      } catch (error) { finish(error) }
    }
    ws.addEventListener('message', onMessage)
    try { ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })) } catch (error) { finish(error) }
  })
}

function findDevtoolsSocket(pid) {
  const unix = adb(['shell', 'cat', `/proc/${pid}/net/unix`])
  const match = unix.split('\n').find(line => line.includes('webview_devtools_remote'))
  assert(match, `WebView devtools socket not found for pid ${pid}`)
  const socket = match.trim().split(/\s+/).at(-1)?.replace(/^@/, '')
  assert(socket, 'Could not parse WebView devtools socket')
  return socket
}

async function connectWebView() {
  await waitFor(() => {
    try { adb(['shell', 'pidof', PACKAGE]); return true } catch { return false }
  }, 'application process')
  const pid = adb(['shell', 'pidof', PACKAGE]).split(/\s+/)[0]
  const socket = findDevtoolsSocket(pid)
  try { adb(['forward', '--remove', `tcp:${LOCAL_PORT}`]) } catch {}
  adb(['forward', `tcp:${LOCAL_PORT}`, `localabstract:${socket}`])
  const targets = await waitFor(() => httpJson('/json/list').then(value => value.find(item => item.type === 'page' && item.webSocketDebuggerUrl)), 'WebView debug target')
  const ws = new WebSocket(targets.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000); ws.addEventListener('open', () => { clearTimeout(timer); resolve() }); ws.addEventListener('error', error => { clearTimeout(timer); reject(error) }) })
  return ws
}

async function evalIn(ws, expression) { return websocketEval(ws, expression) }

async function clickButton(ws, label) {
  const result = await evalIn(ws, `(() => {
    const needle = ${JSON.stringify(label)}.toLowerCase()
    const candidates = [...document.querySelectorAll('button,[role="button"]')]
    const node = candidates.find(el => {
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase()
      const text = (el.textContent || '').trim().toLowerCase()
      return aria === needle || text === needle || text.includes(needle)
    })
    if (!node) return false
    node.click()
    return true
  })()`)
  assert(result === true, `Button not found/clickable: ${label}`)
}

async function clickBack(ws) {
  const clicked = await evalIn(ws, `(() => {
    const selectors = ['.back button','[aria-label*="Back"]','[aria-label*="Close"]','button[aria-label="Close search"]']
    for (const selector of selectors) {
      const node = document.querySelector(selector)
      if (node && getComputedStyle(node).display !== 'none') { node.click(); return true }
    }
    return false
  })()`)
  assert(clicked === true, 'No visible back/close control found')
}

async function state(ws) {
  return evalIn(ws, `(() => {
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height} }
    const visible = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && rect(el)?.width > 0 && rect(el)?.height > 0
    const overlaySelectors = ['.phase2-overlay','.phase23-overlay','.phase3-overlay','.phase3b-overlay','.phase3c-overlay','.phase3e-overlay','.mosque-overlay','.search-experience']
    const overlays = overlaySelectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(visible).map(el => ({selector, rect: rect(el), text:(el.innerText || '').slice(0,600)})))
    const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(visible)
    const nav = document.querySelector('.product-nav')
    const root = document.documentElement
    const body = document.body
    const scrollables = [root,body,...overlays.map(item => document.querySelector(item.selector))].filter(Boolean).map(el => ({scrollHeight:el.scrollHeight, clientHeight:el.clientHeight, scrollTop:el.scrollTop})).filter(item => item.scrollHeight > item.clientHeight + 4)
    const text = document.body.innerText || ''
    const debugMatches = text.match(/3A|3B|3E|PHASE|source_verified|public_domain|blocked|debug|developer|\\bUnavailable\\b|&(?:amp|lt|gt|quot|#x?[0-9a-f]+);/gi) || []
    return {
      viewport: {width: innerWidth, height: innerHeight},
      headings: [...document.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,12).map(el => (el.textContent || '').trim()).filter(Boolean),
      overlays,
      dialogCount: dialogs.length,
      navVisible: visible(nav),
      navRect: rect(nav),
      pageScrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      horizontalOverflow: Math.max(root.scrollWidth, body.scrollWidth) - Math.max(root.clientWidth, body.clientWidth),
      scrollables: scrollables.length,
      debugMatches
    }
  })()`)
}

async function audit(ws, name, expectedText, options = {}) {
  await waitFor(async () => (await state(ws)).headings.some(value => value.toLowerCase().includes(expectedText.toLowerCase())) || (await state(ws)).overlays.some(item => item.text.toLowerCase().includes(expectedText.toLowerCase())), `${name} screen`)
  const before = await state(ws)
  assert(before.horizontalOverflow <= 2, `${name}: horizontal overflow ${before.horizontalOverflow}px`)
  assert(before.dialogCount <= 1, `${name}: ${before.dialogCount} modal dialogs visible`)
  assert(before.debugMatches.length === 0, `${name}: forbidden visible text: ${before.debugMatches.slice(0, 8).join(', ')}`)
  if (options.expectOverlay !== undefined) assert(before.overlays.length === options.expectOverlay, `${name}: expected ${options.expectOverlay} feature overlay(s), saw ${before.overlays.length}`)
  if (before.navVisible) {
    assert(Math.abs((before.navRect?.bottom ?? 0) - before.viewport.height) <= 2, `${name}: bottom navigation is not flush to viewport bottom`)
    assert((before.navRect?.right ?? 0) <= before.viewport.width + 2, `${name}: bottom navigation exceeds viewport width`)
  }
  if (before.scrollables > 0) {
    const moved = await evalIn(ws, `(() => {
      const candidates = [document.documentElement, document.body, ...[...document.querySelectorAll('.phase2-overlay,.phase23-overlay,.phase3-overlay,.phase3b-overlay,.phase3c-overlay,.phase3e-overlay,.mosque-overlay,.search-experience')]]
        .filter(el => el && getComputedStyle(el).display !== 'none' && el.scrollHeight > el.clientHeight + 10)
      const target = candidates[0]
      if (!target) return false
      const start = target.scrollTop
      target.scrollTop = Math.min(target.scrollHeight, start + Math.max(40, Math.floor(target.clientHeight * 0.35)))
      return target.scrollTop !== start || target.scrollHeight <= target.clientHeight + 10
    })()`)
    assert(moved === true, `${name}: scroll position did not move on a scrollable surface`)
  }
  return before
}

async function openMore(ws) {
  await clickButton(ws, 'More')
  await waitFor(async () => (await evalIn(ws, `!!document.querySelector('#noortools-more-menu')`)) === true, 'More menu')
}

async function resetApp(ws) {
  await evalIn(ws, `history.replaceState({view:'home'},'',location.pathname+location.search); location.hash=''`)
  await clickButton(ws, 'Home').catch(() => undefined)
  await sleep(300)
}

async function main() {
  if (Date.now() - startedAt > DEADLINE) throw new Error('QA script startup exceeded deadline')
  await waitFor(() => adb(['shell', 'getprop', 'sys.boot_completed']) === '1', 'Android boot', 120000)
  adb(['shell', 'am', 'force-stop', PACKAGE])
  adb(['shell', 'am', 'start', '-n', `${PACKAGE}/.MainActivity`])
  const ws = await connectWebView()
  try {
    adb(['shell', 'wm', 'size', '360x800'])
    await sleep(500)

    await clickButton(ws, 'Home')
    const tested = []
    tested.push(['Home', await audit(ws, 'Home', 'Assalamu Alaikum')])

    await clickButton(ws, 'Settings')
    tested.push(['Settings', await audit(ws, 'Settings', 'Settings', { expectOverlay: 0 })])
    await clickBack(ws)

    await clickButton(ws, 'Prayer')
    tested.push(['Prayer Times', await audit(ws, 'Prayer Times', 'Prayer', { expectOverlay: 1 })])
    await clickBack(ws)

    await clickButton(ws, 'Quran')
    await audit(ws, 'Quran library', 'Noor Library', { expectOverlay: 1 })
    await clickButton(ws, 'Quran')
    const quranReader = await audit(ws, 'Quran Reader', 'Quran', { expectOverlay: 1 })
    await clickBack(ws)

    await clickButton(ws, 'Quran')
    await audit(ws, 'Quran reopen', 'Noor Library', { expectOverlay: 1 })
    await clickButton(ws, 'Duas')
    tested.push(['Duas', await audit(ws, 'Duas', 'Duas', { expectOverlay: 1 })])
    await clickBack(ws)

    await clickButton(ws, 'Qibla')
    tested.push(['Qibla', await audit(ws, 'Qibla', 'Qibla', { expectOverlay: 0 })])
    await clickButton(ws, 'Tasbih')
    tested.push(['Tasbih', await audit(ws, 'Tasbih', 'Tasbih', { expectOverlay: 0 })])
    await clickButton(ws, 'Search')
    tested.push(['Search', await audit(ws, 'Search', 'Search', { expectOverlay: 1 })])
    await clickBack(ws)
    await openMore(ws)
    await clickButton(ws, 'Tools')
    tested.push(['Islamic Tools', await audit(ws, 'Islamic Tools', 'Tools', { expectOverlay: 1 })])
    await clickBack(ws)

    await openMore(ws)
    await clickButton(ws, 'Learning')
    await audit(ws, 'Learning transition', 'Learning', { expectOverlay: 1 })
    await clickBack(ws)

    await clickButton(ws, 'Settings')
    tested.push(['Bottom/Back navigation', await audit(ws, 'Settings', 'Settings', { expectOverlay: 0 })])
    await clickBack(ws)

    await clickButton(ws, 'Prayer')
    await clickButton(ws, 'Quran')
    const mixed = await state(ws)
    assert(mixed.overlays.length === 1, `navigation mixing check: expected one active overlay, saw ${mixed.overlays.length}`)
    assert(mixed.overlays[0].text.toLowerCase().includes('noor library'), 'navigation mixing check: previous screen appears to remain active')
    const primary = await state(ws)
    assert(primary.horizontalOverflow <= 2, `final viewport overflow ${primary.horizontalOverflow}px`)

    adb(['shell', 'wm', 'size', 'reset'])
    adb(['shell', 'am', 'force-stop', PACKAGE])
    console.log(JSON.stringify({ ok: true, viewport: '360x800', routes: tested.map(([name, info]) => name), quranReader: { scrollables: quranReader.scrollables }, finalMixingCheck: 'passed' }, null, 2))
  } finally {
    try { adb(['forward', '--remove', `tcp:${LOCAL_PORT}`]) } catch {}
    try { ws.close() } catch {}
  }
}

main().catch(error => {
  try { adb(['shell', 'wm', 'size', 'reset']) } catch {}
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
})
