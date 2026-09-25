import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Makes `npm run dev` behave like the combined Vercel deployment when the
      // FastAPI service is running locally on port 8000.
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
