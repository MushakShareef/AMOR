import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png',
        'baba.png',
        'amorplain.png',
        'amortamil.png'
      ],
      manifest: {
        name: "Brahma Kumari's Tamil Radio",
        short_name: 'BK Tamil Radio',
        description: 'Amudhamazhai – 24/7 Tamil spiritual radio',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/Sbaba192New.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/Sbaba512Ne.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/amorTamil.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // do NOT cache live stream
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/radio'),
            handler: 'NetworkOnly',
            method: 'GET'
          },
          {
            // images and static
            urlPattern: ({ request }) =>
              ['image', 'style', 'script', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60
              }
            }
          },
          {
            // pages
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 7 * 24 * 60 * 60
              },
              networkTimeoutSeconds: 3
            }
          }
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: '/offline.html'
      }
    })
  ]
})
