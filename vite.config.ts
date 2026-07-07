import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

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
  plugins: [
    figmaVersionedImportResolver(),
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
})
