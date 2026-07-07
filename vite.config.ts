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

// Figma Make exports imports like `sonner@2.0.3` — strip the version suffix
// and delegate to vite's normal node_modules resolver.
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
  plugins: [
    figmaVersionedImportResolver(),
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { injectionPoint: undefined },
      manifest: {
        name: 'Apex Trophy Solutions',
        short_name: 'Apex Trophy',
        description: 'Workshop management system for Apex Trophy Solutions',
        theme_color: '#3AAECC',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
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
