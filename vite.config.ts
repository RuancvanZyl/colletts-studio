import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function figmaVersionedImportResolver() {
  return {
    name: 'figma-versioned-import-resolver',
    enforce: 'pre' as const,
    async resolveId(
      this: any,
      id: string,
      importer: string | undefined,
      options: any
    ) {
      const match = id.match(/^(@[^/]+\/[^@]+|[^@/][^@]*)@[\d.][^\s]*$/)
      if (match) {
        return this.resolve(match[1], importer, { ...options, skipSelf: true })
      }
    },
  }
}

export default defineConfig({
  // which version this build is, shown in the app so it is easy to see who is on what
  define: {
    __APP_VERSION__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)),
    __APP_BUILT__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    figmaVersionedImportResolver(),
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    // Offline support: the app opens with no connection. Data is NOT cached by the service worker —
    // the app keeps its own local copy and outbox (see docs/OFFLINE_PLAN.md).
    VitePWA({
      registerType: 'prompt',            // staff choose when to switch to a new version (no surprise reloads mid-job)
      injectRegister: false,             // registered in src/main.tsx
      filename: 'service-worker.js',     // not 'sw.js' — that name is the old self-removing worker
      includeAssets: ['apple-touch-icon.png', 'favicon.ico', 'apex-logo.png'],
      manifest: {
        name: 'Apex Trophy Solutions',
        short_name: 'Apex Trophy',
        description: 'Workshop management for Apex Trophy Solutions',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#3AAECC',
        background_color: '#080C0C',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,woff2}'],
        globIgnores: ['sw.js'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/functions\//, /^\/auth\//],
        runtimeCaching: [
          // Never cache live data or login traffic
          { urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith('.supabase.co'), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
})
