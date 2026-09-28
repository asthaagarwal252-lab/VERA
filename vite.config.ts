import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), wasm()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@midnight-ntwrk/onchain-runtime-v3')) return 'midnight-wasm'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/onchain-runtime-v3'],
  },
  resolve: {
    alias: {
      assert: fileURLToPath(new URL('./node_modules/assert/build/assert.js', import.meta.url)),
      'isomorphic-ws': fileURLToPath(new URL('./src/lib/browser-websocket.ts', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Makes `npm run dev` behave like the combined Vercel deployment when the
      // FastAPI service is running locally on port 8000.
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
