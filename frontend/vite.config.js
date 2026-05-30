import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// When running under docker-compose the backend is reachable as
// `http://backend:3000`; for local (non-Docker) dev it's `http://localhost:3000`.
// Override via `BACKEND_URL` env var.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/problems': {
        target: backendUrl,
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js'
  }
})