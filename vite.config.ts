import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest so one service worker handles BOTH offline caching and
      // FCM background push. Two competing service workers break iOS push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2,ttf}'],
        globIgnores: [
          // Stationery is cached on first use by the service worker. Preloading
          // the full catalog made installation needlessly download tens of MB.
          'stationery/**/*',
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Letters',
        short_name: 'Letters',
        id: '/',
        description: 'A little closer, always. Private letters for the two of you.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8eeee',
        theme_color: '#f8eeee',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Open Letters', short_name: 'Letters', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Open Bloom', short_name: 'Bloom', url: '/bloom', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Make a bouquet', short_name: 'New bouquet', url: '/bloom/create', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
    }),
  ],
  server: { host: true },
})
