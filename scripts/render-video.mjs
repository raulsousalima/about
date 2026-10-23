// Renders video/ds-kalion-launch to MP4: steps window.render(t) frame by frame
// in headless Chromium and pipes PNG frames to ffmpeg.
// Usage: npx vite --port 5199 & node scripts/render-video.mjs [--fps 60] [--from 0 --to 10] [--stills 0,2,4]
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE)) }

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const FPS = +arg('fps', 60), FROM = +arg('from', 0), TO = +arg('to', 10)
const URL = arg('url', 'http://localhost:5199/video/ds-kalion-launch/index.html')
const OUT = arg('out', 'video/ds-kalion-launch/ds-kalion-launch.mp4')
const STILLS = arg('stills')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
if (process.env.TABLER_DIR) await page.route(/cdn\.jsdelivr\.net\/npm\/@tabler\/icons-webfont/, r =>
  r.fulfill({ path: process.env.TABLER_DIR + new globalThis.URL(r.request().url()).pathname.replace(/.*\/dist/, '') }))
page.on('pageerror', e => console.error('page error:', e.message))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.ready === true)

if (STILLS) {
  mkdirSync('video/ds-kalion-launch/stills', { recursive: true })
  for (const t of STILLS.split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t)
    await page.screenshot({ path: `video/ds-kalion-launch/stills/t${t.toFixed(2)}.png` })
  }
  await browser.close(); process.exit(0)
}

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] })
const frames = Math.round((TO - FROM) * FPS)
for (let f = 0; f < frames; f++) {
  await page.evaluate(t => window.render(t), FROM + f / FPS)
  const buf = await page.screenshot({ type: 'png' })
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
  if (f % 60 === 0) console.log(`frame ${f}/${frames}`)
}
ff.stdin.end()
await new Promise(r => ff.on('close', r))
await browser.close()
console.log('wrote', OUT)
