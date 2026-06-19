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

// Figma Make exports imports like `sonner@2.0.3` — map them to bare package names
function figmaVersionedImportResolver() {
  return {
    name: 'figma-versioned-import-resolver',
    resolveId(id: string) {
      // Match `package@version` or `@scope/package@version`
      const match = id.match(/^(@[^/]+\/[^@]+|[^@]+)@[\d.]+$/)
      if (match) {
        return { id: match[1], external: false }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    figmaVersionedImportResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
})
