import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, requests to /api/* are proxied to the FastAPI backend, so the
// browser only ever talks to one origin (no CORS issues). In production, or
// to point at a backend on another machine, set VITE_API_URL instead
// (see src/api.js).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
