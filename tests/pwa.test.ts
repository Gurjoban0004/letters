import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const html = readFileSync(new URL('index.html', root), 'utf8')
const vite = readFileSync(new URL('vite.config.ts', root), 'utf8')
const worker = readFileSync(new URL('src/sw.ts', root), 'utf8')

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

expect(html.includes('viewport-fit=cover'), 'The document must opt into iOS safe areas.')
expect(!html.includes('fonts.googleapis.com'), 'The PWA must not depend on remote fonts.')
expect(vite.includes("display: 'standalone'"), 'The manifest must launch in standalone mode.')
expect(vite.includes("orientation: 'portrait'"), 'The installed app must retain the intended portrait orientation.')
expect(vite.includes("'stationery/**/*'"), 'The full stationery catalog must stay out of the eager install payload.')
expect(vite.includes("url: '/bloom'"), 'The manifest must expose the Bloom shortcut.')
expect(worker.includes("createHandlerBoundToURL('index.html')"), 'Offline navigation must fall back to the app shell.')
expect(worker.includes("cacheName: 'letters-artwork-v1'"), 'Used artwork must be cached for offline reopening.')
expect(worker.includes("d.tag === 'letters-bouquet' ? 'Open bouquet' : 'Open letter'"), 'Push actions must name the correct keepsake.')

console.log('PASS: PWA manifest, safe areas, local fonts, offline shell, artwork cache, and bouquet push action')
